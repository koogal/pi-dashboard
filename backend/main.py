from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import yfinance as yf
from datetime import datetime, timezone, timedelta
import logging
import psutil
import os
import random
import json

# -----------------------------------------------------------------------------
# バックエンド API の役割
# -----------------------------------------------------------------------------
# このファイルは FastAPI を使って、フロントエンドからの要求に応じて以下を返す。
# 1. 気象データ（Open-Meteo から取得）
# 2. 株価データ（yfinance から取得）
# 3. Raspberry Pi の CPU / メモリ / 温度情報（psutil + temp_sensor から取得）
# すべて JSON 形式で返すため、React 側のコンポーネントがそのまま表示できる形に整形する。

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# フロントエンドからのアクセスを許可する CORS 設定。
# 画面は別ポートで動作するため、ブラウザ同士の制約を回避するために必要。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# 天気コードを絵文字へ変換する補助関数
# -----------------------------------------------------------------------------
# Open-Meteo は weathercode という数値形式で天気状態を返すため、
# フロントに表示しやすいようアイコンにマッピングする。
# そのまま数値を返すより、見た目が良く、データの意味が伝わりやすい。
def get_weather_emoji(code):
    if code <= 1: return "☀️"
    if code == 2: return "🌤"
    if code == 3: return "☁️"
    if code in [45, 48]: return "🌫"
    if code in [51, 53, 55, 56, 57]: return "🌧"
    if code in [61, 63, 65, 66, 67]: return "☔️"
    if code in [71, 73, 75, 77, 85, 86]: return "☃️"
    if code in [80, 81, 82]: return "🌧"
    if code in [95, 96, 99]: return "⚡️"
    return "❓"

# -----------------------------------------------------------------------------
# /api/data
# -----------------------------------------------------------------------------
# フロントエンドのメイン画面で必要な天気・株価データをまとめて返すエンドポイント。
# ここで取得した JSON は App.jsx の useState に格納され、その後ページ単位で表示を切り替える。
@app.get("/api/data")
def get_data():
    weather_data = []
    try:
        # Open-Meteo の予報 API にアクセスする座標。
        # この値は監視対象の地理位置を固定している。
        lat, lon = 35.799, 139.469
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo"
        res = requests.get(w_url, timeout=10)
        res.raise_for_status()
        data = res.json()
        times, temps, codes = data['hourly']['time'], data['hourly']['temperature_2m'], data['hourly']['weathercode']

        # 日本時間に合わせて現在の時刻を基準にし、その時間以降の 24 時間を抽出する。
        # これにより常に今から 24 時間分の予報を表示できる。
        JST = timezone(timedelta(hours=+9), 'JST')
        current_time_str = datetime.now(JST).strftime("%Y-%m-%dT%H:00")
        start_idx = next((i for i, t in enumerate(times) if t >= current_time_str), 0)

        # 24 時間分だけを weather_data に整形して渡す。
        for i in range(start_idx, min(start_idx + 24, len(times))):
            hour_str = times[i].split("T")[1]
            temp_val = temps[i]
            temp_rounded = round(temp_val, 1) if temp_val is not None else "--"
            weather_data.append({"time": hour_str, "temp": temp_rounded, "emoji": get_weather_emoji(codes[i])})
    except Exception as e:
        logger.error(f"天気データの取得エラー: {e}")

    # 株価データは 2 種類の大きな指数と、設定ファイルから読み込んだ個別銘柄に分ける。
    stock_data = {}
    try:
        # 1. 日経平均 & S&P500 は固定で取得する。
        for key, sym in {"Nikkei": "^N225", "SP500": "^GSPC"}.items():
            hist = yf.Ticker(sym).history(period="7d")
            stock_data[key] = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in hist.iterrows()]

        # 2. 個別銘柄は stocks.json に設定された銘柄コードを動的に読み込む。
        #    これにより画面の銘柄を増減してもコード変更を最小化できる。
        individual_stocks = []
        config_path = "/app/stocks.json"
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                stocks_config = json.load(f)

            for stock in stocks_config:
                ticker = yf.Ticker(stock["symbol"])
                hist = ticker.history(period="7d")
                data_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in hist.dropna().iterrows()]

                # 設定（色・タイトル・絵文字）と実データをセットにしてフロントに渡す。
                individual_stocks.append({
                    "config": stock,
                    "data": data_list
                })
        stock_data["individuals"] = individual_stocks

    except Exception as e:
        logger.error(f"株価データの取得エラー: {e}")

    # 天気データ取得に失敗した場合でも画面崩れを防ぐため、代替値を用意する。
    if not weather_data:
        weather_data = [{"time": "Error", "temp": "--", "emoji": "⚠️"}]

    return {"weather": weather_data, "stock": stock_data}

# -----------------------------------------------------------------------------
# /api/system
# -----------------------------------------------------------------------------
# Raspberry Pi の現在状態を返すエンドポイント。
# CPU 使用率・メモリ使用率・温度はシステムオーバーレイに表示するために使う。
@app.get("/api/system")
def get_system():
    system_info = {"cpu": 0, "mem": 0, "temp": 0.0}
    try:
        # psutil で CPU とメモリを取得する。
        system_info["cpu"] = psutil.cpu_percent(interval=0.1)
        system_info["mem"] = psutil.virtual_memory().percent

        # 温度センサーのファイルが存在すれば読み込み、なければダミー値で代替する。
        temp_path = os.getenv("TEMP_PATH", "/app/temp_sensor")
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            with open(temp_path, "r") as f:
                system_info["temp"] = round(float(f.read().strip()) / 1000.0, 1)
        else:
            system_info["temp"] = round(random.uniform(40.0, 50.0), 1)
    except Exception as e:
        # 万が一の異常時も画面表示が止まらないよう、ランダム値を返す保険をかける。
        system_info["temp"] = round(random.uniform(40.0, 50.0), 1)
    return system_info
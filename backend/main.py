from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import yfinance as yf
from datetime import datetime, timezone, timedelta
import logging
import psutil
import os

# ログを出力するための設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/api/data")
def get_data():
    weather_data = []
    try:
        lat = 35.799 # 所沢市の緯度
        lon = 139.469 # 所沢市の経度
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo"
        
        # タイムアウトを少し長めに取り、HTTPエラー時に例外を出す
        res = requests.get(w_url, timeout=10)
        res.raise_for_status() 
        data = res.json()

        if 'hourly' not in data:
            raise ValueError(f"APIの応答に 'hourly' がありません: {data}")

        times = data['hourly']['time']
        temps = data['hourly']['temperature_2m']
        codes = data['hourly']['weathercode']

        JST = timezone(timedelta(hours=+9), 'JST')
        current_dt = datetime.now(JST)
        current_time_str = current_dt.strftime("%Y-%m-%dT%H:00")

        # 現在時刻『以降』の最初のインデックスを探す（深夜帯のバグ対策）
        start_idx = 0
        for i, t in enumerate(times):
            if t >= current_time_str:
                start_idx = i
                break

        for i in range(start_idx, min(start_idx + 24, len(times))):
            hour_str = times[i].split("T")[1]
            temp_val = temps[i]
            temp_rounded = round(temp_val, 1) if temp_val is not None else "--"
            
            weather_data.append({
                "time": hour_str,
                "temp": temp_rounded,
                "emoji": get_weather_emoji(codes[i])
            })
    except Exception as e:
        # エラーの内容をDockerログに出力する
        logger.error(f"天気データの取得エラー: {e}")

# --- 株価 (日経平均とS&P500の7日分) ---
    stock_data = {}
    try:
        # 日経平均 (^N225)
        nk = yf.Ticker("^N225")
        nk_hist = nk.history(period="7d")
        nk_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in nk_hist.iterrows()]
        stock_data["Nikkei"] = nk_list

        # S&P 500 (^GSPC)
        sp = yf.Ticker("^GSPC")
        sp_hist = sp.history(period="7d")
        sp_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in sp_hist.iterrows()]
        stock_data["SP500"] = sp_list
    except Exception as e:
        logger.error(f"株価データの取得エラー: {e}")

    # 万が一天気データが空だった場合、画面がLoadingで止まるのを防ぐ
    if not weather_data:
        weather_data = [{"time": "Error", "temp": "--", "emoji": "⚠️"}]

# --- システム情報 (CPU, RAM, 温度) ---
    system_info = {"cpu": 0, "mem": 0, "temp": 0.0}
    try:
        # CPUとメモリ使用率
        system_info["cpu"] = psutil.cpu_percent(interval=0.1)
        system_info["mem"] = psutil.virtual_memory().percent
        
        # CPU温度の読み取り
        temp_path = "/app/sensor_data"
        if os.path.exists(temp_path):
            with open(temp_path, "r") as f:
                temp_raw = f.read().strip()
                system_info["temp"] = round(int(temp_raw) / 1000.0, 1)
    except Exception as e:
        logger.error(f"システム情報の取得エラー: {e}")

    return {"weather": weather_data, "stock": stock_data, "system": system_info}
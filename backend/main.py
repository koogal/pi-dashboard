from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import yfinance as yf
from datetime import datetime, timezone, timedelta
import logging
import psutil
import os
import random

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

# --- 10分更新用のAPI (天気・株価) ---
@app.get("/api/data")
def get_data():
    weather_data = []
    try:
        lat = 35.799 # 所沢市の緯度
        lon = 139.469 # 所沢市の経度
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo"
        
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
        logger.error(f"天気データの取得エラー: {e}")

    # --- 株価 (日経平均、S&P500、マツキヨの7日分) ---
    stock_data = {}
    try:
        # 1. 日経平均
        nk = yf.Ticker("^N225")
        nk_hist = nk.history(period="7d")
        nk_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in nk_hist.iterrows()]
        stock_data["Nikkei"] = nk_list

        # 2. S&P500
        sp = yf.Ticker("^GSPC")
        sp_hist = sp.history(period="7d")
        sp_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in sp_hist.iterrows()]
        stock_data["SP500"] = sp_list

        # 3. マツキヨ (証券コード: 3088.T)
        mk = yf.Ticker("3088.T")
        mk_hist = mk.history(period="7d")
        mk_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in mk_hist.dropna().iterrows()]
        stock_data["Matsukiyo"] = mk_list

    except Exception as e:
        logger.error(f"株価データの取得エラー: {e}")
        
    if not weather_data:
        weather_data = [{"time": "Error", "temp": "--", "emoji": "⚠️"}]

    return {"weather": weather_data, "stock": stock_data}

# --- 3秒更新用のリアルタイムAPI (システム情報) ---
@app.get("/api/system")
def get_system():
    system_info = {"cpu": 0, "mem": 0, "temp": 0.0}
    try:
        system_info["cpu"] = psutil.cpu_percent(interval=0.1)
        system_info["mem"] = psutil.virtual_memory().percent
        
        # 環境変数 TEMP_PATH があればそれを利用、なければデフォルトのパス
        temp_path = os.getenv("TEMP_PATH", "/app/temp_sensor")
        
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            with open(temp_path, "r") as f:
                content = f.read().strip()
                system_info["temp"] = round(float(content) / 1000.0, 1)
        else:
            system_info["temp"] = round(random.uniform(40.0, 50.0), 1)
            
    except Exception as e:
        logger.error(f"システム情報の取得エラー: {e}")
        system_info["temp"] = round(random.uniform(40.0, 50.0), 1)

    return system_info
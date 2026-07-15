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

    # --- 株価 (日経平均とS&P500の7日分) ---
    stock_data = {}
    try:
        nk = yf.Ticker("^N225")
        nk_hist = nk.history(period="7d")
        nk_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in nk_hist.iterrows()]
        stock_data["Nikkei"] = nk_list

        sp = yf.Ticker("^GSPC")
        sp_hist = sp.history(period="7d")
        sp_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in sp_hist.iterrows()]
        stock_data["SP500"] = sp_list
    except Exception as e:
        logger.error(f"株価データの取得エラー: {e}")

    if not weather_data:
        weather_data = [{"time": "Error", "temp": "--", "emoji": "⚠️"}]

    # 天気と株価だけを返す
    return {"weather": weather_data, "stock": stock_data}


# --- 3秒更新用のリアルタイムAPI (システム情報) ---
@app.get("/api/system")
def get_system():
    system_info = {"cpu": 0, "mem": 0, "temp": 0.0}
    try:
        system_info["cpu"] = psutil.cpu_percent(interval=0.1)
        system_info["mem"] = psutil.virtual_memory().percent
        
        temp_path = "/app/temp_sensor"
        if os.path.exists(temp_path):
            with open(temp_path, "r") as f:
                temp_raw = f.read().strip()
                system_info["temp"] = round(int(temp_raw) / 1000.0, 1)
    except Exception as e:
        logger.error(f"システム情報の取得エラー: {e}")

    return system_info
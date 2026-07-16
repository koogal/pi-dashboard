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
        lat, lon = 35.799, 139.469
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo"
        res = requests.get(w_url, timeout=10)
        res.raise_for_status() 
        data = res.json()
        times, temps, codes = data['hourly']['time'], data['hourly']['temperature_2m'], data['hourly']['weathercode']

        JST = timezone(timedelta(hours=+9), 'JST')
        current_time_str = datetime.now(JST).strftime("%Y-%m-%dT%H:00")
        start_idx = next((i for i, t in enumerate(times) if t >= current_time_str), 0)

        for i in range(start_idx, min(start_idx + 24, len(times))):
            hour_str = times[i].split("T")[1]
            temp_val = temps[i]
            temp_rounded = round(temp_val, 1) if temp_val is not None else "--"
            weather_data.append({"time": hour_str, "temp": temp_rounded, "emoji": get_weather_emoji(codes[i])})
    except Exception as e:
        logger.error(f"天気データの取得エラー: {e}")

    stock_data = {}
    try:
        # 1. 日経平均 & S&P500 (ここは固定)
        for key, sym in {"Nikkei": "^N225", "SP500": "^GSPC"}.items():
            hist = yf.Ticker(sym).history(period="7d")
            stock_data[key] = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in hist.iterrows()]

        # 2. 個別銘柄 (stocks.json から動的に読み込む)
        individual_stocks = []
        config_path = "/app/stocks.json"
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                stocks_config = json.load(f)
            
            for stock in stocks_config:
                ticker = yf.Ticker(stock["symbol"])
                hist = ticker.history(period="7d")
                data_list = [{"date": d.strftime("%m/%d"), "price": int(row['Close'])} for d, row in hist.dropna().iterrows()]
                
                # 設定(色やタイトル)とデータ(株価)をセットにしてフロントに渡す
                individual_stocks.append({
                    "config": stock,
                    "data": data_list
                })
        stock_data["individuals"] = individual_stocks

    except Exception as e:
        logger.error(f"株価データの取得エラー: {e}")
        
    if not weather_data:
        weather_data = [{"time": "Error", "temp": "--", "emoji": "⚠️"}]

    return {"weather": weather_data, "stock": stock_data}

@app.get("/api/system")
def get_system():
    system_info = {"cpu": 0, "mem": 0, "temp": 0.0}
    try:
        system_info["cpu"] = psutil.cpu_percent(interval=0.1)
        system_info["mem"] = psutil.virtual_memory().percent
        temp_path = os.getenv("TEMP_PATH", "/app/temp_sensor")
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            with open(temp_path, "r") as f:
                system_info["temp"] = round(float(f.read().strip()) / 1000.0, 1)
        else:
            system_info["temp"] = round(random.uniform(40.0, 50.0), 1)
    except Exception as e:
        system_info["temp"] = round(random.uniform(40.0, 50.0), 1)
    return system_info
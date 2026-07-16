import React, { useState, useEffect, memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// 作成した別ファイルを読み込む
import SingleStockPage from './SingleStockPage';

// --- 1. 天気ページ ---
const WeatherPage = memo(({ weather }) => {
  if (!Array.isArray(weather) || weather.length === 0) {
    return <div style={{ fontSize: '2rem', color: '#ADD8E6', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>Loading...</div>;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #444', padding: '15px', borderRadius: '8px', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '5px', color: '#ccc' }}>{label}</div>
          <div style={{ fontSize: '3rem', marginBottom: '5px' }}>{data.emoji}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ADD8E6' }}>{data.temp}℃</div>
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill="#ADD8E6" />
        <text x={cx} y={cy - 15} textAnchor="middle" fontSize="1.5rem" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          {payload.emoji}
        </text>
      </g>
    );
  };

  return (
    <div style={{ width: '80vw', height: '45vh', margin: '0 auto' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center', color: '#ADD8E6', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        🌤 気温推移 (24時間)
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weather} margin={{ top: 30, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
          <XAxis dataKey="time" stroke="#ccc" tick={{ fill: '#ccc', fontSize: '1.2rem' }} />
          <YAxis stroke="#ADD8E6" domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#ADD8E6', fontSize: '1.2rem' }} tickFormatter={(val) => `${Math.round(val)}℃`} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="temp" name="気温" stroke="#ADD8E6" strokeWidth={4} dot={<CustomDot />} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// --- 2. 比較株価ページ (日経平均・S&P500など2軸用) ---
const StockPage = memo(({ stock }) => {
  if (!stock || !stock.Nikkei || !stock.SP500) {
    return <div style={{ fontSize: '2rem', color: '#90EE90' }}>Loading Stock...</div>;
  }

  const allDates = [...new Set([
    ...stock.Nikkei.map(item => item.date),
    ...stock.SP500.map(item => item.date)
  ])].sort();
  const targetDates = allDates.slice(-7);

  const chartData = targetDates.map(date => {
    const nk = stock.Nikkei.find(item => item.date === date);
    const sp = stock.SP500.find(item => item.date === date);
    return {
      date: date,
      Nikkei: nk ? nk.price : null,
      SP500: sp ? sp.price : null,
    };
  });

  return (
    <div style={{ width: '80vw', height: '45vh', margin: '0 auto' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center', color: '#90EE90', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        📈 主要指数推移 (直近7日間)
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
          <XAxis dataKey="date" stroke="#ccc" tick={{ fill: '#ccc', fontSize: '1.2rem' }} />
          <YAxis yAxisId="left" stroke="#8884d8" domain={['auto', 'auto']} tick={{ fill: '#8884d8', fontSize: '1.2rem' }} tickFormatter={(val) => `¥${val.toLocaleString()}`} />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={['auto', 'auto']} tick={{ fill: '#82ca9d', fontSize: '1.2rem' }} tickFormatter={(val) => `$${val.toLocaleString()}`} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #444', borderRadius: '8px' }} itemStyle={{ fontSize: '1.2rem' }} labelStyle={{ color: '#fff', fontSize: '1.2rem', marginBottom: '5px' }} />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '1.2rem' }} />
          <Line yAxisId="left" type="monotone" dataKey="Nikkei" name="日経平均" stroke="#8884d8" strokeWidth={4} connectNulls dot={{ r: 6 }} activeDot={{ r: 8 }} />
          <Line yAxisId="right" type="monotone" dataKey="SP500" name="S&P 500" stroke="#82ca9d" strokeWidth={4} connectNulls dot={{ r: 6 }} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// --- システムオーバレイ ---
const SystemOverlay = memo(({ system }) => {
  if (!system) return null;
  return (
    <div style={{ position: 'absolute', bottom: '20px', right: '30px', display: 'flex', gap: '20px', color: 'rgba(255, 255, 255, 0.6)', textShadow: '1px 1px 3px rgba(0,0,0,0.8)', fontSize: '1.2rem', zIndex: 10, pointerEvents: 'none' }}>
      <div><span style={{ fontSize: '1.5rem', marginRight: '8px' }}>🌡️</span>{system.temp}℃</div>
      <div><span style={{ fontSize: '1.5rem', marginRight: '8px' }}>🧠</span>{system.cpu}%</div>
      <div><span style={{ fontSize: '1.5rem', marginRight: '8px' }}>💾</span>{system.mem}%</div>
    </div>
  );
});

// --- 時計コンポーネント ---
const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ textAlign: 'center', marginBottom: '40px', opacity: 0.8 }}>
      <div style={{ fontSize: '1.5rem', color: '#ccc', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        {time.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
      </div>
      <div style={{ fontSize: '4rem', fontWeight: 'normal', letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        {time.toLocaleTimeString()}
      </div>
    </div>
  );
};

// --- メインアプリケーション ---
function App() {
  const [data, setData] = useState({ weather: [], stock: null })
  const [system, setSystem] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)

  const fetchData = async () => {
    try {
      const currentHost = window.location.hostname;
      const res = await fetch(`http://${currentHost}:8000/api/data`);
      if (!res.ok) throw new Error("バックエンド準備中");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Data fetch error:", error);
      setTimeout(fetchData, 5000);
    }
  }

  const fetchSystem = async () => {
    try {
      const currentHost = window.location.hostname;
      const res = await fetch(`http://${currentHost}:8000/api/system`);
      if (res.ok) {
        const json = await res.json();
        setSystem(json);
      }
    } catch (error) {
      console.error("System fetch error:", error);
    }
  };

  useEffect(() => {
    fetchSystem();
    const interval = setInterval(fetchSystem, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, [])

  useEffect(() => {
    const pageTimer = setInterval(() => {
      setCurrentPage((prevPage) => prevPage + 1)
    }, 10000)
    return () => clearInterval(pageTimer)
  }, [])

  const handleDoubleClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("フルスクリーンエラー:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

// --- 表示するページのリストを動的に生成 ---
  const pages = useMemo(() => {
    const pageList = [
      <WeatherPage key="weather" weather={data.weather} />,
      <StockPage key="stock" stock={data.stock} />,
    ];

    // バックエンドから送られてきた個別銘柄リストを自動でループしてページを追加
    if (data.stock && data.stock.individuals) {
      data.stock.individuals.forEach((item) => {
        pageList.push(
          <SingleStockPage 
            key={item.config.id} 
            stockData={item.data} 
            title={item.config.title} 
            color={item.config.color} 
            emoji={item.config.emoji} 
          />
        );
      });
    }
    return pageList;
  }, [data.weather, data.stock]);
  return (
    <div 
      onDoubleClick={handleDoubleClick}
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', userSelect: 'none' }}
    >
      <video autoPlay loop muted playsInline style={{ position: 'absolute', top: '50%', left: '50%', width: '100vw', height: '100vh', objectFit: 'cover', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
        <source src="/bg.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 2 }}></div>

      <div style={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
        <Clock />
        <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', width: '100%' }}>
          {pages[currentPage % pages.length]}
        </div>
      </div>
      <SystemOverlay system={system} />
    </div>
  )
} 

export default App;
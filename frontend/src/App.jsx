import React, { useState, useEffect, memo, useMemo } from 'react';
//import ReactPlayer from 'react-player';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SingleStockPage from './SingleStockPage';

// -----------------------------------------------------------------------------
// 1. 天気ページ
// -----------------------------------------------------------------------------
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
    <div style={{ width: '90vw', height: '60vh', margin: '0 auto' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0px', fontWeight: 'bold', textAlign: 'center', color: '#ADD8E6', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
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

// -----------------------------------------------------------------------------
// 3. システムオーバレイ
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 4. 時計コンポーネント
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 5. メインアプリケーション
// -----------------------------------------------------------------------------
function App() {
  const [data, setData] = useState({ weather: [], stock: null });
  const [system, setSystem] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);

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
  };

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
  }, []);

  useEffect(() => {
    const pageTimer = setInterval(() => {
      setCurrentPage((prevPage) => prevPage + 1);
    }, 10000);
    return () => clearInterval(pageTimer);
  }, []);

  const handleDoubleClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const pages = useMemo(() => {
    const pageList = [<WeatherPage key="weather" weather={data.weather} />];
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
    <div onDoubleClick={handleDoubleClick} style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', userSelect: 'none' }}>
      
{/* YouTube 背景動画（iframeによる確実な実装） */}
      <iframe
        src="https://www.youtube.com/embed/CzgSFUAbE9s?autoplay=1&mute=1&controls=0&playsinline=1"
        title="YouTube background"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none' // カーソル操作を無効化し、動画を完全に背景化する
        }}
      />


      {/* 暗いオーバーレイ */}
    {/*  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1 }}></div> */}

      {/* 主要コンテンツ */}
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
        <Clock />
        <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', width: '100%' }}>
          {pages[currentPage % pages.length]}
        </div>
      </div>
      <SystemOverlay system={system} />
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- 天気ページ (グラフ表示・24時間分・天気アイコン常時表示) ---
const WeatherPage = ({ weather }) => {
  if (!Array.isArray(weather) || weather.length === 0) {
    return <div style={{ fontSize: '2rem', color: '#ADD8E6', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>Loading...</div>;
  }

  // 💡 ツールチップ（マウスホバー時の大きな表示）
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

  // 💡 グラフの各点に「天気アイコン」を常時表示するカスタムドット
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    return (
      <g>
        {/* 元の青い点 */}
        <circle cx={cx} cy={cy} r={4} fill="#ADD8E6" />
        {/* 点の少し上に天気アイコンを配置 */}
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
      
      {/* グラフ本体 */}
      <ResponsiveContainer width="100%" height="100%">
        {/* topの余白を30にしてアイコンが見切れるのを防ぐ */}
        <LineChart data={weather} margin={{ top: 30, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
          
          <XAxis dataKey="time" stroke="#ccc" tick={{ fill: '#ccc', fontSize: '1.2rem' }} />
          
          <YAxis stroke="#ADD8E6" domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#ADD8E6', fontSize: '1.2rem' }} tickFormatter={(val) => `${Math.round(val)}℃`} />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* dotに先ほど作ったCustomDotを指定する */}
          <Line 
            type="monotone" 
            dataKey="temp" 
            name="気温" 
            stroke="#ADD8E6" 
            strokeWidth={4} 
            dot={<CustomDot />} 
            activeDot={{ r: 8 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- 株価ページ (グラフ表示・7日分) ---
const StockPage = ({ stock }) => {
  if (!stock || !stock.Nikkei || !stock.SP500) {
    return <div style={{ fontSize: '2rem', color: '#90EE90' }}>Loading Stock...</div>;
  }

  // ① 両方のデータからすべての日付を取り出し、7日分に絞る
  const allDates = [...new Set([
    ...stock.Nikkei.map(item => item.date),
    ...stock.SP500.map(item => item.date)
  ])].sort();
  const targetDates = allDates.slice(-7);

  // ② Rechartsで読み込める形式にデータを合体させる
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
        📈 株価推移 (直近7日間)
      </div>
      
      {/* グラフ本体 */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
          {/* 背景のグリッド線 */}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
          
          {/* X軸（日付） */}
          <XAxis dataKey="date" stroke="#ccc" tick={{ fill: '#ccc', fontSize: '1.2rem' }} />
          
          {/* 左側のY軸（日経平均用） */}
          <YAxis yAxisId="left" stroke="#8884d8" domain={['auto', 'auto']} tick={{ fill: '#8884d8', fontSize: '1.2rem' }} tickFormatter={(val) => `¥${val.toLocaleString()}`} />
          
          {/* 右側のY軸（S&P 500用） */}
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={['auto', 'auto']} tick={{ fill: '#82ca9d', fontSize: '1.2rem' }} tickFormatter={(val) => `$${val.toLocaleString()}`} />
          
          {/* マウスホバー時のツールチップ */}
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #444', borderRadius: '8px' }}
            itemStyle={{ fontSize: '1.2rem' }}
            labelStyle={{ color: '#fff', fontSize: '1.2rem', marginBottom: '5px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '1.2rem' }} />
          
          {/* 日経平均の線 */}
          <Line yAxisId="left" type="monotone" dataKey="Nikkei" name="日経平均" stroke="#8884d8" strokeWidth={4} connectNulls dot={{ r: 6 }} activeDot={{ r: 8 }} />
          
          {/* S&P 500の線 */}
          <Line yAxisId="right" type="monotone" dataKey="SP500" name="S&P 500" stroke="#82ca9d" strokeWidth={4} connectNulls dot={{ r: 6 }} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- 常時表示するシステム情報（画面右下） ---
const SystemOverlay = ({ system }) => {
  if (!system) return null; // データがない時は表示しない

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',    // 下からの距離
      right: '30px',     // 右からの距離
      display: 'flex',
      gap: '20px',
      color: 'rgba(255, 255, 255, 0.6)', // 少し半透明にして目立たなくする
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      fontSize: '1.2rem',
      zIndex: 10         // 一番手前に表示
    }}>
      <div>
        <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>🌡️</span>
        {system.temp}℃
      </div>
      <div>
        <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>🧠</span>
        {system.cpu}%
      </div>
      <div>
        <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>💾</span>
        {system.mem}%
      </div>
    </div>
  );
};

function App() {
  const [time, setTime] = useState(new Date())
  const [data, setData] = useState({ weather: [], stock: null })
  const [system, setSystem] = useState(null) // システム専用の箱を用意
  const [currentPage, setCurrentPage] = useState(0)

  // 時計更新 (1秒ごと)
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // データ取得 (初回 ＆ 10分ごと)
  const fetchData = async () => {
    try {
      const currentHost = window.location.hostname;
      const res = await fetch(`http://${currentHost}:8000/api/data`);
      
      // バックエンドがまだ準備中でエラーを返してきた場合の対策
      if (!res.ok) throw new Error("バックエンド準備中");
      
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Data fetch error:", error);
      // 失敗した場合は、諦めずに5秒後にもう一度だけ自動で実行する
      setTimeout(fetchData, 5000);
    }
  }

  // --- システム情報取得 (初回 ＆ 3秒ごと) ---
  const fetchSystem = async () => {
    try {
      const currentHost = window.location.hostname;
      const res = await fetch(`http://${currentHost}:8000/api/system`);
      if (res.ok) {
        const json = await res.json();
        setSystem(json); // 新しいStateに保存
      }
    } catch (error) {
      console.error("System fetch error:", error);
    }
  };

  useEffect(() => {
    fetchSystem();
    const interval = setInterval(fetchSystem, 3000); // 3000ms = 3秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000); // 600000ms = 10分
    return () => clearInterval(interval);
  }, [])

  // ページ切り替え (10秒ごと)
  useEffect(() => {
    const pageTimer = setInterval(() => {
      setCurrentPage((prevPage) => (prevPage + 1) % 2)
    }, 10000)
    return () => clearInterval(pageTimer)
  }, [])

  // 💡 ダブルクリックでフルスクリーンを切り替える関数
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

  const pages = [
    <WeatherPage weather={data.weather} />,
    <StockPage stock={data.stock} />,
  ];

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      style={{ 
        position: 'relative', 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden', 
        fontFamily: 'sans-serif',
        userSelect: 'none' // テキスト選択ハイライト防止
      }}
    >

      {/* 背景の動画 (ローカル配置のMP4) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* 半透明フィルター */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', 
        zIndex: 2 
      }}></div>

      {/* UIエリア */}
      <div style={{ 
        position: 'relative',
        zIndex: 3, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        color: '#fff' 
      }}>
        
{/* 常時表示：時計 */}
        <div style={{ textAlign: 'center', marginBottom: '40px', opacity: 0.8 }}>
          <div style={{ fontSize: '1.5rem', color: '#ccc', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            {time.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
          <div style={{ fontSize: '4rem', fontWeight: 'normal', letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            {time.toLocaleTimeString()}
          </div>
        </div>

{/* 自動切り替えエリア */}
        <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center' }}>
          {pages[currentPage]}
        </div>
        
      </div>
      <SystemOverlay system={system} />
    </div>
  )
}

export default App
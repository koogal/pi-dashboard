import { useState, useEffect } from 'react'

// --- 1時間ごとの天気をグリッド表示するコンポーネント ---
const WeatherPage = ({ weather }) => {
  if (!Array.isArray(weather) || weather.length === 0) {
    return <div style={{ fontSize: '2rem', color: '#ADD8E6', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>Loading...</div>;
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(8, 1fr)', // 1行に8個並べる (8個 × 3段 = 24時間分)
      gap: '20px 30px', // 縦の隙間20px、横の隙間30px
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {weather.map((w, index) => (
        <div key={index} style={{ textAlign: 'center', color: '#ADD8E6', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{w.time}</div>
          <div style={{ fontSize: '3.5rem', marginBottom: '5px' }}>{w.emoji}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{w.temp}℃</div>
        </div>
      ))}
    </div>
  );
};

// --- 株価ページ (日付を軸にして左右を揃える・7日分) ---
const StockPage = ({ stock }) => {
  // まだデータが届いていない場合
  if (!stock || !stock.Nikkei || !stock.SP500) {
    return <div style={{ fontSize: '2rem', color: '#90EE90' }}>Loading Stock...</div>;
  }

  // ① 両方のデータからすべての日付を取り出し、重複を消して古い順に並べる
  const allDates = [...new Set([
    ...stock.Nikkei.map(item => item.date),
    ...stock.SP500.map(item => item.date)
  ])].sort();

  // ② 最新の7日分だけをターゲットとして切り取る
  const targetDates = allDates.slice(-7);

  return (
    <div style={{ display: 'flex', gap: '80px', justifyContent: 'center', color: '#90EE90', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
      
      {/* 左側：日経平均 */}
      <div>
        <div style={{ fontSize: '3rem', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>📈 日経平均</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {targetDates.map((date, i) => {
            const data = stock.Nikkei.find(item => item.date === date);
            return (
              <div key={`nk-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2rem', width: '300px', borderBottom: '1px solid rgba(144,238,144,0.3)', paddingBottom: '5px' }}>
                <span>{date}</span>
                <span>{data ? `${data.price.toLocaleString()} 円` : '--'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右側：S&P 500 */}
      <div>
        <div style={{ fontSize: '3rem', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>📈 S&P 500</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {targetDates.map((date, i) => {
            const data = stock.SP500.find(item => item.date === date);
            return (
              <div key={`sp-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2rem', width: '300px', borderBottom: '1px solid rgba(144,238,144,0.3)', paddingBottom: '5px' }}>
                <span>{date}</span>
                <span>{data ? `${data.price.toLocaleString()} $` : '--'}</span>
              </div>
            );
          })}
        </div>
      </div>

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
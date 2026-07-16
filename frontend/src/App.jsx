import React, { useState, useEffect, memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// 別コンポーネントとして分離した個別株価グラフを読み込む。
// これによりメイン画面では一覧表示を簡素化し、個別銘柄は専用コンポーネントへ委譲できる。
import SingleStockPage from './SingleStockPage';

// -----------------------------------------------------------------------------
// 1. 天気ページ
// -----------------------------------------------------------------------------
// バックエンドから受け取った 24 時間分の気温データを Recharts で線グラフ化する。
// weather 配列の各要素には time, temp, emoji が入っており、画面上で時系列表示を行う。
const WeatherPage = memo(({ weather }) => {
  // 気象データが未取得または空配列の場合は読み込み中表示を返す。
  if (!Array.isArray(weather) || weather.length === 0) {
    return <div style={{ fontSize: '2rem', color: '#ADD8E6', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>Loading...</div>;
  }

  // 画面のツールチップ表示をカスタマイズする。
  // payload から対象データを取り出し、気温と天気アイコンを強調表示する。
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

  // グラフ上に描画するドットを独自に定義する。
  // 画像のように emoji を併記して見やすさを確保するため、標準 dot ではなく独自コンポーネントに変更する。
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
// Raspberry Pi の CPU / メモリ / 温度を右下に重ねて表示する。
// 画面が見やすいよう、常に overlay で小さく表示し、メイングラフは邪魔しない構成にする。
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
// 1 秒ごとに現在時刻を更新して、画面上部に日付と時刻を表示する。
// 現在時刻の更新は useEffect の interval で管理し、不要なタイマーを cleanup で停止する。
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
// バックエンド API から天気・株価・システム情報を取得し、画面をスクロール表示する中心コンポーネント。
// 画面は複数ページをループ表示し、定期的なデータ更新と自動ページ切り替えを行う。
function App() {
  // weather: 24 時間の天気予報, stock: 日経 / S&P500 / 個別銘柄のデータをまとめて保持する。
  const [data, setData] = useState({ weather: [], stock: null })
  // Raspberry Pi の CPU / メモリ / 温度を表示するための状態。
  const [system, setSystem] = useState(null)
  // 現在表示中のページ番号を保持し、pages 配列を循環表示する。
  const [currentPage, setCurrentPage] = useState(0)

  // /api/data エンドポイントを叩いて、天気と株価データを取得する。
  // 失敗時は 5 秒後に再試行するため、バックエンド起動直後でも画面が復旧しやすい。
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

  // /api/system エンドポイントから Raspberry Pi の状態を取得する。
  // 3 秒ごとに更新し、CPU・メモリ・温度を常に最新値で表示する。
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

  // 10 秒ごとにページ番号を 1 ずつ増やし、表示ページを自動で切り替える。
  useEffect(() => {
    const pageTimer = setInterval(() => {
      setCurrentPage((prevPage) => prevPage + 1)
    }, 10000)
    return () => clearInterval(pageTimer)
  }, [])

  // 画面をダブルクリックしたときにフルスクリーン表示を切り替える。
  // 表示モードの切り替えを演出として使うための処理。
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

  // 表示ページの配列を動的に生成する。
  // 基本の WeatherPage と StockPage に加え、バックエンドから返された individuals を展開して個別株価ページを追加する。
  const pages = useMemo(() => {
    const pageList = [
      <WeatherPage key="weather" weather={data.weather} />
    ];

    // 個別銘柄一覧を one-by-one でループし、各銘柄用の SingleStockPage を配置する。
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
      {/* 背景動画は全画面サイズで再生し、メインコンテンツの後ろにレイヤーとして配置する。 */}
      <video autoPlay loop muted playsInline style={{ position: 'absolute', top: '50%', left: '50%', width: '100vw', height: '100vh', objectFit: 'cover', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
        <source src="/bg.mp4" type="video/mp4" />
      </video>
      {/* 背景の視認性を上げるため、暗いオーバーレイを前面に重ねる。 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 2 }}></div>

      {/* 主要表示領域。時計・グラフ・ページ切り替えをまとめて配置する。 */}
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
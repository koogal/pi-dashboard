import React, { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// -----------------------------------------------------------------------------
// 個別銘柄ページ
// -----------------------------------------------------------------------------
// App.jsx の pages 配列から呼び出される単一銘柄専用のグラフ表示コンポーネント。
// stockData には対象銘柄の過去 7 日間の価格履歴が入っており、title / color / emoji を使って
// 画面上の見た目と識別を行う。このコンポーネントは各個別銘柄を独立したカードのように表示する。
const SingleStockPage = memo(({ stockData, title, color, emoji }) => {
  // データが届いていない場合は、Loading と同じくタイトル付きのメッセージだけを表示する。
  if (!stockData) {
    return <div style={{ fontSize: '2rem', color: color, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{title} データ未取得</div>;
  }

  // Recharts の LineChart に合わせて、date と Price のペアに整形する。
  // ここでは表示用にプロパティ名を Price に統一している。
  const chartData = stockData.map(item => ({
    date: item.date,
    Price: item.price
  }));

  return (
    <div style={{ width: '90vw', height: '60vh', margin: '0 auto' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: 'bold', textAlign: 'center', color: color, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        {emoji} {title}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
          <XAxis dataKey="date" stroke="#ccc" tick={{ fill: '#ccc', fontSize: '1.2rem' }} />
          <YAxis stroke={color} domain={['auto', 'auto']} tick={{ fill: color, fontSize: '1.2rem' }} tickFormatter={(val) => `¥${val.toLocaleString()}`} />
          <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #444', borderRadius: '8px' }} itemStyle={{ fontSize: '1.2rem' }} labelStyle={{ color: '#fff', fontSize: '1.2rem', marginBottom: '5px' }} />
          <Line type="monotone" dataKey="Price" name="株価" stroke={color} strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default SingleStockPage;
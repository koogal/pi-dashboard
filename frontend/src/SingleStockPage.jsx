import React, { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SingleStockPage = memo(({ stockData, title, color, emoji }) => {
  if (!stockData) {
    return <div style={{ fontSize: '2rem', color: color, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{title} データ未取得</div>;
  }

  const chartData = stockData.map(item => ({
    date: item.date,
    Price: item.price
  }));

  return (
    <div style={{ width: '80vw', height: '45vh', margin: '0 auto' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center', color: color, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
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
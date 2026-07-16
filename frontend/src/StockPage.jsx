import React, { useState, useEffect } from 'react';

// -----------------------------------------------------------------------------
// 旧来の単一株価表示用コンポーネント
// -----------------------------------------------------------------------------
// こちらはシンプルな AAPL の価格表示を行うためのテスト用コンポーネントで、
// /api/stock/AAPL を呼び出して symbol と price を state に格納し画面へ表示する。
// 現在の App.jsx ではこのファイルが実際のメイン表示に使われていないが、
// 個別に単体確認する用途で残してある。
const StockPage = () => {
  // 初期値は AAPL を仮に指定し、API 取得後に更新する。
  const [stock, setStock] = useState({ symbol: 'AAPL', price: 0 });

  // マウント直後に API を呼び、取得結果を stock state に反映する。
  useEffect(() => {
    fetch('/api/stock/AAPL')
      .then(res => res.json())
      .then(data => setStock(data));
  }, []);

  return (
    <div>
      <h2>株価情報</h2>
      <p>{stock.symbol}: ${stock.price}</p>
    </div>
  );
};

export default StockPage;
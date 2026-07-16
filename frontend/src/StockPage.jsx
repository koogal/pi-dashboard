import React, { useState, useEffect } from 'react';

const StockPage = () => {
  const [stock, setStock] = useState({ symbol: 'AAPL', price: 0 });

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
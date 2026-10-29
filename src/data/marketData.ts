const seedMarkets = [
  ['BTC', 'Bitcoin', 67842.29, 2.47, 1820000000],
  ['ETH', 'Ethereum', 3546.82, -0.84, 980000000],
  ['SOL', 'Solana', 178.31, 6.12, 620000000],
  ['USDT', 'Tether', 1, 0.01, 4200000000],
  ['XRP', 'XRP', 0.624, -1.38, 248000000],
  ['ADA', 'Cardano', 0.452, 3.27, 131000000],
  ['DOGE', 'Dogecoin', 0.142, -2.14, 219000000],
  ['AVAX', 'Avalanche', 38.9, 4.75, 156000000],
  ['LINK', 'Chainlink', 17.22, 1.92, 143000000],
  ['DOT', 'Polkadot', 7.14, -0.63, 98000000],
  ['MATIC', 'Polygon', 0.731, 2.18, 87000000],
  ['LTC', 'Litecoin', 84.6, -0.32, 112000000],
  ['UNI', 'Uniswap', 10.41, 5.61, 74000000],
  ['ATOM', 'Cosmos', 9.18, 1.44, 65000000],
  ['NEAR', 'NEAR Protocol', 6.12, 7.93, 182000000],
  ['APT', 'Aptos', 9.74, -1.22, 78000000],
  ['ARB', 'Arbitrum', 1.12, 3.82, 119000000],
  ['OP', 'Optimism', 2.63, 2.71, 93000000],
  ['FIL', 'Filecoin', 5.84, -0.94, 82000000],
  ['AAVE', 'Aave', 112.38, 4.2, 61000000],
  ['MKR', 'Maker', 2782.1, 0.72, 56000000],
  ['INJ', 'Injective', 28.91, 8.64, 104000000],
  ['SUI', 'Sui', 1.72, 5.47, 88000000],
  ['SEI', 'Sei', 0.451, -3.12, 72000000],
  ['PEPE', 'Pepe', 0.0000123, 12.38, 192000000],
  ['SHIB', 'Shiba Inu', 0.0000214, 1.9, 171000000],
  ['TON', 'Toncoin', 7.28, -0.41, 166000000],
  ['TRX', 'TRON', 0.125, 0.42, 129000000],
  ['ETC', 'Ethereum Classic', 27.46, 3.19, 73000000],
  ['BCH', 'Bitcoin Cash', 446.2, -1.87, 118000000],
  ['ICP', 'Internet Computer', 12.72, 6.09, 91000000],
  ['RENDER', 'Render', 8.52, 9.38, 96000000],
  ['IMX', 'Immutable', 2.12, 2.84, 51000000],
  ['GRT', 'The Graph', 0.248, -0.77, 42000000],
  ['ALGO', 'Algorand', 0.184, 1.34, 39000000],
  ['VET', 'VeChain', 0.034, 4.02, 44000000],
  ['FLOW', 'Flow', 0.92, -2.53, 33000000],
  ['SAND', 'The Sandbox', 0.44, 3.42, 38000000],
  ['MANA', 'Decentraland', 0.46, 2.2, 35000000],
  ['AXS', 'Axie Infinity', 7.18, -1.09, 41000000],
] as const;
export const markets = seedMarkets.map(([symbol, name, price, change24h, volume24h], index) => ({
  id: symbol.toLowerCase(),
  symbol,
  name,
  quote: 'USDT',
  price,
  change24h,
  volume24h,
  sparkline: Array.from(
    {
      length: 20,
    },
    (_, point) =>
      Number(
        (price * (1 + Math.sin((point + index) * 0.63) * 0.018 + (point * change24h) / 10000)).toFixed(
          price < 1 ? 6 : 2
        )
      )
  ),
}));

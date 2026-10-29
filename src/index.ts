import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

import { createApp } from './app.js';
import { config } from './config.js';
import { marketDataProvider } from './services/index.js';

const server = createServer(createApp());
const webSocketServer = new WebSocketServer({
  server,
  path: '/ws',
});
webSocketServer.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/ws', `http://${request.headers.host ?? 'localhost'}`);
  const pair = url.searchParams.get('symbol') ?? 'BTC-USDT';

  if (!/^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}$/.test(pair)) {
    return socket.close(1008, 'Invalid market');
  }

  const closeUpstream = marketDataProvider.openTickerStream(pair, {
    onTick: (ticker) => {
      if (socket.readyState !== socket.OPEN) return;

      socket.send(
        JSON.stringify({
          symbol: pair,
          price: ticker.lastPrice,
          change24h: ticker.change24h,
          timestamp: ticker.timestamp,
        })
      );
    },
    onError: () => socket.close(1011, 'Market provider unavailable'),
  });

  socket.on('close', closeUpstream);
});
server.listen(config.port, () => console.log(`Nexora API listening on http://localhost:${config.port}`));

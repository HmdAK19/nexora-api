import server from './app.js';
import { config } from './config.js';

if (!process.env.VERCEL) {
  server.listen(config.port, () => console.log(`Nexora API listening on http://localhost:${config.port}`));
}

export default server;

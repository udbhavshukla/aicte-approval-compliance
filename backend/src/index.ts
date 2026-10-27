import 'dotenv/config';
import { createApp } from './app';

const rawPort = process.env.PORT ?? '4000';
const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error(`[compliance-api] Invalid PORT value: ${rawPort}`);
  process.exit(1);
}

const server = createApp().listen(port, () => {
  console.log(`[compliance-api] listening on http://localhost:${port}`);
  console.log('[compliance-api] data source: in-memory (resets on restart)');
});

function shutdown(signal: string): void {
  console.log(`[compliance-api] received ${signal}; shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

import type { Server } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

let server: Server | undefined;

function start() {
  server = app.listen(env.PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

async function shutdown(signal: string) {
  console.log(`${signal} → đang tắt server...`);
  const closeConnections = async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  };
  if (server) server.close(closeConnections);
  else await closeConnections();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();

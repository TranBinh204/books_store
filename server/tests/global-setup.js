// Chạy MỘT lần trước toàn bộ test: đưa DB test lên migration mới nhất.
const { execSync } = require('node:child_process');

module.exports = async () => {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error(
      'Thiếu DATABASE_URL_TEST — chạy test trong container: docker compose exec server npm test',
    );
  }
  execSync('npx node-pg-migrate up -d DATABASE_URL_TEST --verbose false', { stdio: 'inherit' });
};

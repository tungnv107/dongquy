import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { prepareTestDatabase } from './test-database';
async function main() {
  await prepareTestDatabase();
  const port = process.env.E2E_PORT || '3140';
  process.env.APP_URL = `http://localhost:${port}`;
  delete process.env.NEXT_DIST_DIR;
  process.env.UPLOAD_DIR = './data/test-uploads';
  const child = spawn(
    process.execPath,
    [
      path.resolve('node_modules/next/dist/bin/next'),
      'start',
      '--port',
      port,
      '--hostname',
      '127.0.0.1',
    ],
    { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } },
  );
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  child.on('exit', (code) => process.exit(code ?? 0));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import 'dotenv/config';
import { Pool } from 'pg';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
export async function prepareTestDatabase() {
  const source = new URL(
    process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://dongquy:local_dev_only@127.0.0.1:54329/dongquy',
  );
  if (!process.env.TEST_DATABASE_URL) source.pathname = '/dongquy_test';
  if (!/^[a-zA-Z0-9_]+_test$/.test(source.pathname.slice(1)))
    throw new Error('Test database must end with _test; never use a production database.');
  const targetName = source.pathname.slice(1);
  const adminUrl = new URL(source);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';
  const pool = new Pool({ connectionString: adminUrl.toString() });
  try {
    const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname=$1', [targetName]);
    if (!exists.rowCount) await pool.query(`CREATE DATABASE "${targetName}"`);
  } finally {
    await pool.end();
  }
  process.env.DATABASE_URL = source.toString();
  const migrated = spawnSync(
    process.execPath,
    [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    { cwd: process.cwd(), env: process.env, encoding: 'utf8' },
  );
  if (migrated.status !== 0) throw new Error(migrated.stdout + '\n' + migrated.stderr);
  console.log(`Test database ready: ${targetName}`);
  return source.toString();
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/test-database.ts'))
  prepareTestDatabase().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });

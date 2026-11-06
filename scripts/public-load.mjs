import fs from 'node:fs/promises';
const base = process.env.QA_BASE_URL || 'http://localhost:3139';
const results = [];
// A small local smoke check, not a capacity claim or production stress test.
for (let batch = 0; batch < 5; batch++) {
  results.push(
    ...(await Promise.all(
      Array.from({ length: 4 }, async () => {
        const started = performance.now();
        const response = await fetch(base + '/api/public/funds/quy-song-xanh/statistics');
        const body = await response.json();
        if (!response.ok || body.data?.closing !== '34120000')
          throw new Error('Unexpected financial response');
        return Math.round(performance.now() - started);
      }),
    )),
  );
}
results.sort((a, b) => a - b);
const report = {
  requests: results.length,
  concurrency: 4,
  errors: 0,
  p50Ms: results[9],
  p95Ms: results[18],
  maxMs: results[19],
  environment: 'Local Docker, seeded development database',
};
await fs.mkdir('data/qa', { recursive: true });
await fs.writeFile('data/qa/public-load.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

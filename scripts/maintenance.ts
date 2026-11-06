import 'dotenv/config';
import { db } from '../src/lib/db';
import { runMaintenance } from '../src/lib/maintenance';
runMaintenance()
  .then((result) => console.log(JSON.stringify({ job: 'maintenance', ...result })))
  .catch((error) => {
    console.error('Maintenance failed', error.code || error.name);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

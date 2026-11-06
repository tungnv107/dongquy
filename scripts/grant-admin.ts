import 'dotenv/config';
import { db } from '../src/lib/db';
import { audit, serial } from '../src/lib/audit';
async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) throw new Error('Usage: npm run admin:grant -- account@example.com');
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await serial(async (client) => {
    await client.user.update({ where: { id: user.id }, data: { platformAdmin: true } });
    await audit(client, null, null, 'PLATFORM_ADMIN_GRANTED_BY_OPERATOR', user.id, {
      email: user.email,
    });
  });
  console.log('Platform admin granted to existing account:', email);
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

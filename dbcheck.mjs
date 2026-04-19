import { PrismaClient } from './node_modules/@prisma/client/index.js';
const p = new PrismaClient();
try {
  const n = await p.user.count();
  console.log('users:', n);
  const u = await p.user.findMany({ select: { id: true, email: true, role: true }, take: 10 });
  u.forEach(x => console.log(x.email, x.role));
} catch(e) { console.error('ERROR:', e.message); }
await p.$disconnect();

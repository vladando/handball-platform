# HandballHub — Setup Guide

## Project Structure

```
handball-platform/
├── app/
│   ├── globals.css                          ← Design system
│   ├── layout.tsx                           ← Root layout + Nav
│   ├── page.tsx                             ← Landing page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── players/
│   │   ├── page.tsx                         ← Player listing
│   │   ├── PlayersClient.tsx                ← Live filters
│   │   └── [slug]/
│   │       ├── page.tsx                     ← Player profile
│   │       └── PlayerProfileClient.tsx      ← Tabs
│   ├── dashboard/
│   │   ├── player/
│   │   │   ├── page.tsx
│   │   │   └── PlayerDashboardClient.tsx    ← Edit everything
│   │   └── club/
│   │       ├── page.tsx
│   │       └── ClubDashboardClient.tsx      ← Search, watchlist, logs
│   ├── admin/
│   │   ├── page.tsx
│   │   └── AdminClient.tsx                  ← Verify clubs, manage commission
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   └── register/route.ts
│       ├── interactions/reveal/route.ts     ← Commission logic
│       ├── player/
│       │   ├── profile/route.ts
│       │   ├── videos/route.ts
│       │   ├── videos/[id]/route.ts
│       │   ├── career/route.ts
│       │   └── medical/route.ts
│       ├── players/search/route.ts
│       ├── watchlist/route.ts
│       ├── scouting-notes/route.ts
│       └── admin/
│           ├── clubs/verify/route.ts
│           └── interactions/status/route.ts
├── components/
│   ├── Nav.tsx
│   ├── Toast.tsx
│   └── RevealContactButton.tsx
├── lib/
│   ├── auth.ts                              ← NextAuth config
│   ├── prisma.ts                            ← DB client
│   └── minio.ts                             ← File storage
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
├── next.config.ts
└── .env
```

---

## Quick Start

### 1. Install dependencies
```cmd
npm install next-auth bcryptjs @prisma/adapter-pg pg @next-auth/prisma-adapter
npm install -D @types/bcryptjs @types/pg
```

### 2. Make sure PostgreSQL is running
```cmd
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "SELECT 1"
```

### 3. Run migrations
```cmd
set DATABASE_URL=postgresql://handball_user:handball123@localhost:5432/handball?schema=public
npx prisma migrate dev --name init
```

### 4. Seed an admin user (run once)
```cmd
npx ts-node scripts/seed-admin.ts
```

### 5. Start the app
```cmd
npm run dev
```

Open http://localhost:3000

---

## Creating an Admin Account

After registration, manually set a user as ADMIN in the database:

```sql
-- Connect to your database first:
-- psql -U handball_user -d handball

UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Or using Prisma Studio (GUI):
```cmd
npx prisma studio
```
Open http://localhost:5555 → Users table → change role to ADMIN.

---

## User Flows

| Role | Register at | Dashboard at |
|------|-------------|--------------|
| Player | /auth/register?role=PLAYER | /dashboard/player |
| Club | /auth/register?role=CLUB | /dashboard/club |
| Admin | Set via DB after register | /admin |

---

## Environment Variables (.env)

```env
DATABASE_URL=postgresql://handball_user:handball123@localhost:5432/handball?schema=public
POSTGRES_DB=handball
POSTGRES_USER=handball_user
POSTGRES_PASSWORD=handball123
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=minio123456
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
IP_SALT=another_random_string_for_ip_hashing
```

---

## Troubleshooting

**"Cannot find module '@prisma/client'"**
```cmd
npx prisma generate
```

**"Prisma datasource url required"**
Make sure `prisma.config.ts` has the `datasource.url` field and your `.env` has `DATABASE_URL`.

**"P1001 Can't reach database"**
Start PostgreSQL service or Docker container first.

**Login not working**
Make sure `NEXTAUTH_SECRET` is set in `.env` and `NEXTAUTH_URL` matches your actual URL.

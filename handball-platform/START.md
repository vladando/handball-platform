# HandballHub — Pokretanje u 5 koraka

## Korak 1 — Instaliraj zavisnosti
```cmd
npm install
```

## Korak 2 — Napravi .env fajl
```cmd
copy .env.example .env
```
Otvori `.env` i postavi PASSWORD vrijednosti (ili ostavi kako jesu za development).

## Korak 3 — Pokreni PostgreSQL
Ako imaš PostgreSQL instaliran direktno:
```cmd
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE USER handball_user WITH PASSWORD 'handball123';"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE handball OWNER handball_user;"
```

## Korak 4 — Pokreni migracije
```cmd
npx prisma migrate dev --name init
```

## Korak 5 — Pokreni aplikaciju
```cmd
npm run dev
```

Otvori **http://localhost:3000** ✅

---

## Kreiranje Admin naloga
1. Registruj se normalno na `/auth/register`
2. Otvori Prisma Studio: `npx prisma studio`
3. Idi na `users` tabelu → pronađi svoj email → promijeni `role` u `ADMIN`
4. Odjavi se i prijavi ponovo

---

## Korisne komande
| Komanda | Opis |
|---------|------|
| `npm run dev` | Pokreni development server |
| `npx prisma studio` | GUI za bazu podataka |
| `npx prisma migrate dev` | Primijeni nove migracije |
| `npx prisma generate` | Generiši Prisma klijent |

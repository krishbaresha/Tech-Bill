# ElectroTrack POS — Project Rules

## Repository
- **Official GitHub Repo**: `https://github.com/krishbaresha/Tech-Bill`
- All `git push` must target `origin` which is set to `https://github.com/krishbaresha/Tech-Bill`
- The VM (`4.193.188.145`) git remote must also point to `https://github.com/krishbaresha/Tech-Bill`
- The old remote `https://github.com/talharana23/test-techbill` is stale/deleted — never use it

## VM / Server
- **Host**: `4.193.188.145`
- **User**: `techbill_admin`
- **Password**: `Office#1234_h`
- **API path**: `/home/techbill_admin/techbill/electrotrack-api/techbill-api`
- **Process manager**: PM2 — app name `electrotrack-backend`
- **Database**: Local PostgreSQL on `localhost:5432`, DB = `techbill_db`, user = `techbill_admin`, password = `TechBillSecurePass2026!`
- **Schema sync**: Use `npx prisma db push --accept-data-loss` (not migrate dev) since this is a local VM DB

## Deploy Workflow
1. Make changes locally
2. `git add` + `git commit` + `git push origin master`
3. SSH to VM → `git pull origin master`
4. `npx prisma db push --accept-data-loss` (if schema changed)
5. `npm run build`
6. `pm2 restart electrotrack-backend`

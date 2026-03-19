# Supabase Setup For Shared Pricing

Use this to make all employee devices read/write the same settings.

## 1) Create table in Supabase

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.shared_settings (
  id bigint primary key,
  prices jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'system'
);

insert into public.shared_settings (id, prices, updated_at, updated_by)
values (1, '{}'::jsonb, now(), 'system')
on conflict (id) do nothing;
```

## 2) Configure server environment

Create `.env` from `.env.example` and set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `SUPABASE_SETTINGS_TABLE` (default: `shared_settings`)
- `SETTINGS_ROW_ID` (default: `1`)

## 3) Start server

```bash
node server.js
```

Check health endpoint:

```bash
curl http://localhost:8080/api/health
```

When configured correctly, response contains:

```json
{ "ok": true, "storage": "supabase" }
```

## Notes

- Use `service_role` key only on server, never in browser code.
- If Supabase env vars are missing, server falls back to local file storage.

## Vercel Deployment (luxsign.net)

If you deploy on Vercel, set these in **Project Settings -> Environment Variables**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SETTINGS_TABLE` = `shared_settings`
- `SETTINGS_ROW_ID` = `1`

Then redeploy the latest commit.

Verify from production:

```bash
curl https://luxsign.net/api/health
curl https://luxsign.net/api/settings
```

Expected health:

```json
{ "ok": true, "storage": "supabase" }
```

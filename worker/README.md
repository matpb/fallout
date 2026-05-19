# fallout-sync (Cloudflare Worker + D1)

Cloud persistence backend for [fallout.matpb.com](https://fallout.matpb.com). Token-as-credential, no accounts.

## Architecture

Each character carries a `cloudToken` (32-byte url-safe random). The token is the credential — `Authorization: Bearer <token>` on every API call. The Worker stores `SHA-256(token)` in D1, so a database leak does not hand out write access.

Anyone with a character's token can read, write, and delete that character. The recovery URL is `https://fallout.matpb.com/r/<token>`.

## Endpoints

| Method | Path                    | Body                              | Notes                                                |
|--------|-------------------------|-----------------------------------|------------------------------------------------------|
| POST   | `/v1/characters`        | `{id, payload, updatedAt}`        | Create. Bearer token = the new credential.           |
| PUT    | `/v1/characters/:id`    | `{payload, updatedAt}`            | Upsert. 409 if server is newer (returns server copy).|
| GET    | `/v1/characters/:id`    | -                                 | Fetch.                                               |
| DELETE | `/v1/characters/:id`    | -                                 | Soft delete.                                         |

All authenticated by `Authorization: Bearer <cloudToken>`.

## Local dev

```sh
npm install
npm run db:migrate:local
npm run dev
```

## Deploy

Wrangler reads `CLOUDFLARE_API_TOKEN` from the env. Do not put it in any file under this directory.

```sh
export CLOUDFLARE_API_TOKEN="$(grep CLOUDFLARE_API_KEY ~/Cortex/.env | cut -d= -f2-)"
npm run db:create                  # one-time; paste the printed database_id into wrangler.toml
npm run db:migrate:remote
npm run deploy
```

# Postal Zero

## Production deployment architecture for Fly.io

Postal Zero is designed to run as a small, reliable Fly.io deployment with four apps:

- `postal-api`: stateless Express API server
- `postal-worker`: outbound-mail queue worker
- `postal-webhook-worker`: webhook retry worker
- `postal-web`: Next.js frontend

## Files created

- `fly.toml`
- `fly.worker.toml`
- `fly.webhook-worker.toml`
- `fly.web.toml`
- `Dockerfile`
- `Dockerfile.web`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `prisma/schema.prisma`
- `src/lib/*`
- `src/queues/*`
- `src/workers/*`

## Environment variables

Required production secrets:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `RECEIPT_SIGNING_SECRET`
- `WEBHOOK_HMAC_SECRET`
- `LOG_LEVEL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

Local example values are in `.env.example`.

## Local development

Start local services and workers:

```bash
docker compose up --build
```

The API will be available on `http://localhost:3000`.

## Fly.io deployment commands

Create and deploy apps once:

```bash
flyctl launch --name postal-api --region iad --dockerfile Dockerfile --no-deploy
flyctl launch --name postal-worker --region iad --dockerfile Dockerfile --no-deploy
flyctl launch --name postal-webhook-worker --region iad --dockerfile Dockerfile --no-deploy
flyctl launch --name postal-web --region iad --dockerfile Dockerfile.web --no-deploy
```

Apply secrets:

```bash
flyctl secrets set \
  DATABASE_URL="$DATABASE_URL" \
  REDIS_URL="$REDIS_URL" \
  JWT_SECRET="$JWT_SECRET" \
  RECEIPT_SIGNING_SECRET="$RECEIPT_SIGNING_SECRET" \
  WEBHOOK_HMAC_SECRET="$WEBHOOK_HMAC_SECRET" \
  LOG_LEVEL=info \
  RATE_LIMIT_WINDOW_MS=60000 \
  RATE_LIMIT_MAX=120
```

Deploy apps:

```bash
flyctl deploy --config fly.toml
flyctl deploy --config fly.worker.toml
flyctl deploy --config fly.webhook-worker.toml
flyctl deploy --config fly.web.toml
```

## Observability and reliability

- Structured logging with `pino`
- Prometheus metrics on `/metrics`
- Health probe on `/healthz`
- Redis-backed BullMQ queues with retry and backoff
- Request-level rate limiting and secure headers
- HMAC-SHA256 webhook signing and receipt signing

## CI/CD

The GitHub Actions workflows:

- `ci.yml`: `npm ci`, `typecheck`, `build`, `prisma generate`
- `deploy.yml`: deploys Fly apps on `main`

## Prisma production

Prisma is configured to use `DATABASE_URL` from the environment and to deploy migrations with `npm run prisma:deploy`.

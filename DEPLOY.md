# Deploy to Fly.io

## One-time setup
flyctl auth login
flyctl apps create postal-zero-api

## Postgres
flyctl postgres create --name postal-zero-db --region lax --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
flyctl postgres attach postal-zero-db --app postal-zero-api

## Secrets
flyctl secrets set --app postal-zero-api JWT_SECRET=$(openssl rand -hex 32)
flyctl secrets set --app postal-zero-api WEB_URL=https://postal-zero-web.fly.dev
flyctl secrets set --app postal-zero-api NODE_ENV=production
flyctl secrets set --app postal-zero-api STRIPE_SECRET_KEY=sk_live_YOUR_KEY
flyctl secrets set --app postal-zero-api STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
flyctl secrets set --app postal-zero-api STRIPE_PRICE_STARTER=price_YOUR_ID
flyctl secrets set --app postal-zero-api STRIPE_PRICE_PRO=price_YOUR_ID
flyctl secrets set --app postal-zero-api STRIPE_PRICE_BUSINESS=price_YOUR_ID
flyctl secrets set --app postal-zero-api ANTHROPIC_API_KEY=sk-ant-YOUR_KEY

## Deploy
flyctl deploy --app postal-zero-api

## Verify
curl https://postal-zero-api.fly.dev/health
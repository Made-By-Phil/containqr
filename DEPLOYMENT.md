# ContainQR deployment runbook

This runbook describes the recommended first production setup for ContainQR on a single EC2 instance without containers.

## Target architecture

- **Single EC2 instance**
- **nginx** for TLS termination, static frontend serving, `/media/` serving, and `/api/` proxying
- **gunicorn + Django** as a systemd-managed backend service
- **Vite frontend** built during deploy and served as static files by nginx
- **SQLite** stored on the server, not committed to git
- **GitHub Actions** for CI and deploy-over-SSH

This is intentionally boring and explicit. It is meant to get the product live reliably before introducing more platform complexity.

## Recommended server layout

```text
/srv/containqr/
├── app/                 # git checkout
├── venv/                # python virtualenv
├── env/.env             # environment variables
├── shared/
│   ├── db/containqr.sqlite3
│   ├── media/
│   └── logs/
└── scripts/
    └── deploy.sh
```

## Environment variables

Create `/srv/containqr/env/.env`:

```env
DJANGO_SECRET_KEY=replace-me
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=containqr.com,www.containqr.com,<ec2-public-hostname>
DJANGO_CORS_ALLOWED_ORIGINS=https://containqr.com,https://www.containqr.com
DJANGO_DB_PATH=/srv/containqr/shared/db/containqr.sqlite3
DJANGO_MEDIA_ROOT=/srv/containqr/shared/media
DJANGO_STATIC_ROOT=/srv/containqr/app/staticfiles

STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_YEARLY_PRICE_ID=price_...
FRONTEND_URL=https://containqr.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## One-time EC2 bootstrap

1. Install packages:
   - `python3`
   - `python3-venv`
   - `python3-pip`
   - `nginx`
   - `nodejs`
   - `npm`
2. Create directories:
   - `/srv/containqr/app`
   - `/srv/containqr/venv`
   - `/srv/containqr/env`
   - `/srv/containqr/shared/db`
   - `/srv/containqr/shared/media`
   - `/srv/containqr/shared/logs`
   - `/srv/containqr/scripts`
3. Clone the repo into `/srv/containqr/app`
4. Create the virtualenv in `/srv/containqr/venv`
5. Add the `.env` file
6. Install the systemd service
7. Install the nginx site config
8. Obtain TLS certs (recommended: certbot)

## Deploy flow

Deploys should run through `scripts/deploy.sh`.

What the deploy script does:
- fetch latest code
- reset to the target commit
- ensure Python dependencies are installed
- optionally unpack a prebuilt frontend artifact uploaded by GitHub Actions
- run Django migrations
- collect static files
- restart gunicorn
- reload nginx
- verify `/api/health/` with a short readiness retry window

## Data rules

- `db.sqlite3` should **not** live in the repo
- uploaded media should **not** live only inside the checkout
- code is replaceable, data is persistent

## CI/CD flow

### CI
Run on pushes and PRs:
- `npm run build`
- `npm run test`
- Django tests via `python manage.py test`

### CD
Run on push to `main`:
- build the frontend in GitHub Actions
- upload the built frontend artifact to EC2 over SSH
- SSH to EC2
- execute deploy script with target commit SHA and artifact path

## Production URLs

Recommended public shape:
- `https://containqr.com/` → frontend
- `https://containqr.com/api/...` → Django API
- `https://containqr.com/media/...` → nginx-served media

## Smoke check after deploy

Required checks:
- `GET /api/health/` returns 200
- homepage loads
- login/register page loads
- container API responds for an authenticated user
- Stripe-related environment variables are present

## Operational note

For small EC2 instances, avoid building the frontend on the box during deploys. Let GitHub Actions handle the heavy frontend build work and keep the server-side deploy focused on pulling code, installing backend dependencies, unpacking built assets, migrating, and restarting services.

## Remaining manual work after these repo changes

- provision OS packages on EC2
- create server directories and env file
- install nginx + systemd configs
- add GitHub secrets for deploy SSH
- configure DNS and TLS
- configure live Stripe webhook target

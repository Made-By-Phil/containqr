# ContainQR

A container inventory management application with QR code support. Create containers, add items to them, and generate QR codes for quick access. Scan a QR code to instantly view a container's contents.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Django 6.0, Django REST Framework
- **Database**: SQLite
- **Auth**: Token-based authentication (DRF authtoken)
- **Payments**: Stripe (yearly subscription via Stripe Checkout)

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Stripe CLI](https://docs.stripe.com/stripe-cli) (for local webhook testing)

### Setup

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd containqr

# Backend setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # or: pip install django djangorestframework django-cors-headers stripe python-dotenv qrcode Pillow

# Create .env file with your Stripe keys (see .env section below)

# Run migrations
python manage.py migrate

# Frontend setup
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_YEARLY_PRICE_ID=price_...
FRONTEND_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Get your Stripe keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys). The webhook secret comes from the Stripe CLI when running `stripe listen`.

### Running in Development

You need three terminals running simultaneously:

```sh
# Terminal 1: Django backend (port 8000)
source venv/bin/activate
python manage.py runserver

# Terminal 2: Vite frontend (port 8080)
npm run dev

# Terminal 3: Stripe webhook forwarding
stripe listen --forward-to localhost:8000/api/stripe/webhook/
```

The Vite dev server proxies `/api` requests to Django automatically.

## Development Commands

### Frontend

```sh
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run Vitest tests
npm run test:watch   # Tests in watch mode
```

### Backend

```sh
python manage.py runserver         # Start Django (port 8000)
python manage.py migrate           # Run migrations
python manage.py makemigrations    # Create new migrations
python manage.py test              # Run Django tests
python manage.py cleanup_pending_registrations  # Remove stale pending registrations
```

## Architecture

### Registration & Payment Flow

All users must have a yearly Stripe subscription. There is no free tier.

1. User fills in the registration form (username, email, password)
2. Backend validates and stores a `PendingRegistration` (password hashed, never plain text)
3. A Stripe Checkout Session is created and the user is redirected to Stripe's hosted payment page
4. On successful payment, Stripe fires a `checkout.session.completed` webhook
5. The webhook handler creates the real user account from the pending registration
6. The frontend success page polls for confirmation, then auto-logs in and redirects to the dashboard

### Project Structure

```
containqr/
├── backend/          # Django settings and root URL config
├── api/              # REST API views, serializers, URLs
│   ├── views.py      # Container, Location, Auth views
│   ├── stripe_views.py  # Stripe checkout, webhook, verification endpoints
│   ├── permissions.py   # HasActiveSubscription permission class
│   └── serializers.py
├── containers/       # Container, Location, ContentItem models
├── users/            # CustomUser model (with Stripe fields), PendingRegistration
├── src/              # React frontend
│   ├── pages/        # Route components (Dashboard, Login, Register, ContainerView, etc.)
│   ├── components/   # Reusable components and shadcn/ui
│   └── contexts/     # AuthContext for token/user state
└── media/            # User-uploaded container photos
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register/` | None | Legacy user registration |
| POST | `/api/login/` | None | Token auth login |
| POST | `/api/logout/` | Token | Logout |
| GET/POST | `/api/containers/` | Subscription | List/create containers (`?search=` supported) |
| GET/PUT/DELETE | `/api/containers/<id>/` | Subscription | Container CRUD |
| GET | `/api/containers/uuid/<uuid>/` | None | Public container view (respects password protection) |
| GET | `/api/locations/` | Subscription | List locations |
| GET | `/api/qr-code/<uuid>/` | None | Generate QR code PNG |
| GET | `/api/media/<uuid>/` | Varies | Serve container photos |
| POST | `/api/stripe/create-checkout-session/` | None | Start registration + payment flow |
| POST | `/api/stripe/webhook/` | Stripe signature | Handle Stripe events |
| GET | `/api/stripe/verify-session/` | None | Verify payment and auto-login |
| GET | `/api/stripe/subscription-status/` | Token | Check subscription status |

### Subscription Enforcement

- `HasActiveSubscription` permission class gates container and location endpoints
- Users with `active` or `past_due` status have access (grace period during payment retries)
- Users with `canceled` or `unpaid` status are blocked with a 403 response
- Public endpoints (QR code views, container UUID lookup) are not gated

## Testing Stripe

Use [Stripe test cards](https://docs.stripe.com/testing):

- **Successful payment**: `4242 4242 4242 4242`
- **Declined card**: `4000 0000 0000 0341`
- Any future expiry date and any 3-digit CVC

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ContainQR is a container inventory management application with QR code support. Users can create containers, add items to them, and generate QR codes for quick access.

## Development Commands

### Frontend (Vite + React)
```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run Vitest tests
npm run test:watch   # Run tests in watch mode
```

### Backend (Django)
```bash
python manage.py runserver     # Start Django on port 8000
python manage.py migrate       # Run migrations
python manage.py makemigrations
python manage.py test          # Run Django tests
```

Both servers need to run simultaneously for development. The Vite dev server proxies `/api` requests to Django.

## Architecture

### Full-Stack Structure
- **Frontend**: React + TypeScript + Vite (port 8080)
- **Backend**: Django REST Framework (port 8000)
- **Database**: SQLite (db.sqlite3)
- **Auth**: Token-based authentication via DRF authtoken

### Frontend Organization (`src/`)
- `pages/` - Route components (Dashboard, Login, Register, ContainerView)
- `components/` - Reusable components and shadcn/ui components in `ui/`
- `contexts/AuthContext.tsx` - Auth state management with localStorage token persistence
- `types/container.ts` - TypeScript types for Container and ContainerItem

### Backend Organization
- `backend/` - Django project settings and root URL config
- `api/` - REST API views, serializers, and URL routing
- `containers/` - Container, Location, ContentItem models
- `users/` - CustomUser model (extends AbstractUser)

### Key Patterns
- API calls use `@tanstack/react-query` for data fetching
- All authenticated API requests require `Authorization: Token <token>` header
- Container readable_id format: `{location_abbr}{color_abbr}{number}` (e.g., "GAR01")
- QR codes are generated server-side via the `qrcode` Python library

### API Endpoints (all prefixed with `/api/`)
- `POST /register/` - User registration
- `POST /login/` - Token auth login
- `GET/POST /containers/` - List/create containers (supports `?search=` query)
- `GET/PUT/DELETE /containers/<id>/` - Container CRUD
- `GET /locations/` - List available locations
- `GET /qr-code/<uuid>/` - Generate QR code PNG for container

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

Key rules:
- Accent color is amber (#D4820A) — never use blue, teal, or purple as primary
- Background is warm off-white (#F7F4EF) in the app shell, dark canvas (#1A2B2B) for marketing pages ONLY
- Fonts: Satoshi (display), DM Sans (body/UI), JetBrains Mono (identifiers/codes)
- Container codes and access codes always use JetBrains Mono with letter-spacing: 0.3em
- Touch targets minimum 44×44px (especially critical in /viewer routes — mobile-primary)
- App shell uses list rows for containers, NOT card grids
- /viewer/dashboard is search-first — no container list on initial load

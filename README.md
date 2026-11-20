# Equb Rotation & Contribution Management System (ERCMS)

A centralized platform for managing traditional Ethiopian Equb savings groups.
Built with **Django 5.2 + Django REST Framework** (backend), **React 18 + Vite** (web frontend),
with a dedicated **Android mobile application** planned and **English / Amharic** bilingual support.

Payment integration with **M-Pesa** and **Chapa** is planned for Phase 3 (subject to provider API availability).

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Running Tests](#running-tests)
7. [User Roles](#user-roles)
8. [Environment Variables](#environment-variables)
9. [Development Notes](#development-notes)

---

## Project Structure

```
ERCMS/
├── backend/                  Django project
│   ├── config/               Project settings and URL configuration
│   │   ├── settings/
│   │   │   ├── base.py       Shared settings (all environments)
│   │   │   ├── development.py SQLite, console email, open CORS
│   │   │   └── production.py PostgreSQL, SMTP email, strict security
│   │   ├── urls.py           Root URL configuration (/api/*)
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── accounts/             Custom user model, auth endpoints, permissions
│   ├── equbs/                Equb group management (Phase 2)
│   ├── memberships/          Membership management (Phase 2)
│   ├── contributions/        Contribution and payment tracking (Phase 3)
│   ├── rotations/            Rotation schedule management (Phase 4)
│   ├── payouts/              Payout processing (Phase 4)
│   ├── meetings/             Meeting and attendance management (Phase 5)
│   ├── withdrawals/          Withdrawal request management (Phase 5)
│   ├── notifications/        In-app and email notifications (Phase 5)
│   ├── reports/              Financial reports (Phase 6)
│   ├── auditing/             Audit log (all phases)
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                  Environment secrets (not in git)
│   └── .env.example          Template for the .env file
│
├── frontend/                 React + Vite application
│   ├── src/
│   │   ├── api/              Axios instance and API service functions
│   │   ├── context/          AuthContext (global auth state)
│   │   ├── hooks/            useAuth, useFetch
│   │   ├── components/       Shared UI components
│   │   ├── layouts/          PublicLayout, DashboardLayout (sidebar + topbar)
│   │   ├── guards/           PrivateRoute (auth + role check)
│   │   ├── pages/            All page-level components by feature
│   │   ├── styles/           global.css with CSS custom properties
│   │   ├── App.jsx           Root router
│   │   └── main.jsx          React entry point
│   ├── index.html
│   ├── vite.config.js        Proxies /api to Django on port 8000
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Python | 3.11+ | 3.14 is installed and works |
| Node.js | 18.0+ | Required for the frontend |
| npm | 9.0+ | Comes with Node.js |
| Git | any | For version control |

**Install Node.js** (required before running the frontend):
Download from https://nodejs.org/ — choose the LTS version.

---

## Backend Setup

Open a terminal in the `backend/` directory.

### 1. Activate the virtual environment

```powershell
# Windows PowerShell
.\venv\Scripts\Activate.ps1
```

If you see a security error, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Install dependencies (already done if you followed setup)

```powershell
pip install -r requirements.txt
```

### 3. Configure environment variables

```powershell
copy .env.example .env
```

Edit `.env` and set a strong `SECRET_KEY`. For development the defaults work as-is.

### 4. Apply database migrations

```powershell
python manage.py migrate --settings=config.settings.development
```

### 5. Create a superuser (System Administrator)

```powershell
python manage.py createsuperuser --settings=config.settings.development
```

When prompted, set the role to `admin` via the Django admin interface after login,
or set it directly:

```powershell
python manage.py shell --settings=config.settings.development
```
```python
from accounts.models import CustomUser, Role
user = CustomUser.objects.get(username='your_username')
user.role = Role.ADMIN
user.save()
exit()
```

---

## Frontend Setup

Open a terminal in the `frontend/` directory.

### 1. Install Node.js dependencies

```powershell
npm install
```

---

## Running the Application

You need **two terminals** running simultaneously.

### Terminal 1 — Django backend

```powershell
# From backend/ with the virtual environment activated
python manage.py runserver --settings=config.settings.development
```

Backend starts on: http://127.0.0.1:8000
Django admin:      http://127.0.0.1:8000/admin/
API health check:  http://127.0.0.1:8000/api/health/

### Terminal 2 — React frontend

```powershell
# From frontend/
npm run dev
```

Frontend starts on: http://localhost:5173

The Vite dev server proxies all `/api/*` requests to Django, so they share the
same origin and session cookies work correctly without any CORS configuration
on the client side.

Open http://localhost:5173 in your browser.

---

## Running Tests

### Backend tests

```powershell
# From backend/ with venv activated
python manage.py test --settings=config.settings.development
```

To run only the authentication tests:

```powershell
python manage.py test accounts --settings=config.settings.development --verbosity=2
```

Expected result: **22 tests, 0 failures**

---

## User Roles

| Role | Registration | Access |
|------|-------------|--------|
| **System Administrator** | Admin-created only | Full system access |
| **Equb Organizer** | Self-register (requires Admin approval) | Equb groups, members, rotation, meetings |
| **Treasurer** | Self-register (requires Admin approval) | Contributions, payouts, financial records |
| **Equb Member** | Self-register (immediately active) | Own contribution/payout data and rotation |
| **Auditor** | Self-register (requires Admin approval) | Read-only financial records and audit log |

**Activation workflow for staff roles:**
1. User registers as Organizer / Treasurer / Auditor.
2. Account is created with `is_active = False`.
3. A System Administrator logs in, goes to User Management, and sets `is_active = True`.
4. User can now log in.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values.

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | Django secret key — generate a new random one |
| `DEBUG` | Yes | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | Yes | Comma-separated list of allowed host names |
| `DJANGO_SETTINGS_MODULE` | Yes | `config.settings.development` or `config.settings.production` |
| `DEFAULT_FROM_EMAIL` | No | Sender address for outgoing emails |

Production-only variables (PostgreSQL, SMTP) are documented in `.env.example`.

---

## Development Notes

### Authentication
The application uses **Django session authentication** with CSRF protection.
- The React frontend reads the `csrftoken` cookie and attaches it as `X-CSRFToken`
  on every POST / PUT / PATCH / DELETE request.
- Sessions are stored server-side in the database.
- No JWT tokens are used — this keeps the implementation simpler and more secure
  for this project scope.

### API base URL
All API endpoints are prefixed with `/api/`. The Vite proxy forwards them to Django
at `http://127.0.0.1:8000` in development. In production, the frontend should be
served from the same domain as the backend, or CORS / CSRF must be configured for
the production domain.

### Database
- Development: SQLite (`backend/db.sqlite3`) — no setup required.
- Production: PostgreSQL — set `DB_*` variables in `.env` and install `psycopg2-binary`.

### Adding a new phase
1. Implement the Django model in the relevant app.
2. Run `python manage.py makemigrations` and `python manage.py migrate`.
3. Write the serializer, view, and register the URL in the app's `urls.py`.
4. Replace the `PlaceholderPage` in `frontend/src/App.jsx` with the real page component.
5. Write and run tests before marking the feature as complete.

### Bilingual support (English / Amharic)
The frontend uses `i18next` + `react-i18next`. Translation files go in `frontend/src/locales/`.
The Django backend has `USE_I18N = True` and `gettext_lazy` imports throughout.
Language selection will be added to the user profile in Phase 2.

### Android application
The Django REST API is platform-agnostic — the same endpoints serve both the React web
app and the planned Android application. The Android app will be developed in Phase 7
using React Native or native Android, consuming the same `/api/*` endpoints.

### Payment integration (M-Pesa / Chapa)
M-Pesa and Chapa payment gateway integration is planned for Phase 3 alongside
contribution management. A `PaymentGateway` abstraction layer will be introduced so
the payment provider can be swapped or extended without changing contribution logic.
Actual integration depends on provider API access and applicable terms.

### Code style
- Python: follow PEP 8. Docstrings for all models, serializers, and views.
- JavaScript: ESLint with `eslint-plugin-react` and `eslint-plugin-react-hooks`.
- All user-facing strings should be translated via `django.utils.translation.gettext_lazy`.

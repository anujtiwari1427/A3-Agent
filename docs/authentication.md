# A3-Agent Authentication & Identity Architecture

This document details the authentication architecture in A3-Agent, including **Google Sign-In (OAuth 2.0 / Google Identity Services)**, **Personal Workspaces**, **Account Linking**, and **Data Privacy**.

---

## 1. Target Login Experience

A3-Agent provides a modern, unified authentication experience:

1. **Continue with Google** (Primary default authentication via official Google Identity Services).
2. **Email & Password Authentication** (Fallback credentials for local/offline environments).
3. **Security License Key** (Application activation gate for local on-premise deployments).

---

## 2. Google OAuth 2.0 Architecture

```text
Next.js Frontend (GIS SDK)
      │  (User selects Google Account)
      ▼
Google ID Token (Credential)
      │  POST /api/v1/auth/google
      ▼
A3 FastAPI Backend
      │  Validate Token with Google tokeninfo
      │  (Verify issuer, expiration, audience, sub, verified email)
      ▼
Identity & Workspace Resolution
      ├── Found UserIdentity(provider='google', sub) -> Authenticate existing user
      ├── Found User(email=verified_email) -> Safely link UserIdentity -> Authenticate
      └── New User -> Create User + Dedicated Personal Workspace + UserIdentity
      ▼
Issue A3 JWT Session Token
      │  (Contains user_id, org_id, role)
      ▼
A3 Dashboard (Owner-scoped dataset privacy)
```

---

## 3. Data Privacy & Personal Workspaces

- **Independent Personal Workspaces**: When a user registers via Google or email, A3 provisions a dedicated personal workspace (`Org` with a unique UUID and slug `ws-<uuid[:8]>`).
- **Owner-Scoped Privacy**:
  $$\text{dataset.org\_id} == \text{current\_user.org\_id} \quad \text{AND} \quad \text{dataset.uploaded\_by} == \text{current\_user.id}$$
- **Anti-IDOR Protection**: All analytical, cleaning, profiling, reporting, and forecasting endpoints verify dataset ownership through `DatasetRepository.get_for_user()`. Unauthorized ID lookups return `404 Not Found`.

---

## 4. Google Cloud Console Setup Guide

Follow these steps to obtain OAuth credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `A3 Data Intelligence`).
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   - Select **External** (or Internal for Google Workspace orgs).
   - Fill in application name (`A3-Agent`), user support email, and developer contact.
   - Add test users if your app is in Testing mode.
4. Navigate to **APIs & Services** > **Credentials**:
   - Click **Create Credentials** > **OAuth client ID**.
   - Select **Web application**.
   - **Authorized JavaScript origins**:
     - Development: `http://localhost:3000`
     - Production: `https://your-production-domain.vercel.app`
   - **Authorized redirect URIs**:
     - Development: `http://localhost:3000`
     - Production: `https://your-production-domain.vercel.app`
5. Copy the generated **Client ID** and **Client Secret**.

---

## 5. Environment Configuration

Add the following to your backend `.env.local` or hosting environment:

```env
# Google OAuth 2.0 / Identity Services
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000
```

> [!NOTE]
> Never commit `GOOGLE_CLIENT_SECRET` to Git. The frontend dynamically fetches the public `GOOGLE_CLIENT_ID` via `GET /api/v1/auth/google/config`.

---

## 6. Multi-Provider UserIdentity Model

A3 stores external authentication providers in a decoupled `UserIdentity` model:

- `id`: UUID (Primary Key)
- `user_id`: ForeignKey(`users.id`, ondelete="CASCADE")
- `provider`: String (e.g., `"google"`, `"github"`)
- `provider_subject`: String (Google `sub` / external stable ID)
- `created_at`, `updated_at`

**Constraint**: `UNIQUE(provider, provider_subject)`

This architecture enables seamless future additions of GitHub, Apple, and SAML/SSO authentication.

---

## 7. Session Termination & Cache Clearing

When a user logs out:
1. Calls `POST /api/v1/auth/logout` to record an audit event.
2. Clears `localStorage` (`a3_token`, `a3_user`, dataset caches).
3. Clears `sessionStorage` and in-memory React state.
4. Redirects to `/` preventing cross-user data leakage on shared machines.

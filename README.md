# Kaarigar

An AI-driven market-linkage and smart-cataloging platform for marginalized Indian artisans — SIH26090 (Ministry of Social Justice and Empowerment). An artisan speaks about their craft in Hindi or English, AI turns that into a professional, bilingual, SEO-ready B2B listing, and — once a human reviewer approves it — the business goes live on an IndiaMART-style marketplace where buyers can browse, chat, and pay a 10% advance.

This is the **web MVP** of a mobile-first product. The final target is React Native + Expo; see [Architecture](#architecture) for how the codebase is shaped to make that port straightforward later.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**, deployed on Vercel
- **Neon Postgres** via **Drizzle ORM** (`@neondatabase/serverless` HTTP driver — no connection pooling issues on serverless)
- **next-intl** for English/Hindi, both locale-prefixed (`/en/…`, `/hi/…`) for per-language SEO
- **Tailwind v4** + a hand-adapted shadcn preset (Base UI primitives, not Radix) — see [Design system](#design-system)
- **Phone/OTP** (MSG91 or a console fallback) as the primary login, plus optional **Google/GitHub OAuth** — both land in the same custom JWT session system, with refresh-token rotation and reuse detection
- **Sarvam AI** → a companion **Python/FastAPI ML service** (`services/ml/`) → the browser's **Web Speech API**, as a 3-tier speech-to-text fallback chain
- **Gemini** for structured extraction (voice → listing) and pricing rationale, with deterministic offline fallbacks for both
- **Cloudinary** for storage/enhancement + client-side WASM background removal (`@imgly/background-removal`)
- **Razorpay** for advance payments

Every one of those integrations is optional at the environment-variable level — the app boots and every feature degrades to a documented fallback with zero keys configured. See `.env.example`.

## Getting started

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL at minimum
npm run db:generate                # only needed after changing the schema
npm run db:migrate                  # applies src/infra/db/migrations/*.sql
npm run db:seed                     # 3 approved + 1 pending_review demo business
npm run dev
```

Open `http://localhost:3000` — it redirects to `/en`. Try `/hi` for Hindi.

With no `MSG91_*` keys set, OTP codes are printed to the server console (and shown in a dev banner in the UI) instead of sent by SMS, so the whole auth → onboarding → admin-approval → marketplace loop is testable end to end with zero external accounts.

### Admin access

Log in (via the normal OTP flow) with a phone number listed in `ADMIN_PHONE_NUMBERS` — seeded as an admin user by `db:seed` — to reach `/admin` and approve the seeded `pending_review` business.

### Running the ML microservice

Optional — the Next.js app works without it (falls back to the deterministic pricing rules engine and skips straight to Web Speech for voice). To run it:

```bash
cd services/ml
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train.py
uvicorn app.main:app --reload --port 8000
```

Then set `ML_SERVICE_URL=http://localhost:8000` in `.env.local`. See `services/ml/README.md` for enabling the (heavier) ASR fallback tier and for deployment notes — it needs a persistent host (Render, a Hugging Face Space, etc.), not Vercel.

## Architecture

Business logic is deliberately kept out of React components and route handlers, both so it stays testable and so the eventual React Native port doesn't require rewriting it:

```
src/
  app/          Thin. Pages render components; API routes parse -> call core -> serialize.
  core/         Framework-agnostic domain logic (auth, business, pricing, messaging, payments…).
                No React, no next/*, no Drizzle imports. This is what ports to Expo largely as-is.
  infra/        Adapters — the only place external SDKs/Drizzle/Next-specific APIs appear
                (db/, sms/, speech/, ai/, storage/, payments/, ml/, http/, ratelimit/).
  components/   ui/ (design-system primitives) + feature components.
  i18n/, config/, hooks/, lib/
services/ml/    Separate Python/FastAPI service — pricing model + optional ASR fallback.
```

Every swappable external dependency (OTP delivery, speech-to-text, messaging transport) sits behind an interface in `core/*/ports.ts`, implemented in `infra/`. The database itself isn't treated as swappable — `core` services call plain repository functions in `infra/db/repositories/*` directly, which is what "no Drizzle in core" means in practice here.

**Auth**: no passwords anywhere. Phone + OTP is the primary, preferred path — OTP codes are argon2id-hashed at rest. Google/GitHub OAuth is additive (`core/auth/oauth.service.ts`, `infra/oauth/*`), resolving to the exact same `users` row/session system rather than a parallel one: an OAuth account either links to an existing user by verified email, or creates a new `role='buyer'` account. `users.phoneE164`/`email` are both nullable — an app-level guarantee (not a DB constraint) ensures at least one is set. Refresh tokens (from either login path) are opaque random strings stored only as an HMAC digest, with rotation and reuse-detection (a replayed, already-rotated token revokes its entire session family). CSRF is a double-submit cookie for same-origin JSON calls, plus a separate signed `state` cookie for the OAuth redirect round-trip.

**Voice pipeline**: MediaRecorder captures audio → Sarvam AI → the Python ML service → (if neither is configured) the browser's own Web Speech API, decided once per session via a capability check rather than reactively per attempt. Every capture is logged to `voice_sessions` for audit/replay in the admin queue, regardless of which tier produced it.

**Pricing**: the Python service's scikit-learn model → a deterministic rules engine scored against seeded `price_reference` bands → an optional Gemini refinement pass. The rules engine is the only tier guaranteed to run, so a suggestion always exists even with zero API keys.

## Design system

Palette, radius, and typography are CSS custom properties in `src/app/[locale]/globals.css` — light theme only for now, but every color is a variable and a `.dark { … }` block already exists (unstyled, kept structurally in sync) so a real dark theme later is a token-file change, not a rewrite. Devanagari gets its own font (`Noto Sans Devanagari`) and looser line-height via an `html[lang="hi"]` override, rather than reusing the Latin font stack as a fallback.

## Aadhaar / KYC

Per the SIH scope, Aadhaar verification is an **optional future module**, not part of this MVP — the `kyc_documents` table exists in the schema but is never written to. Trust in this build comes from the human admin-review queue and the verified-business badge. If you do want to add it later: don't store raw Aadhaar numbers (restricted under the Aadhaar Act §29 without being a licensed AUA/KUA) — the intended path is DigiLocker OAuth or Offline Aadhaar XML/QR, persisting only a verified name/DOB/address and the last 4 digits (for the masked `XXXX XXXX 1234` display), never the full number.

## Testing

```bash
npm run test        # vitest — pure domain logic: OTP policy, JWT, business-code
                     # generation, the pricing rules engine, webhook signature
                     # verification. No DB/network required.
npm run typecheck
npm run build
```

## Deploying

- **Next.js app** → Vercel, as-is.
- **ML service** → Render/Fly/a Docker-capable host (see `services/ml/README.md`) — it's a persistent process and can't run on Vercel.
- Fill in the real values for every blank key in `.env.example` on whichever platform you deploy to.

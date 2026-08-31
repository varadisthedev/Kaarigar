# Kaarigar ML Service

This is `apps/render/` — a small Python microservice living in its own
top-level folder specifically so a host like Render can be pointed at this
directory as its root, independently of `apps/web/` (the Next.js app, which
Vercel points at instead). It's deployed **separately** from the Next.js app
(Vercel can't run a persistent Python process). It backs two things:

1. **`POST /price/predict`** — a scikit-learn model behind the Dynamic
   Pricing Assistant. Always available once the service boots.
2. **`POST /asr`** — the third-tier speech-to-text fallback (after Sarvam AI
   and before the browser's own Web Speech API). Optional: only live if you
   install `requirements-asr.txt` and set `ASR_MODEL_ID`.

Next.js talks to this via `ML_SERVICE_URL` (see `apps/web/.env.example`) and
degrades cleanly — to the pricing rules engine, or to Web Speech — whenever
this service is unreachable or a specific endpoint isn't configured.

## Authentication between the two apps

`/price/predict` and `/asr` require a shared-secret header:

```
x-internal-api-key: <ML_SERVICE_API_KEY>
```

Set the same value for `ML_SERVICE_API_KEY` here (see `.env.example`) and in
`apps/web`'s env — `apps/web/src/infra/ml/ml-service.client.ts` and
`indic-service.provider.ts` attach the header automatically whenever it's
set. Leave both blank for local dev (the check is skipped entirely when
`ML_SERVICE_API_KEY` is unset here); set both once this service is actually
deployed and reachable from the internet — otherwise anyone who finds the
Render URL can call your pricing model for free. `/health` is unauthenticated
on purpose, for platform health checks.

## Local development

```bash
cd apps/render
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train.py                  # generates models/pricing_model.joblib
uvicorn app.main:app --reload --port 8000
```

Then point the Next.js app at it (in `apps/web/.env.local`):

```
ML_SERVICE_URL=http://localhost:8000
```

## Enabling `/asr`

This needs real ASR model weights, which is a materially bigger deploy than
the pricing endpoint alone:

```bash
pip install -r requirements-asr.txt
export ASR_MODEL_ID=<a Hugging Face Hub checkpoint id>
```

`ASR_MODEL_ID` is intentionally left unset by default rather than pointing at
a specific AI4Bharat checkpoint we can't guarantee is current — pick an
IndicConformer/IndicWav2Vec (or similar Indic ASR) model from the Hugging
Face Hub, verify it loads with `transformers.pipeline("automatic-speech-recognition", ...)`,
and set the env var to that model id. Model weights for a competent Indic ASR
model typically run into the hundreds of MB to ~1GB, and inference is CPU-slow
without a GPU — budget a paid Render instance (not the free tier) or a
Hugging Face Space with persistent storage, not a hobby dyno. Until you do
this, `/health` reports `"asr_available": false` and `/asr` returns `503`,
which is exactly the signal the Next.js side uses to skip straight to the
browser fallback.

## Deploying

**Render** (or similar): create the service with **root directory
`apps/render`**, build command `pip install -r requirements.txt && python
train.py`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
Set `ML_SERVICE_API_KEY` (and `ASR_MODEL_ID` if enabling ASR) in the
service's environment variables — see `.env.example` in this folder.

**Docker**: `docker build -t Kaarigar-ml . && docker run -p 8000:8000 -e ML_SERVICE_API_KEY=... Kaarigar-ml`
— builds the lightweight (pricing-only) image; see the Dockerfile for adding
the ASR extras.

## Retraining the pricing model

`train.py` currently trains on a synthetic dataset shaped by the same price
bands seeded into Postgres (`src/infra/db/seed.ts`'s `price_reference` rows),
since there's no real transaction history yet. Once the marketplace has
enough real order data, replace `synthesize()` with a query against actual
`orders`/`products` rows and retrain — the API contract (`/price/predict`'s
request/response shape) doesn't need to change.

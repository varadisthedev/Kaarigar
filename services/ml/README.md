# CraftMate ML Service

A small Python microservice, deployed **separately** from the Next.js app
(Vercel can't run a persistent Python process). It backs two things:

1. **`POST /price/predict`** — a scikit-learn model behind the Dynamic
   Pricing Assistant. Always available once the service boots.
2. **`POST /asr`** — the third-tier speech-to-text fallback (after Sarvam AI
   and before the browser's own Web Speech API). Optional: only live if you
   install `requirements-asr.txt` and set `ASR_MODEL_ID`.

Next.js talks to this via `ML_SERVICE_URL` (see the root `.env.example`) and
degrades cleanly — to the pricing rules engine, or to Web Speech — whenever
this service is unreachable or a specific endpoint isn't configured.

## Local development

```bash
cd services/ml
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train.py                  # generates models/pricing_model.joblib
uvicorn app.main:app --reload --port 8000
```

Then point the Next.js app at it:

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

**Render** (or similar): point it at this directory, build command
`pip install -r requirements.txt && python train.py`, start command
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

**Docker**: `docker build -t craftmate-ml . && docker run -p 8000:8000 craftmate-ml`
— builds the lightweight (pricing-only) image; see the Dockerfile for adding
the ASR extras.

## Retraining the pricing model

`train.py` currently trains on a synthetic dataset shaped by the same price
bands seeded into Postgres (`src/infra/db/seed.ts`'s `price_reference` rows),
since there's no real transaction history yet. Once the marketplace has
enough real order data, replace `synthesize()` with a query against actual
`orders`/`products` rows and retrain — the API contract (`/price/predict`'s
request/response shape) doesn't need to change.

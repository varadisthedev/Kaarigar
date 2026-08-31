"""
Trains the dynamic-pricing model used by POST /price/predict.

There's no real transaction history to train on yet (the marketplace is
brand new), so this generates a synthetic dataset shaped by the same
category/material/size-band/region price bands seeded into Postgres
(`src/infra/db/seed.ts`'s `price_reference` rows) plus randomized noise and
realistic adjustments for lead time and artisan experience. This is exactly
why the pricing chain treats this model as one input among three (ML model ->
rules engine -> Gemini refinement) rather than the sole source of truth —
it's a reasonable prior, not a fact.

Run: python train.py
Output: models/pricing_model.joblib
"""

import os

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)

# category -> (material, base_min, base_max, region) — mirrors the seed data
# in src/infra/db/seed.ts, extended to cover every category in
# src/config/craft-categories.ts so the model has *some* prior for all of them.
CATEGORY_BANDS = {
    "Block Printing": ("cotton", 250, 450, "Gujarat"),
    "Handloom Weaving": ("silk", 4500, 12000, "Uttar Pradesh"),
    "Wooden Lacquerware": ("wood", 150, 600, "Karnataka"),
    "Folk Painting": ("canvas", 800, 3500, "Bihar"),
    "Pottery & Ceramics": ("clay", 200, 1200, "Rajasthan"),
    "Embroidery": ("cotton", 400, 2500, "Punjab"),
    "Metalwork": ("brass", 300, 3000, "West Bengal"),
    "Jewelry Making": ("silver", 500, 5000, "Rajasthan"),
    "Leatherwork": ("leather", 350, 2000, "Uttar Pradesh"),
    "Bamboo & Cane Craft": ("bamboo", 100, 900, "Assam"),
}

SIZE_MULTIPLIERS = {"small": 0.6, "medium": 1.0, "large": 1.6}


def synthesize(n_per_category: int = 400) -> pd.DataFrame:
    rows = []
    for category, (material, base_min, base_max, region) in CATEGORY_BANDS.items():
        for _ in range(n_per_category):
            size_band = rng.choice(list(SIZE_MULTIPLIERS.keys()))
            mult = SIZE_MULTIPLIERS[size_band] * rng.uniform(0.85, 1.15)
            lead_time_days = int(rng.integers(5, 30))
            experience_years = int(rng.integers(0, 40))

            # More experience -> modest premium; longer lead time -> tends to
            # correlate with more elaborate (pricier) work in this synthetic
            # model, capturing the intuition without claiming real causality.
            experience_adj = 1 + min(experience_years, 20) * 0.004
            lead_time_adj = 1 + min(lead_time_days, 30) * 0.003

            price_min = base_min * mult * experience_adj * rng.uniform(0.92, 1.08)
            price_max = base_max * mult * experience_adj * lead_time_adj * rng.uniform(0.92, 1.08)
            price_max = max(price_max, price_min * 1.15)

            rows.append(
                {
                    "category": category,
                    "material": material,
                    "size_band": size_band,
                    "region": region,
                    "lead_time_days": lead_time_days,
                    "experience_years": experience_years,
                    "price_min": round(price_min, 2),
                    "price_max": round(price_max, 2),
                }
            )
    return pd.DataFrame(rows)


def build_pipeline() -> Pipeline:
    categorical = ["category", "material", "size_band", "region"]
    numeric = ["lead_time_days", "experience_years"]

    preprocessor = ColumnTransformer(
        transformers=[("cat", OneHotEncoder(handle_unknown="ignore"), categorical)],
        remainder="passthrough",
    )
    # `remainder="passthrough"` keeps `numeric` columns as-is; listing them
    # here is just for readability of what the model actually sees.
    del numeric

    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            (
                "regressor",
                GradientBoostingRegressor(
                    n_estimators=200,
                    max_depth=3,
                    learning_rate=0.05,
                    random_state=RANDOM_SEED,
                ),
            ),
        ]
    )


def main():
    df = synthesize()
    feature_cols = ["category", "material", "size_band", "region", "lead_time_days", "experience_years"]
    X = df[feature_cols]

    model_min = build_pipeline().fit(X, df["price_min"])
    model_max = build_pipeline().fit(X, df["price_max"])

    os.makedirs("models", exist_ok=True)
    dump(
        {
            "model_min": model_min,
            "model_max": model_max,
            "feature_cols": feature_cols,
            "known_categories": sorted(CATEGORY_BANDS.keys()),
        },
        "models/pricing_model.joblib",
    )
    print(f"Trained on {len(df)} synthetic rows across {len(CATEGORY_BANDS)} categories.")
    print("Saved models/pricing_model.joblib")


if __name__ == "__main__":
    main()

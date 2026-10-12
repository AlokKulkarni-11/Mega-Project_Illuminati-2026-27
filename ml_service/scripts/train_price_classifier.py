import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

from ml_service.models.price_classifier import PricePatternClassifier


def generate_synthetic_training_data(n_samples: int = 500) -> pd.DataFrame:
    """Generates realistic synthetic OHLCV time-series data for training."""
    np.random.seed(42)
    dates = pd.date_range(end="2026-08-10", periods=n_samples)
    
    # Generate price random walk with drift
    returns = np.random.normal(loc=0.0005, scale=0.02, size=n_samples)
    price = 100.0 * np.exp(np.cumsum(returns))
    
    high = price * (1 + np.abs(np.random.normal(0, 0.01, size=n_samples)))
    low = price * (1 - np.abs(np.random.normal(0, 0.01, size=n_samples)))
    open_px = low + (high - low) * np.random.uniform(0.1, 0.9, size=n_samples)
    volume = np.random.randint(500000, 10000000, size=n_samples)
    
    df = pd.DataFrame({
        "symbol": "NSE_STOCK",
        "date": dates.strftime("%Y-%m-%d"),
        "open": open_px,
        "high": high,
        "low": low,
        "close": price,
        "volume": volume
    })
    return df


def train_and_save_model():
    print("Generating training OHLCV dataset...")
    raw_df = generate_synthetic_training_data(n_samples=1000)
    
    classifier_obj = PricePatternClassifier()
    df_feat = classifier_obj.compute_technical_indicators(raw_df).dropna().reset_index(drop=True)
    
    # Create target labels based on 5-day forward return
    df_feat["future_return"] = df_feat["close"].pct_change(5).shift(-5)
    
    def label_regime(ret):
        if ret > 0.025:
            return 0  # bullish
        elif ret < -0.025:
            return 1  # bearish
        else:
            return 2  # consolidating

    df_feat["target"] = df_feat["future_return"].apply(label_regime)
    df_train = df_feat.dropna().reset_index(drop=True)
    
    feature_cols = ["return_zscore", "volume_zscore", "rsi_14", "macd", "macd_signal"]
    X = df_train[feature_cols]
    y = df_train["target"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training XGBoost Classifier...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        objective="multi:softprob",
        num_class=3,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"XGBoost Model Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["bullish", "bearish", "consolidating"]))
    
    # Save model artifact
    save_dir = Path(__file__).parent.parent / "models" / "saved_models"
    save_dir.mkdir(parents=True, exist_ok=True)
    model_path = save_dir / "price_xgb.joblib"
    
    joblib.dump(model, model_path)
    print(f"Model successfully saved to {model_path}")


if __name__ == "__main__":
    train_and_save_model()

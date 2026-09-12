import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional


class PricePatternClassifier:
    """
    Classifies stock price movement regimes (bullish, bearish, consolidating)
    using trained XGBoost machine learning model on technical features.
    """

    LABEL_MAP = {0: "bullish", 1: "bearish", 2: "consolidating"}

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or str(
            Path(__file__).parent / "saved_models" / "price_xgb.joblib"
        )
        self.model = self._load_saved_model()

    def _load_saved_model(self):
        path = Path(self.model_path)
        if path.exists():
            try:
                return joblib.load(path)
            except Exception as e:
                print(f"[Warning] Failed to load XGBoost model from {path}: {e}")
                return None
        return None

    def compute_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates key technical features:
        - SMA_20, SMA_50
        - Price Return Z-score
        - Volume Z-score
        - RSI (Relative Strength Index)
        - MACD & Signal Line
        """
        data = df.copy()
        data = data.sort_values("date").reset_index(drop=True)

        # Price returns
        data["return"] = data["close"].pct_change()

        # Moving Averages
        data["sma_20"] = data["close"].rolling(window=min(20, len(data)), min_periods=1).mean()
        data["sma_50"] = data["close"].rolling(window=min(50, len(data)), min_periods=1).mean()

        # Return & Volume Z-scores
        window_size = min(20, max(2, len(data)))
        roll_mean = data["return"].rolling(window=window_size, min_periods=1).mean()
        roll_std = data["return"].rolling(window=window_size, min_periods=1).std().fillna(1e-5)
        data["return_zscore"] = (data["return"] - roll_mean) / roll_std

        vol_mean = data["volume"].rolling(window=window_size, min_periods=1).mean()
        vol_std = data["volume"].rolling(window=window_size, min_periods=1).std().fillna(1e-5)
        data["volume_zscore"] = (data["volume"] - vol_mean) / vol_std

        # RSI (14 period)
        delta = data["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
        rs = gain / (loss + 1e-5)
        data["rsi_14"] = 100 - (100 / (1 + rs))

        # MACD (12, 26, 9)
        ema_12 = data["close"].ewm(span=min(12, len(data)), adjust=False).mean()
        ema_26 = data["close"].ewm(span=min(26, len(data)), adjust=False).mean()
        data["macd"] = ema_12 - ema_26
        data["macd_signal"] = data["macd"].ewm(span=min(9, len(data)), adjust=False).mean()

        return data

    def predict_regime(self, ohlcv_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Given a list of OHLCV dictionary records, classifies the recent regime
        using the trained XGBoost model or technical indicator heuristics.
        """
        if not ohlcv_records:
            return {
                "regime": "consolidating",
                "confidence": 0.50,
                "features": {},
                "anomalous": False,
                "return_zscore": 0.0,
                "volume_zscore": 0.0
            }

        df = pd.DataFrame(ohlcv_records)
        for col in ["open", "high", "low", "close", "volume"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df_feat = self.compute_technical_indicators(df)
        latest = df_feat.iloc[-1]

        ret_z = float(latest.get("return_zscore", 0.0))
        vol_z = float(latest.get("volume_zscore", 0.0))
        rsi = float(latest.get("rsi_14", 50.0))
        macd_val = float(latest.get("macd", 0.0))
        macd_sig = float(latest.get("macd_signal", 0.0))
        close_px = float(latest.get("close", 0.0))
        sma20 = float(latest.get("sma_20", close_px))

        # 1. XGBoost ML Inference if model exists
        if self.model is not None:
            try:
                feature_vector = pd.DataFrame([{
                    "return_zscore": ret_z,
                    "volume_zscore": vol_z,
                    "rsi_14": rsi,
                    "macd": macd_val,
                    "macd_signal": macd_sig
                }])
                probs = self.model.predict_proba(feature_vector)[0]
                pred_class_idx = int(np.argmax(probs))
                regime = self.LABEL_MAP.get(pred_class_idx, "consolidating")
                confidence = float(probs[pred_class_idx])

                is_anomalous = abs(ret_z) >= 2.0 or vol_z >= 3.0

                return {
                    "regime": regime,
                    "confidence": round(confidence, 4),
                    "anomalous": is_anomalous,
                    "return_zscore": round(ret_z, 2),
                    "volume_zscore": round(vol_z, 2),
                    "model_used": "XGBoost",
                    "features": {
                        "rsi_14": round(rsi, 2),
                        "macd": round(macd_val, 4),
                        "macd_signal": round(macd_sig, 4),
                        "sma_20": round(sma20, 2),
                        "last_close": round(close_px, 2)
                    }
                }
            except Exception as e:
                print(f"[Warning] XGBoost inference failed, falling back to heuristics: {e}")

        # 2. Rule Heuristics Fallback
        score_bullish = 0.0
        score_bearish = 0.0

        if ret_z > 1.5:
            score_bullish += 0.35
        elif ret_z < -1.5:
            score_bearish += 0.35

        if close_px > sma20:
            score_bullish += 0.25
        else:
            score_bearish += 0.25

        if rsi > 60:
            score_bullish += 0.20
        elif rsi < 40:
            score_bearish += 0.20

        if macd_val > macd_sig:
            score_bullish += 0.20
        else:
            score_bearish += 0.20

        if score_bullish > 0.55 and score_bullish > score_bearish:
            regime = "bullish"
            confidence = min(0.98, max(0.60, score_bullish))
        elif score_bearish > 0.55 and score_bearish > score_bullish:
            regime = "bearish"
            confidence = min(0.98, max(0.60, score_bearish))
        else:
            regime = "consolidating"
            confidence = 0.65

        is_anomalous = abs(ret_z) >= 2.0 or vol_z >= 3.0

        return {
            "regime": regime,
            "confidence": round(float(confidence), 4),
            "anomalous": is_anomalous,
            "return_zscore": round(ret_z, 2),
            "volume_zscore": round(vol_z, 2),
            "model_used": "HeuristicFallback",
            "features": {
                "rsi_14": round(rsi, 2),
                "macd": round(macd_val, 4),
                "macd_signal": round(macd_sig, 4),
                "sma_20": round(sma20, 2),
                "last_close": round(close_px, 2)
            }
        }

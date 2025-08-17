# -*- coding: UTF-8 -*-
import os
import gzip
import pickle
from typing import Tuple, Sequence
from functools import lru_cache
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from typing import Any, Optional

# 將所有與模型相關的常數集中管理，命名具體清楚
MODEL_RELATIVE_PATH = os.path.join('model', 'random_forest_model.pgz')
POSITIVE_LABEL = 1  # 若你的陽性標籤不是 1，請在此處明確指定

def get_absolute_model_path() -> str:
    """回傳模型的絕對路徑。單一職責：只負責算路徑。"""
    current_directory = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_directory, MODEL_RELATIVE_PATH)

def extract_estimator_from_artifact(artifact: Any) -> Any:
    """單一職責：從多種封裝形式取出具有 predict/predict_proba 的估計器。"""
    # 1) 如果是字典，嘗試常見鍵位
    if isinstance(artifact, dict):
        for candidate_key in ("model", "estimator", "clf"):
            if candidate_key in artifact:
                return artifact[candidate_key]
        # 沒拿到就回傳原物件，讓後續檢查去報錯
        return artifact

    # 2) 如果是 Pipeline，取最後一步（通常是分類器）
    if isinstance(artifact, Pipeline):
        return artifact.steps[-1][1] if artifact.steps else artifact

    # 3) 其他情形：直接回傳給後續做屬性檢查
    return artifact

@lru_cache(maxsize=1)
def load_trained_model() -> Any:
    """Lazy load + 快取，支援多種封裝形式。"""
    model_path = get_absolute_model_path()
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at: {model_path}")

    with gzip.open(model_path, 'rb') as file:
        artifact = pickle.load(file)

    estimator = extract_estimator_from_artifact(artifact)

    # 這裡做能力檢查（predict / predict_proba）
    if not hasattr(estimator, "predict"):
        raise AttributeError("Loaded artifact does not provide 'predict'.")
    if not hasattr(estimator, "predict_proba"):
        # 若是二元分類器但沒有 predict_proba，常見是用 regressor 或版本不符
        raise AttributeError("Loaded artifact does not provide 'predict_proba'.")

    return estimator

def to_numpy_2d(array_like: Sequence[float]) -> np.ndarray:
    """
    將輸入轉為 shape=(1, n_features) 的 2D numpy 陣列。
    單一職責：只負責轉型與形狀保證。
    """
    input_array = np.asarray(array_like, dtype=float)
    if input_array.ndim == 1:
        return input_array.reshape(1, -1)
    return input_array

def get_positive_class_index(model: RandomForestClassifier, positive_label: int) -> int:
    """
    依據指定陽性標籤，回傳在 classes_ 中的索引。
    單一職責：只負責找出正確的機率欄位索引。
    """
    classes_list = list(model.classes_)
    if positive_label not in classes_list:
        raise ValueError(f"Positive label {positive_label} not found in model classes: {classes_list}")
    return classes_list.index(positive_label)

def predict_with_probability(feature_values: Sequence[float]) -> Tuple[int, float]:
    """
    使用已載入的模型進行預測，並回傳 (predicted_label, positive_probability)。
    - 單一職責：只負責推論與機率抽取。
    - 符合 Early Return：遇到不符條件即拋錯，由呼叫端接住。
    """
    model = load_trained_model()
    input_array_2d = to_numpy_2d(feature_values)

    predicted_label = model.predict(input_array_2d)[0]
    positive_index = get_positive_class_index(model, POSITIVE_LABEL)
    positive_probability = float(model.predict_proba(input_array_2d)[0][positive_index])

    # 轉為 Python 原生型別，避免 JSON 序列化問題
    if hasattr(predicted_label, "item"):
        predicted_label = predicted_label.item()

    return int(predicted_label), positive_probability


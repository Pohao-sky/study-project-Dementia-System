# -*- coding: UTF-8 -*-
import os
import pickle
import gzip
from sklearn.ensemble import RandomForestClassifier

# 取得 model.py 所在的絕對路徑
base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, 'model', 'random_forest_model.pgz')

# 載入模型
with gzip.open(model_path, 'rb') as f:
    RFModel = pickle.load(f)

# 將模型預測寫成一個 function
def predict(input_data):
    pred = RFModel.predict(input_data)[0]
    positive_prob = RFModel.predict_proba(input_data)[0][1]  # 取得 label=1 的機率
    return pred, positive_prob

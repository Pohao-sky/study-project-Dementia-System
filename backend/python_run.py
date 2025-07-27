import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token
import db        # 假設 db.py 中有 read_from_db(query) 函式
import model     # 假設 model.py 中有 predict(input_data) 函式
import datetime

app = Flask(__name__)
CORS(app)

# JWT 密鑰，正式建議用複雜字串並用環境變數讀取
app.config['JWT_SECRET_KEY'] = 'wl6m06au/6tj06HIM'    #桃園銘傳HIM
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(minutes=40)
jwt = JWTManager(app)

# 取得目前目錄與 config.json 的路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(current_dir, 'config.json')
audio_chunks = {}

# 讀取設定檔
with open(config_path, 'r') as file:
    config = json.load(file)

# 從設定檔取得資料庫資料表名稱
db_view = config['postgres'].get('db_view')
patient_table = config['postgres'].get('patient_table')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # 資料庫查詢 user 表，驗證帳號密碼
    user_query = f'''
        SELECT "Patient_ID", "Name", "Gender", "Birthyr", "password"
        FROM "{patient_table}"
        WHERE "Patient_ID" = %s
    '''
    user_result = db.read_from_db(user_query, (username,))  # 建議改成參數化查詢
    if not user_result:
        return jsonify({'error': '帳號或密碼錯誤'}), 401

    user = user_result[0]
    if password != user[4]:
        return jsonify({'error': '帳號或密碼錯誤'}), 401

    # 再查分數表
    score_query = f'''
        SELECT "CDR_SUM", "MMSE_Score", "MEMORY", "CDRGLOB"
        FROM "{db_view}"
        WHERE "Patient_ID" = %s
    '''
    score_result = db.read_from_db(score_query, (username,))
    if not score_result:
        # 若查無分數資料，可決定直接給空值或報錯
        scores = {'CDR_SUM': None, 'MMSE_Score': None, 'MEMORY': None, 'CDRGLOB': None}
    else:
        scores = {
            'CDR_SUM': score_result[0][0],
            'MMSE_Score': score_result[0][1],
            'MEMORY': score_result[0][2],
            'CDRGLOB': score_result[0][3]
        }

    # 準備 user 資料
    user_data = {
        'name': user[1],
        'gender': user[2],
        'birth_year': user[3],
        **scores
    }

    # 建立 JWT
    access_token = create_access_token(identity=username)

    return jsonify({
        'token': access_token,
        'user': user_data
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)

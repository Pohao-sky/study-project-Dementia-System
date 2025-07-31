import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token
import db        # 假設 db.py 中有 read_from_db(query) 函式
import model     # 假設 model.py 中有 predict(input_data) 函式
import datetime
from faster_whisper import WhisperModel
import torch
import jieba
from io import BytesIO

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

# === Faster Whisper & 關鍵字初始化 ===
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"使用裝置：{device}")
speech_model = WhisperModel(
    model_size_or_path="medium",
    device=device,
    compute_type="float16"
)

vegetables = {
    "高麗菜", "大白菜", "地瓜", "洋蔥", "玉米", "青花菜", "苦瓜", "南瓜", "馬鈴薯", "茄子", "番薯", "山藥",
    "菠菜", "白蘿蔔", "胡蘿蔔", "大蒜", "青椒", "甜椒", "辣椒","魔鬼椒", "香菇", "芋頭", "杏鮑菇", "花椰菜","黑豆",
    "空心菜", "地瓜葉", "絲瓜", "蓮藕", "金針菇", "洋菇", "黑木耳", "四季豆", "蔥","青蔥", "秋葵", "朝天椒",
    "韭菜", "蘆筍", "茭白筍", "冬瓜", "毛豆", "竹筍", "芹菜", "紅蔥頭", "豆芽菜", "小白菜","胡瓜","海帶",
    "青江菜", "萵苣", "美生菜", "蘿蔓萵苣", "大陸妹", "油菜", "韭黃", "芥菜", "芥藍", "莧菜","大黃瓜","紫菜",
    "茼蒿", "西洋菜", "落葵", "川七", "山蘇", "龍鬚菜", "水蓮", "紅鳳菜", "綠豆", "牛蒡", "A菜","海藻","山葵",
    "山藥", "玉米筍", "山苦瓜", "豇豆", "豌豆", "皇帝豆", "四角豆", "黃豆", "紫高麗菜", "羽衣甘藍","九層塔",
    "甜菜根", "甜菜", "馬齒莧", "鴻喜菇", "秀珍菇", "草菇", "猴頭菇", "佛手瓜", "瓠瓜", "紅豆", "雪裡紅", "馬蘭頭",
    "香椿", "慈菇", "荸薺", "球芽甘藍", "芝麻葉", "苜蓿芽", "大頭菜", "小黃瓜", "娃娃菜", "牛皮菜","迷迭香",
    "金針花", "蠶豆", "蕨菜", "菊芋", "蒜苗", "麻竹筍", "綠竹筍", "孟宗竹筍", "桂竹筍", "箭竹筍", "松露",
}

animals = {
    # 常見哺乳類
    "貓", "鼠","老鼠", "大象", "獅子", "虎","老虎", "台灣獼猴","猴","猴子", "馬", "牛", "羊","犀牛","無尾熊","豹","獵豹","花豹","黑豹",
    "豬", "兔子", "兔", "狐狸", "狼", "駱駝", "袋鼠", "熊", "熊貓", "松鼠", "鼴鼠", "天竺鼠", "荷蘭豬","鬥牛",
    "浣熊", "豪豬", "刺蝟", "斑馬", "綿羊", "山羊", "羚羊", "山豬", "土撥鼠", "水牛", "蝙蝠", "白虎",
    "馴鹿", "北極熊" , "台灣黑熊" , "棕熊", "黑猩猩", "狒狒","猩猩", "金絲猴", "金剛", "狸貓", "鼬", "水獺", "山貓",

    # 狗的品種
    "狗", "柴犬", "哈士奇", "黃金獵犬", "拉布拉多", "吉娃娃", "臘腸狗", "牧羊犬" , "邊牧", "鬥牛犬", "博美", "薩摩耶", "獒犬","藏獒",
    "鬣狗","斑鬣狗",

    # 鳥類
    "鳥", "雞", "鴨", "鵝", "貓頭鷹" , "老鷹" , "遊隼", "孔雀", "鸚鵡", "鴿子", "鴛鴦", "喜鵲", "夜鶯", "啄木鳥",
    "燕子", "麻雀", "烏鴉", "企鵝", "皇帝企鵝", "國王企鵝", "駝鳥", "雉雞", "野雞", "白鷺鷥","海鷗",

    # 爬蟲與兩棲
    "蛇", "雨傘節" , "百步蛇" , "龜殼花" , "眼鏡蛇" , "青竹絲" , "響尾蛇" , "鎖鏈蛇", "烏龜", "蜥蜴", "變色龍", "青蛙", "蟾蜍","壁虎",
    "科莫多龍","科莫多巨蜥",


    # 昆蟲與無脊椎
    "甲蟲", "獨角仙", "鍬形蟲", "大兜蟲", "蜜蜂", "虎頭蜂", "螞蟻", "紅火蟻", "白蟻" , "行軍蟻" , "軍蟻" , "子彈蟻" , "蜜蟻" , "切葉蟻", "白蟻", "蜻蜓", "水蠆", "蒼蠅",
    "孑孓","蚊子", "螢火蟲", "瓢蟲","蝗蟲", "蚱蜢", "螳螂","蜘蛛", "蟋蟀", "蚯蚓", "蠍子", "跳蛛", "幽靈蛛", "獵人蛛", "蝴蝶",
    "鳳蝶", "紋白蝶", "禪", "螽斯","蟈蟈","米蟲", "蜈蚣", "蟑螂","蟒蛇", "黃金蟒","蚰蜒",

    # 水生動物
    "魚", "鯨魚", "鯊魚", "章魚", "海豚", "水母", "海馬", "河馬", "海星", "海豹", "海獅", "海龜", "海狗", "魟", "垃圾魚", "清道夫",
    "鱷魚", "白鯨" , "藍鯨", "虎鯨", "殺人鯨", "沙丁魚", "比目魚", "鱔魚", "蝦子", "龍蝦", "熱帶魚",
    "螃蟹" , "寄居蟹", "水蛭", "海兔",

    # 其他
    "鸚鵡螺", "小熊貓", "蝸牛", "蛞蝓", "食蟻獸", "福壽螺",
}

# jieba 詞庫加入所有關鍵字
for w in vegetables | animals:
    jieba.add_word(w)

audio_chunks = {}   # 用來暫存錄音片段

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

@app.route('/speech_upload_chunk', methods=['POST'])
def speech_upload_chunk():
    recording_id = request.form['recording_id']
    chunk_index = int(request.form['chunk_index'])
    audio = request.files['audio_chunk']
    # 儲存到 dict，確保順序
    if recording_id not in audio_chunks:
        audio_chunks[recording_id] = {}
    audio_chunks[recording_id][chunk_index] = audio.read()
    return jsonify({'ok': True})

@app.route('/speech_test_finalize', methods=['POST'])
def speech_test_finalize():
    recording_id = request.form['recording_id']
    test_type = request.form.get('type')
    if test_type not in ('vegetables', 'animals') or recording_id not in audio_chunks:
        return jsonify({'error': '參數錯誤'}), 400
    # 1. 合併所有片段
    chunks_dict = audio_chunks.pop(recording_id)
    # 依照 index 順序合併
    audio_bytes = b''.join([chunks_dict[i] for i in sorted(chunks_dict.keys())])
    audio_buffer = BytesIO(audio_bytes)

    # 2. Whisper 分析
    segments, info = speech_model.transcribe(
        audio_buffer,
        beam_size=5,
        language="zh",
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 1000}
    )
    text = "".join([seg.text for seg in segments])
    words = set(jieba.lcut(text))
    keywords = vegetables if test_type == 'vegetables' else animals
    detail = {w: 1 for w in words if w in keywords}
    total = len(detail)
    return jsonify({'total': total, 'detail': detail})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)

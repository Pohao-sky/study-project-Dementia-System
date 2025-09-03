import os
import json
import datetime
import threading
import subprocess
from io import BytesIO
from collections import defaultdict
from typing import Dict, List, Tuple, Any, Set, Optional

import numpy as np
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_restx import Api, Resource
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

from model import predict_with_probability, load_trained_model
from faster_whisper import WhisperModel
import torch
import jieba
import binascii
import logging
import traceback

# =========================
# 環境與 Flask 初始化
# =========================
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:4200"], "methods": ["GET", "POST"]}})

current_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(current_dir, "config.json")
with open(config_path, "r", encoding="utf-8") as file:
    config = json.load(file)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(minutes=40)

postgres = config["postgres"]
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql://{postgres['user']}:{postgres['password']}@{postgres['host']}:{postgres['port']}/{postgres['database']}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)
api = Api(app, version="1.0", title="Dementia API", description="API documentation", doc="/docs")

# 表名
db_view = postgres.get("db_view")
patient_table = postgres.get("patient_table")

# =========================
# 資料庫 Models
# =========================
class Patient(db.Model):
    __tablename__ = patient_table
    Patient_ID = db.Column("Patient_ID", db.String, primary_key=True)
    Name = db.Column("Name", db.String)
    Gender = db.Column("Gender", db.String)
    Birthyr = db.Column("Birthyr", db.Integer)
    password = db.Column("password", db.String)


class ScoreView(db.Model):
    __tablename__ = db_view
    __table_args__ = {"extend_existing": True}
    Patient_ID = db.Column("Patient_ID", db.String, primary_key=True)
    CDR_SUM = db.Column("CDR_SUM", db.Float)
    MMSE_Score = db.Column("MMSE_Score", db.Float)
    MEMORY = db.Column("MEMORY", db.Float)
    CDRGLOB = db.Column("CDRGLOB", db.Float)


class TrailMakingTestAResult(db.Model):
    __tablename__ = 'trail_making_test_a_result'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, nullable=False)
    duration = db.Column(db.Float, nullable=False)  # seconds
    errors = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class TrailMakingTestBResult(db.Model):
    __tablename__ = 'trail_making_test_b_result'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, nullable=False)
    duration = db.Column(db.Float, nullable=False)
    errors = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


# =========================
# Faster-Whisper 初始化 & 詞庫
# =========================

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"使用裝置：{'GPU ' + torch.cuda.get_device_name() if torch.cuda.is_available() else 'CPU'}")

speech_model = WhisperModel(
    model_size_or_path="medium",
    device=device,
    compute_type="float16",  # 在 4060 上用 FP16
)

vegetables: Set[str] = {
    # 葉菜類
    "高麗菜", "大白菜", "菠菜", "空心菜", "地瓜葉", "青江菜", "萵苣", "美生菜", "蘿蔓萵苣", "大陸妹", "油菜", "韭黃",
    "芥菜", "芥藍", "莧菜", "茼蒿", "西洋菜", "落葵", "川七", "山蘇", "龍鬚菜", "水蓮", "紅鳳菜", "A菜", "雪裡紅",
    "馬蘭頭", "牛皮菜", "芝麻葉",

    # 菇類
    "香菇", "杏鮑菇", "金針菇", "洋菇", "黑木耳", "鴻喜菇", "秀珍菇", "草菇", "猴頭菇", "松露","白玉菇",

    # 澱粉類 / 根莖類
    "地瓜", "馬鈴薯", "番薯", "山藥", "玉米", "南瓜", "胡蘿蔔", "白蘿蔔", "蓮藕", "芋頭", "牛蒡", "山苦瓜",
    "甜菜根", "甜菜", "馬齒莧", "菊芋", "紅豆", "綠豆", "黃豆", "黑豆", "皇帝豆", "豌豆", "蠶豆", "豇豆", "四角豆",

    # 瓜果類
    "茄子", "青花菜", "苦瓜", "胡瓜", "大黃瓜", "小黃瓜", "冬瓜", "絲瓜", "佛手瓜", "瓠瓜", "玉米筍",

    # 椒類
    "青椒", "甜椒", "辣椒", "朝天椒", "魔鬼椒",

    # 蔥蒜類
    "大蒜", "蔥", "青蔥", "紅蔥頭", "蒜苗",

    # 芽菜類
    "豆芽菜", "苜蓿芽",

    # 竹筍類
    "竹筍", "麻竹筍", "綠竹筍", "孟宗竹筍", "桂竹筍", "箭竹筍", "茭白筍",

    # 海藻類
    "海帶", "紫菜", "海藻",

    # 香草/香料
    "九層塔", "迷迭香", "香椿", "金針花",

    # 其他
    "四季豆", "秋葵", "韭菜", "芹菜", "胡瓜", "球芽甘藍", "大頭菜", "娃娃菜", "慈菇", "荸薺", "馬蘭頭", "蕨菜","絲瓜",
}

animals: Set[str] = {
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

REQUIRED_FIELDS_IN_ORDER: list[str] = [
    "CDR_SUM",
    "MMSE",
    "MEMORY_DECLINE",
    "VEGETABLE_COUNT",
    "ANIMAL_COUNT",
    "TRAIL_B_SECONDS",
    "TRAIL_A_SECONDS",
    "CDR_GLOB",
    "CDR_MEMORY",
]

for vocab in vegetables | animals:
    jieba.add_word(vocab)

# =========================
# 逐 chunk 推論：修正 InvalidDataError
# =========================
# 問題說明：MediaRecorder 產生的 webm/opus 分段，後續片段常缺乏容器頭，
# PyAV(av.open) 會丟 InvalidDataError。解法：先用 FFmpeg 把分段「解碼成 PCM」再丟入模型。
# （WhisperModel 支援 numpy float32 + sampling_rate）

FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")  # 可用環境變數指定 ffmpeg 路徑（Windows 友善）

audio_chunks: Dict[str, Dict[int, bytes]] = {}
partial_text_store: Dict[str, Dict[int, str]] = defaultdict(dict)
transcribe_lock = threading.Lock()


class ChunkTranscribeOptions:
    def __init__(self, language: str = "zh", beam_size: int = 1, use_vad: bool = False):
        self.language = language
        self.beam_size = beam_size
        self.use_vad = use_vad


def _decode_with_pyav_or_raise(audio_bytes: bytes) -> Optional[bytes]:
    """若 bytes 可被 PyAV 直接打開，回傳原 bytes；否則回 None。單一職責，最小作用域。"""
    try:
        # 只測試能否被 av.open 解；若可解，就直接回傳 bytes 給 whisper 使用。
        import av  # 延遲載入，避免環境沒有 PyAV 時影響啟動
        with av.open(BytesIO(audio_bytes), mode="r", metadata_errors="ignore"):
            return audio_bytes
    except Exception:
        return None


def _decode_to_pcm_f32_bytes(audio_bytes: bytes, target_hz: int = 16000, channels: int = 1) -> bytes:
    """用 FFmpeg 將任意容器/編碼解成 float32 PCM，回傳裸資料（f32le）。
    - 優點：不依賴分段是否自含 header；FFmpeg 解析力較強。
    - 失敗時丟出例外，呼叫端捕捉。
    """
    cmd = [
        FFMPEG_PATH,
        "-hide_banner",
        "-loglevel",
        "error",
        "-fflags",
        "+genpts+igndts",
        "-i",
        "pipe:0",
        "-ac",
        str(channels),
        "-ar",
        str(target_hz),
        "-f",
        "f32le",
        "pipe:1",
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, err = proc.communicate(input=audio_bytes)
    if proc.returncode != 0 or not out:
        raise RuntimeError(f"FFmpeg decode failed: code={proc.returncode}, err={err.decode('utf-8', 'ignore')}")
    return out


def _pcm_bytes_to_float32_array(pcm_f32_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(pcm_f32_bytes, dtype=np.float32)
    return arr  # 單聲道 f32le


def transcribe_chunk_bytes(audio_bytes: bytes, options: ChunkTranscribeOptions) -> str:
    # Early return：太短的 chunk 直接略過
    if len(audio_bytes) < 1024:
        return ""

    # 路徑 A：可被 PyAV 直接解的情況，維持原先走法（較快）
    direct = _decode_with_pyav_or_raise(audio_bytes)
    if direct is not None:
        with transcribe_lock:
            segments, _ = speech_model.transcribe(
                BytesIO(direct),
                language=options.language,
                beam_size=options.beam_size,
                vad_filter=options.use_vad,
                vad_parameters={"min_silence_duration_ms": 1000},
                word_timestamps=False,
            )
        return "".join(seg.text for seg in segments)

    # 路徑 B：PyAV 失敗 → FFmpeg 解碼為 PCM → numpy → 直接給 Whisper（最穩）
    pcm_bytes = _decode_to_pcm_f32_bytes(audio_bytes, target_hz=16000, channels=1)
    samples = _pcm_bytes_to_float32_array(pcm_bytes)

    with transcribe_lock:
        segments, _ = speech_model.transcribe(
            samples,
            sampling_rate=16000,
            language=options.language,
            beam_size=options.beam_size,
            vad_filter=options.use_vad,
            vad_parameters={"min_silence_duration_ms": 1000},
            word_timestamps=False,
        )
    return "".join(seg.text for seg in segments)

def parse_and_validate_features(request_json: dict) -> list[float]:
    """
    從 JSON 取值並轉為 float list，順序與訓練一致。
    - 單一職責：只負責輸入解析與驗證。
    - Early Return：任何錯誤立即拋出 400。
    """
    if not isinstance(request_json, dict):
        abort(400, description="請提供 JSON 物件作為輸入")

    feature_values: list[float] = []
    for field_name in REQUIRED_FIELDS_IN_ORDER:
        if field_name not in request_json:
            abort(400, description=f"缺少欄位: {field_name}")
        try:
            numeric_value = float(request_json[field_name])
        except (TypeError, ValueError):
            abort(400, description=f"欄位格式錯誤: {field_name} 必須為數值")
        feature_values.append(numeric_value)

    if np.isnan(np.asarray(feature_values, dtype=float)).any():
        abort(400, description="輸入包含 NaN，請提供完整數值")

    return feature_values


def validate_feature_count_against_model(feature_values: list[float]) -> None:
    """
    檢查輸入特徵數是否符合模型訓練時設定。
    - 單一職責：只負責比對數量；若不合則拋 ValueError（由上層決定回應）。
    """
    model = load_trained_model()
    if hasattr(model, "n_features_in_"):
        expected_feature_count = int(model.n_features_in_)
        actual_feature_count = len(feature_values)
        if actual_feature_count != expected_feature_count:
            raise ValueError(
                f"特徵數不符：模型需要 {expected_feature_count} 個特徵，但收到 {actual_feature_count} 個。"
            )


def make_prediction_response(predicted_label: int, positive_probability: float) -> dict:
    """
    將預測結果整理為可序列化的回應。
    - 單一職責：只負責輸出結構化。
    """
    return {
        "prediction": int(predicted_label),
        "probability": float(positive_probability),
    }

# =========================
# 認證：登入 API（保持原行為）
# =========================
@api.route("/login")
class Login(Resource):
    def post(self):
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        user = Patient.query.filter_by(Patient_ID=username).first()
        if not user or user.password != password:
            abort(401, description="帳號或密碼錯誤")

        score = ScoreView.query.filter_by(Patient_ID=username).first()
        if not score:
            scores = {"CDR_SUM": None, "MMSE_Score": None, "MEMORY": None, "CDRGLOB": None}
        else:
            scores = {
                "CDR_SUM": score.CDR_SUM,
                "MMSE_Score": score.MMSE_Score,
                "MEMORY": score.MEMORY,
                "CDRGLOB": score.CDRGLOB,
            }

        user_data = {
            "name": user.Name,
            "gender": user.Gender,
            "birth_year": user.Birthyr,
            **scores,
        }

        access_token = create_access_token(identity=username)
        return {"token": access_token, "user": user_data}

# =========================
# 上傳分段：立即嘗試轉錄並暫存文字（穩定版）
# =========================
# 簡單十六進位預覽，協助診斷是不是有效容器起始（如 EBML 1A45DFA3 或 OggS）
def hexdump_prefix(b: bytes, n: int = 8) -> str:
    return binascii.hexlify(b[:n]).decode('ascii')

# ---- 在 /speech_upload_chunk 內部調整 ----
@api.route('/speech_upload_chunk')
class SpeechUploadChunk(Resource):
    def post(self):
        recording_id = request.form['recording_id']
        chunk_index = int(request.form['chunk_index'])
        audio_file = request.files['audio_chunk']

        audio_bytes = audio_file.read()
        if not audio_bytes:
            return {'ok': False, 'skipped': True, 'reason': 'empty_chunk'}, 200

        # 緩存原始 bytes（finalize 可備援用）
        if recording_id not in audio_chunks:
            audio_chunks[recording_id] = {}
        audio_chunks[recording_id][chunk_index] = audio_bytes

        # 診斷資訊
        app.logger.info(
            f"chunk rid={recording_id} idx={chunk_index} size={len(audio_bytes)} "
            f"mimetype={audio_file.mimetype} head={hexdump_prefix(audio_bytes)}"
        )

        # 每個 chunk 都嘗試轉錄；失敗不炸 server，存空字串即可
        try:
            options = ChunkTranscribeOptions(language='zh', beam_size=1, use_vad=False)
            chunk_text = transcribe_chunk_bytes(audio_bytes, options)  # 內含 transcribe_lock 與 ffmpeg fallback
            if recording_id not in partial_text_store:
                partial_text_store[recording_id] = {}
            partial_text_store[recording_id][chunk_index] = chunk_text
            return {'ok': True, 'text_len': len(chunk_text)}
        except Exception:
            app.logger.exception(
                f"Chunk transcribe failed: recording_id={recording_id}, chunk_index={chunk_index}"
            )
            if recording_id not in partial_text_store:
                partial_text_store[recording_id] = {}
            partial_text_store[recording_id][chunk_index] = ''  # 降級：保留索引，避免 finalize KeyError
            return {'ok': False, 'skipped': True, 'reason': 'decode_failed'}, 200


# =========================
# 結束彙整：把所有 chunk 的文字串起來，做關鍵字統計
# =========================
@api.route("/speech_test_finalize")
class SpeechTestFinalize(Resource):
    def post(self):
        recording_id = request.form["recording_id"]
        test_type = request.form.get("type")

        if test_type not in ("vegetables", "animals"):
            abort(400, description="參數錯誤：未知的測驗類型")

        # 既有的「已轉錄文字」與「原始 bytes 」
        texts_map = partial_text_store.get(recording_id, {})          # {index: text or ''}
        chunks_map = audio_chunks.get(recording_id, {})               # {index: bytes}

        # 兩者都沒有就早退
        if not texts_map and not chunks_map:
            return {"total": 0, "detail": {}, "chunks": 0}

        # 以索引聯集為準，確保每個片段都被處理
        ordered_indices = sorted(set(texts_map.keys()) | set(chunks_map.keys()))

        full_text_parts = []
        transcribe_options = ChunkTranscribeOptions(language="zh", beam_size=1, use_vad=False)

        for idx in ordered_indices:
            # 先用已存在的文字；若是空字串，再用 bytes 轉錄一次
            chunk_text = texts_map.get(idx, "")
            if not chunk_text:
                audio_bytes = chunks_map.get(idx)
                if audio_bytes:
                    try:
                        chunk_text = transcribe_chunk_bytes(audio_bytes, transcribe_options)
                    except Exception as ex:
                        app.logger.exception(
                            f"Finalize transcribe failed: recording_id={recording_id}, chunk_index={idx}"
                        )
                        chunk_text = ""  # 失敗就跳過該片段
            full_text_parts.append(chunk_text)

        full_text = "".join(full_text_parts)

        keywords = vegetables if test_type == "vegetables" else animals
        word_set = set(jieba.lcut(full_text))
        detail = {w: 1 for w in word_set if w in keywords}
        total = len(detail)

        # 清理暫存
        partial_text_store.pop(recording_id, None)
        audio_chunks.pop(recording_id, None)

        return {"total": total, "detail": detail, "chunks": len(ordered_indices)}

@api.route('/trail_making_test_a_result')
class TrailMakingTestAResultApi(Resource):
    @jwt_required()
    def post(self):
        data = request.get_json()
        if not data:
            abort(400, description="缺少資料")

        user_id = data.get('user_id')
        duration = data.get('duration')
        errors = data.get('errors')
        if user_id is None or duration is None or errors is None:
            abort(400, description="缺少欄位")

        try:
            result = TrailMakingTestAResult(
                user_id=str(user_id),
                duration=float(duration),
                errors=int(errors)
            )
            db.session.add(result)
            db.session.commit()
        except Exception:
            db.session.rollback()
            abort(500, description="資料庫錯誤")

        return {"status": "ok"}, 201


@api.route('/trail_making_test_b_result')
class TrailMakingTestBResultApi(Resource):
    @jwt_required()
    def post(self):
        data = request.get_json()
        if not data:
            abort(400, description="缺少資料")

        user_id = data.get('user_id') or get_jwt_identity()
        duration = data.get('duration')
        errors = data.get('errors')
        if duration is None or errors is None or user_id is None:
            abort(400, description="缺少欄位")

        try:
            result = TrailMakingTestBResult(
                user_id=str(user_id),
                duration=float(duration),
                errors=int(errors)
            )
            db.session.add(result)
            db.session.commit()
        except Exception:
            db.session.rollback()
            abort(500, description="資料庫錯誤")

        return {"status": "ok"}, 20


# =========================
# 模型預測
# =========================
@api.route('/predict')
class Predict(Resource):
    @jwt_required()
    def post(self):
        # Content-Type 檢查
        if not request.is_json:
            abort(400, description="Content-Type 必須是 application/json")

        request_json = request.get_json(silent=True)
        if request_json is None:
            abort(400, description="缺少或無法解析 JSON 內容")

        # 解析與基本驗證
        feature_values = parse_and_validate_features(request_json)

        # 先比對特徵數量（可避免後續一連串 AttributeError/ValueError）
        try:
            validate_feature_count_against_model(feature_values)
        except ValueError as ve:
            abort(400, description=str(ve))

        # 執行推論
        try:
            predicted_label, positive_probability = predict_with_probability(feature_values)
            return make_prediction_response(predicted_label, positive_probability)
        except FileNotFoundError:
            abort(500, description="模型檔案不存在，請聯繫系統管理員")
        except Exception as ex:
            # 對外訊息簡潔；詳細錯誤記進日誌（含 traceback）
            logging.error("Inference failed with exception: %r", ex)
            logging.error("Traceback:\n%s", traceback.format_exc())
            abort(500, description="推論失敗：服務端錯誤，請聯繫系統管理員。")


# =========================
# 錯誤處理
# =========================
@app.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({"error": e.description}), e.code


@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.exception("Unhandled exception")
    return jsonify({"error": "Internal Server Error"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)

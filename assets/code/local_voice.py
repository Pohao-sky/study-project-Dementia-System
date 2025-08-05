import collections
import io
import logging
import queue
import threading
import typing
import wave
from io import BytesIO

import pyaudio
import webrtcvad
from faster_whisper import WhisperModel
import jieba

logging.basicConfig(level=logging.INFO,
                    format='%(name)s - %(levelname)s - %(message)s')


# 動物與蔬菜關鍵詞表
VEGETABLE_WORDS = set([
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
])
ANIMAL_WORDS = set([
    "貓", "鼠","老鼠", "大象", "獅子", "虎","老虎", "台灣獼猴","猴","猴子", "馬", "牛", "羊","犀牛","無尾熊","豹","獵豹","花豹","黑豹",
    "豬", "兔子", "兔", "狐狸", "狼", "駱駝", "袋鼠", "熊", "熊貓", "松鼠", "鼴鼠", "天竺鼠", "荷蘭豬","鬥牛",
    "浣熊", "豪豬", "刺蝟", "斑馬", "綿羊", "山羊", "羚羊", "山豬", "土撥鼠", "水牛", "蝙蝠", "白虎",
    "馴鹿", "北極熊" , "台灣黑熊" , "棕熊", "黑猩猩", "狒狒","猩猩", "金絲猴", "金剛", "狸貓", "鼬", "水獺", "山貓",

    "狗", "柴犬", "哈士奇", "黃金獵犬", "拉布拉多", "吉娃娃", "臘腸狗", "牧羊犬" , "邊牧", "鬥牛犬", "博美", "薩摩耶", "獒犬","藏獒",
    "鬣狗","斑鬣狗",

    "鳥", "雞", "鴨", "鵝", "貓頭鷹" , "老鷹" , "遊隼", "孔雀", "鸚鵡", "鴿子", "鴛鴦", "喜鵲", "夜鶯", "啄木鳥",
    "燕子", "麻雀", "烏鴉", "企鵝", "皇帝企鵝", "國王企鵝", "駝鳥", "雉雞", "野雞", "白鷺鷥","海鷗",

    "蛇", "雨傘節" , "百步蛇" , "龜殼花" , "眼鏡蛇" , "青竹絲" , "響尾蛇" , "鎖鏈蛇", "烏龜", "蜥蜴", "變色龍", "青蛙", "蟾蜍","壁虎",
    "科莫多龍","科莫多巨蜥",
    

    "甲蟲", "獨角仙", "鍬形蟲", "大兜蟲", "蜜蜂", "虎頭蜂", "螞蟻", "紅火蟻", "白蟻" , "行軍蟻" , "軍蟻" , "子彈蟻" , "蜜蟻" , "切葉蟻", "白蟻", "蜻蜓", "水蠆", "蒼蠅", 
    "孑孓","蚊子", "螢火蟲", "瓢蟲","蝗蟲", "蚱蜢", "螳螂","蜘蛛", "蟋蟀", "蚯蚓", "蠍子", "跳蛛", "幽靈蛛", "獵人蛛", "蝴蝶", 
    "鳳蝶", "紋白蝶", "禪", "螽斯","蟈蟈","米蟲", "蜈蚣", "蟑螂","蟒蛇", "黃金蟒","蚰蜒",

    "魚", "鯨魚", "鯊魚", "章魚", "海豚", "水母", "海馬", "河馬", "海星", "海豹", "海獅", "海龜", "海狗", "魟", "垃圾魚", "清道夫",
    "鱷魚", "白鯨" , "藍鯨", "虎鯨", "殺人鯨", "沙丁魚", "比目魚", "鱔魚", "蝦子", "龍蝦", "熱帶魚",
    "螃蟹" , "寄居蟹", "水蛭", "海兔",

    "鸚鵡螺", "小熊貓", "蝸牛", "蛞蝓", "食蟻獸", "福壽螺",
])


def choose_category():
    while True:
        cat = input("請選擇測驗類別 (1)蔬菜 (2)動物：")
        if cat == "1":
            print("你選擇了蔬菜。")
            return VEGETABLE_WORDS, "蔬菜"
        elif cat == "2":
            print("你選擇了動物。")
            return ANIMAL_WORDS, "動物"
        else:
            print("請輸入1或2。")


def count_unique_keywords(text, keyword_set, answered_set):
    # jieba 分詞
    words = set(jieba.cut(text))
    found = {w for w in words if w in keyword_set and w not in answered_set}
    answered_set.update(found)
    return len(answered_set), found


class Queues:
    audio = queue.Queue()
    text = queue.Queue()


class Transcriber(threading.Thread):
    def __init__(
            self,
            model_size: str,
            device: str = "auto",
            compute_type: str = "default",
            prompt: str = ''
    ) -> None:
        super().__init__()
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.prompt = prompt

    def __enter__(self) -> 'Transcriber':
        self._model = WhisperModel(self.model_size,
                                   device=self.device,
                                   compute_type=self.compute_type)
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        pass

    def __call__(self, audio: bytes) -> typing.Generator[str, None, None]:
        segments, info = self._model.transcribe(BytesIO(audio),
                                                language="zh",
                                                initial_prompt=self.prompt,
                                                vad_filter=True)
        for segment in segments:
            t = segment.text
            if self.prompt and self.prompt in t.strip():
                continue
            if t.strip().replace('.', ''):
                yield t

    def run(self):
        while True:
            audio = Queues.audio.get()
            text = ''
            for seg in self(audio):
                logging.info(seg)
                text += seg
            Queues.text.put(text)


class AudioRecorder(threading.Thread):
    """ Audio recorder.
    Args:
        channels (int, 可选): 通道數，預設1（單聲道）。
        rate (int, 可选): 取樣率，預設16000 Hz。
        chunk (int, 可选): 緩衝區中的幀數，預設256。
        frame_duration (int, 可选): 每幀的持續時間（ms），預設30。
    """

    def __init__(self,
                 channels: int = 1,
                 sample_rate: int = 16000,
                 chunk: int = 256,
                 frame_duration: int = 30) -> None:
        super().__init__()
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk = chunk
        self.frame_size = (sample_rate * frame_duration // 1000)
        self.__frames: typing.List[bytes] = []

    def __enter__(self) -> 'AudioRecorder':
        self.vad = webrtcvad.Vad()
        self.vad.set_mode(1)

        self.audio = pyaudio.PyAudio()
        self.sample_width = self.audio.get_sample_size(pyaudio.paInt16)
        self.stream = self.audio.open(format=pyaudio.paInt16,
                                      channels=self.channels,
                                      rate=self.sample_rate,
                                      input=True,
                                      frames_per_buffer=self.chunk)
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self.stream.stop_stream()
        self.stream.close()
        self.audio.terminate()

    def __bytes__(self) -> bytes:
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(self.sample_width)
            wf.setframerate(self.sample_rate)
            wf.writeframes(b''.join(self.__frames))
            self.__frames.clear()
        return buf.getvalue()

    def run(self):
        """ Record audio until silence is detected. """
        MAXLEN = 30
        watcher = collections.deque(maxlen=MAXLEN)
        triggered, ratio = False, 0.5
        while True:
            frame = self.stream.read(self.frame_size)
            is_speech = self.vad.is_speech(frame, self.sample_rate)
            watcher.append(is_speech)
            self.__frames.append(frame)
            if not triggered:
                num_voiced = len([x for x in watcher if x])
                if num_voiced > ratio * watcher.maxlen:
                    logging.info("start recording...")
                    triggered = True
                    watcher.clear()
                    self.__frames = self.__frames[-MAXLEN:]
            else:
                num_unvoiced = len([x for x in watcher if not x])
                if num_unvoiced > ratio * watcher.maxlen:
                    logging.info("stop recording...")
                    triggered = False
                    Queues.audio.put(bytes(self))
                    logging.info("audio task number: {}".format(
                        Queues.audio.qsize()))


def main():
    try:
        # 1. 選擇測驗類別
        KEYWORDS, cat_name = choose_category()
        answered_set = set()

        # 2. 啟動錄音與語音辨識
        with AudioRecorder(channels=1, sample_rate=16000) as recorder:
            with Transcriber(model_size="large-v2") as transcriber:
                recorder.start()
                transcriber.start()
                print(f"開始測驗！請大聲講出{cat_name}名稱（可多次錄音，多次累計）。Ctrl+C 可結束。")

                while True:
                    text = Queues.text.get()
                    if text:
                        total, found = count_unique_keywords(text, KEYWORDS, answered_set)
                        if found:
                            print(f"\n辨識到新{cat_name}名稱：{'、'.join(found)}")
                        print(f"目前累計唯一{cat_name}名稱數量：{total}\n")

    except KeyboardInterrupt:
        print("\n測驗結束。")
        print(f"你總共講了 {len(answered_set)} 個唯一{cat_name}名稱：")
        print('、'.join(answered_set))
    except Exception as e:
        logging.error(e, exc_info=True, stack_info=True)


if __name__ == "__main__":
    main()

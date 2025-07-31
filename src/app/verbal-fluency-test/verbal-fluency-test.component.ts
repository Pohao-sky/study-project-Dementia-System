import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-verbal-fluency-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verbal-fluency-test.component.html',
  styleUrl: './verbal-fluency-test.component.scss'
})
export class VerbalFluencyTestComponent {
[x: string]: any;
  @Input() type: 'animals' | 'vegetables' = 'animals';  // 測驗種類
  @Input() title: string = '語詞流暢性測驗';              // 顯示標題
  @Input() disabled = false;
  @Output() testComplete = new EventEmitter<any>();

  timer = 60;
  intervalId: any = null;
  recording = false;
  done = false;
  result: any = null;

  mediaRecorder: any;
  chunkIndex = 0;
  recordingId = '';
  audioChunks: Blob[] = [];

  async startTest() {
    if (this.disabled || this.recording) return;
    this.timer = 60;
    this.done = false;
    this.result = null;
    this.recording = true;
    this.chunkIndex = 0;

    await this.startRecording();
    this.countdown();
  }

  stopRecording() {
    if (this.mediaRecorder && this.recording) {
      this.mediaRecorder.stop();
      this.recording = false;
      this.finalizeTest();
    }
  }

  countdown() {
    this.intervalId = setInterval(() => {
      this.timer--;
      if (this.timer <= 0) {
        clearInterval(this.intervalId);
        this.stopRecording();
      }
    }, 1000);
  }

  getKeys(obj: any): string[] {
    if (!obj) return [];
    return Object.keys(obj);
  }

  async startRecording() {
    this.recordingId = Date.now().toString();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];
    let mimeType = 'audio/wav';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
    }
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e: any) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
        // 根據 mimeType 設定副檔名
        const ext = mimeType === 'audio/webm' ? 'webm' : 'wav';
        this.uploadChunk(e.data, this.chunkIndex, ext);
        this.chunkIndex++;
      }
    };
    this.mediaRecorder.start(2000); // 每2秒觸發dataavailable
  }

  async uploadChunk(blob: Blob, chunkIndex: number, ext: string) {
    const formData = new FormData();
    formData.append('audio_chunk', blob, `chunk${chunkIndex}.${ext}`);
    formData.append('chunk_index', chunkIndex.toString());
    formData.append('recording_id', this.recordingId);
    formData.append('type', this.type);
    try {
      await fetch('http://localhost:3000/speech_upload_chunk', { method: 'POST', body: formData });
    } catch (err) {
      alert('上傳語音片段失敗');
    }
  }

  async finalizeTest() {
    const formData = new FormData();
    formData.append('recording_id', this.recordingId);
    formData.append('type', this.type);
    try {
      const resp = await fetch('http://localhost:3000/speech_test_finalize', { method: 'POST', body: formData });
      const res = await resp.json();
      if (res.error) throw new Error(res.error);
      this.result = res;
      this.done = true;
      this.testComplete.emit(res);
    } catch (err: any) {
      alert('語音分析失敗：' + err.message);
    }
  }
}

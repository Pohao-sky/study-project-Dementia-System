import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, NgZone, ChangeDetectorRef } from '@angular/core';
import { User } from '../models/user';
import { ApiService } from '../service/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-verbal-fluency-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verbal-fluency-test.component.html',
  styleUrl: './verbal-fluency-test.component.scss'
})
export class VerbalFluencyTestComponent {
  user: User | null = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.api.userInfo) {
      this.user = this.api.userInfo;
    } else {
      const userJson = localStorage.getItem('userInfo');
      if (userJson) this.user = JSON.parse(userJson);
    }
    if (!this.user) this.router.navigate(['/login']);
  }

  @Input() type: 'animals' | 'vegetables' = 'animals';
  @Input() title: string = '語詞流暢性測驗';
  @Input() disabled = false;
  @Output() testComplete = new EventEmitter<any>();

  countdownSeconds = 60;
  countdownTimerId: any = null;
  isRecording = false;
  isDone = false;
  analyzeResult: any = null;

  // 錄音與分段
  private audioStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunkRotateTimer: any = null;
  private readonly chunkLengthMs = 20000; // 每 20 秒一段

  currentChunkIndex = 0;
  currentRecordingId = '';
  chosenMimeType = '';

  // 上傳控制
  private pendingUploads = 0;
  private hasFinalized = false;

  // === 公開操作 ===
  async startTest() {
    if (this.disabled || this.isRecording) return;

    this.resetTestState();
    this.isRecording = true;
    this.currentRecordingId = Date.now().toString();

    await this.initStreamAndStartFirstRecorder();
    this.startCountdown();
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;

    // 停止輪換計時器 + 停止當前 recorder（會觸發 onstop → 送出最後一段）
    if (this.chunkRotateTimer) clearTimeout(this.chunkRotateTimer);
    this.chunkRotateTimer = null;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // === 錄音初始化與「每段重開」邏輯 ===
  private async initStreamAndStartFirstRecorder() {
    this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chosenMimeType = this.pickPreferredMimeType();
    this.currentChunkIndex = 0;
    await this.startNewRecorderChunk(); // 啟動第一段
  }

  private async startNewRecorderChunk() {
    if (!this.audioStream) return;

    // 建立新的 MediaRecorder（確保這一段最後 stop() 產出的 Blob 有完整容器）
    this.mediaRecorder = this.chosenMimeType
      ? new MediaRecorder(this.audioStream, { mimeType: this.chosenMimeType })
      : new MediaRecorder(this.audioStream);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (!event.data || event.data.size === 0) return;
      const fileExtension = this.resolveFileExtension(this.chosenMimeType);
      this.uploadChunk(event.data, this.currentChunkIndex, fileExtension);
      this.currentChunkIndex++;
    };

    this.mediaRecorder.onstop = async () => {
      // 這一段的 Blob 已送出（ondataavailable），若仍在錄音狀態且倒數未結束 → 立刻開下一段
      if (this.isRecording && this.countdownSeconds > 0) {
        await this.startNewRecorderChunk(); // 串接下一段
      } else {
        // 錄音流程真正結束：釋放資源、等待所有上傳完、finalize
        this.audioStream?.getTracks().forEach(t => t.stop());
        await this.waitForAllUploads();
        if (!this.hasFinalized) {
          this.hasFinalized = true;
          await this.finalizeTest();
          this.zone.run(() => this.cdr.markForCheck());
        }
      }
    };

    // 開始錄本段，並在 chunkLengthMs 後自動 stop → 產生 Blob → onstop 內啟動下一段
    this.mediaRecorder.start(); // 不用 timeslice
    if (this.chunkRotateTimer) clearTimeout(this.chunkRotateTimer);
    this.chunkRotateTimer = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
    }, this.chunkLengthMs);
  }

  private pickPreferredMimeType(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const mime of candidates) {
      if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return ''; // 使用瀏覽器預設（部分瀏覽器仍可用）
  }

  private resolveFileExtension(mimeType: string): string {
    if (mimeType.startsWith('audio/webm')) return 'webm';
    if (mimeType.startsWith('audio/ogg')) return 'ogg';
    return 'webm';
  }

  // === 倒數 ===
  private startCountdown() {
    this.clearCountdown();
    this.countdownTimerId = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this.clearCountdown();
        this.stopRecording(); // 觸發當前段 stop → onstop → finalize
      }
    }, 1000);
  }

  private clearCountdown() {
    if (this.countdownTimerId) clearInterval(this.countdownTimerId);
    this.countdownTimerId = null;
  }

  // === 上傳與彙整 ===
  private async uploadChunk(blob: Blob, chunkIndex: number, fileExtension: string) {
    const formData = new FormData();
    formData.append('audio_chunk', blob, `c${chunkIndex}.${fileExtension}`);
    formData.append('chunk_index', String(chunkIndex));
    formData.append('recording_id', this.currentRecordingId);
    formData.append('type', this.type);

    try {
      this.pendingUploads++;
      await fetch('http://localhost:3000/speech_upload_chunk', { method: 'POST', body: formData });
    } catch {
      console.warn('上傳語音片段失敗');
    } finally {
      this.pendingUploads--;
    }
  }

  private waitForAllUploads(): Promise<void> {
    return new Promise((resolve) => {
      const tick = () => {
        if (this.pendingUploads === 0) return resolve();
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  private async finalizeTest() {
    const formData = new FormData();
    formData.append('recording_id', this.currentRecordingId);
    formData.append('type', this.type);

    try {
      const response = await fetch('http://localhost:3000/speech_test_finalize', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      this.analyzeResult = result;
      this.isDone = true;
      this.testComplete.emit(result);
    } catch (error: any) {
      alert('語音分析失敗：' + (error?.message ?? 'unknown'));
    } finally {
      this.mediaRecorder = null;
    }
  }

  // === 工具 ===
  private resetTestState() {
    this.clearCountdown();
    if (this.chunkRotateTimer) clearTimeout(this.chunkRotateTimer);
    this.chunkRotateTimer = null;

    this.isDone = false;
    this.analyzeResult = null;

    this.currentChunkIndex = 0;
    this.chosenMimeType = '';
    this.pendingUploads = 0;
    this.hasFinalized = false;
  }

  getKeys(object: any): string[] {
    if (!object) return [];
    return Object.keys(object);
  }
}

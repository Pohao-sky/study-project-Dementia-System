import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { User } from '../../models/user';
import { TrailMakingALine, TrailMakingANode } from '../../models/trail-making';
import { PointerInputService } from '../../service/pointer-input.service';
import { NormalizedPointerEvent } from '../../models/pointer-input';
import { GuestAuthService } from '../../service/guest-auth.service';

@Component({
  selector: 'app-trail-making-test-a-page',
  imports: [CommonModule],
  templateUrl: './trail-making-test-a-page.component.html',
  styleUrl: './trail-making-test-a-page.component.scss'
})
export class TrailMakingTestAPageComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvasContext!: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver | null = null;
  private devicePixelRatio = window.devicePixelRatio || 1;

  // 修改：調整為直向比例 (類似 A4 或圖片比例)
  private readonly baseWidth = 540;
  private readonly baseHeight = 750;
  private logicalWidth = this.baseWidth;
  private logicalHeight = this.baseHeight;

  // 修改：總數改為 20 以符合圖片 (若需 25 可再新增座標)
  private readonly totalNodeCount = 20;
  private readonly desktopNodeRadius = 24; // 稍微縮小一點以適應密集度
  private readonly mobileNodeRadius = 30;
  private nodeRadius = this.desktopNodeRadius;

  nodes: TrailMakingANode[] = [];
  lines: TrailMakingALine[] = [];
  dragging = false;
  lastNode: TrailMakingANode | null = null;
  currentPath: number[] = [];
  private activePointerId: number | null = null;

  startTime: number | null = null;
  endTime: number | null = null;
  timerInterval: ReturnType<typeof setInterval> | null = null;
  errorCount = 0;

  // 修改：預設為 true 以便隨時偵測點擊，但計時器尚未開始
  started = true;
  isTimerRunning = false; // 新增：用來判斷是否正式開始計時

  timerDisplay = '0.0';
  canProceed = false;

  showRules = true;
  rulesMessage = "【遊戲規則】\n" +
  "1. 請依序由小到大 (1 -> 2 -> 3...) 連線。\n" +
  "2. 點擊「數字 1」並開始拖曳時，系統將自動開始計時。\n" +
  "3. 完成所有連線後，將顯示花費時間與錯誤次數。\n\n" +
  "請按「確定」後，直接點擊畫面上的 ① 開始！";

  showIncompleteWarning: boolean = false;
  private isMobileLayout = false;
  user: User | null = null;
  private readonly storageKey = 'trailMakingTestAResult';
  private readonly guestAuth = inject(GuestAuthService);

  constructor(
    private loginService: LoginService,
    private router: Router,
    private pointerInputService: PointerInputService
  ) {}

  ngOnInit(): void {
    if (!this.hasActiveSession()) {
      this.router.navigate(['/login'], { state: { reason: 'relogin' } });
    }
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.canvasContext = canvas.getContext('2d')!;
    this.updateCanvasSize();
    // 移除 restoreResult() 以確保每次進來都是新的測驗狀態，或者保留看你需求
    // this.restoreResult();
    this.resetTest();

    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
      this.drawAll();
    });
    this.resizeObserver.observe(canvas);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  resetTest() {
    this.nodes = [];
    this.lines = [];
    this.dragging = false;
    this.lastNode = null;
    this.currentPath = [];
    this.startTime = null;
    this.endTime = null;
    this.errorCount = 0;
    this.isTimerRunning = false;
    this.canProceed = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.setupNodes();
    this.drawAll();
    this.timerDisplay = '0.0';
  }

  closeRules() {
    this.showRules = false;
  }

  private updateTimerDisplay() {
    if (this.startTime && !this.endTime) {
      this.timerDisplay = ((Date.now() - this.startTime) / 1000).toFixed(1);
    } else if (this.startTime && this.endTime) {
      this.timerDisplay = ((this.endTime - this.startTime) / 1000).toFixed(1);
    } else {
      this.timerDisplay = '0.0';
    }
  }

  // 修改：使用固定座標 (基於 540x750 的畫布模擬圖片位置)
  private getFixedCoordinates(): { x: number, y: number }[] {
    return [
      { x: 380, y: 360 }, // 1 (Begin)
      { x: 260, y: 440 }, // 2
      { x: 440, y: 510 }, // 3
      { x: 430, y: 230 }, // 4
      { x: 210, y: 240 }, // 5
      { x: 310, y: 310 }, // 6
      { x: 210, y: 370 }, // 7
      { x: 100, y: 460 }, // 8
      { x: 140, y: 550 }, // 9
      { x: 190, y: 470 }, // 10
      { x: 340, y: 600 }, // 11
      { x: 50,  y: 630 }, // 12
      { x: 100, y: 310 }, // 13
      { x: 60,  y: 60 },  // 14 (Top Left)
      { x: 100, y: 160 }, // 15
      { x: 270, y: 40 },  // 16 (Top Center)
      { x: 380, y: 160 }, // 17
      { x: 480, y: 50 },  // 18 (Top Right)
      { x: 460, y: 660 }, // 19 (Bottom Right)
      { x: 160, y: 700 }, // 20 (End)
    ];
  }

  private setupNodes() {
    const coords = this.getFixedCoordinates();
    // 確保只取設定的數量
    for (let i = 0; i < this.totalNodeCount && i < coords.length; i++) {
      this.nodes.push({ label: i + 1, x: coords[i].x, y: coords[i].y });
    }
    // 這裡不需要 sort，因為固定座標已經照順序排好了，但為了保險起見：
    this.nodes.sort((a, b) => a.label - b.label);
  }

  private drawAll() {
    this.canvasContext.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    this.drawLines();
    this.drawNodes();
    this.drawDraggingLine();
    this.drawLabels(); // 新增：繪製 Begin/End 文字
  }

  // 新增：繪製 Begin 和 End 標示
  private drawLabels() {
    this.canvasContext.save();
    this.canvasContext.fillStyle = '#000';
    this.canvasContext.font = '20px serif';
    this.canvasContext.textAlign = 'center';

    // 1 號上方顯示 Begin
    const node1 = this.nodes.find(n => n.label === 1);
    if (node1) {
      this.canvasContext.fillText('Begin', node1.x, node1.y - this.nodeRadius - 10);
    }

    // 最後一個號碼上方顯示 End
    const nodeEnd = this.nodes.find(n => n.label === this.totalNodeCount);
    if (nodeEnd) {
      this.canvasContext.fillText('End', nodeEnd.x, nodeEnd.y - this.nodeRadius - 10);
    }
    this.canvasContext.restore();
  }

  private drawLines() {
    this.canvasContext.save();
    this.canvasContext.lineWidth = 4;
    this.canvasContext.strokeStyle = '#2186f6';
    this.lines.forEach(line => {
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(line.from.x, line.from.y);
      this.canvasContext.lineTo(line.to.x, line.to.y);
      this.canvasContext.stroke();
    });
    this.canvasContext.restore();
  }

  private drawNodes() {
    this.nodes.forEach(node => {
      this.canvasContext.save();
      this.canvasContext.beginPath();
      this.canvasContext.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
      this.canvasContext.fillStyle = '#fff';
      this.canvasContext.fill();
      this.canvasContext.lineWidth = 2.2;
      this.canvasContext.strokeStyle = '#222';
      this.canvasContext.stroke();
      this.canvasContext.fillStyle = '#222';
      const labelFontSize = this.isMobileLayout ? 24 : 18;
      this.canvasContext.font = `${labelFontSize}px bold sans-serif`;
      this.canvasContext.textAlign = 'center';
      this.canvasContext.textBaseline = 'middle';
      this.canvasContext.fillText(node.label.toString(), node.x, node.y);
      this.canvasContext.restore();
    });
  }

  private drawDraggingLine() {
    if (!this.dragging || !this.lastNode || this.currentPath.length === 0) return;
    this.canvasContext.save();
    this.canvasContext.strokeStyle = '#3bc5f3ff';
    this.canvasContext.lineWidth = 3;
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(this.lastNode.x, this.lastNode.y);
    this.canvasContext.lineTo(this.currentPath[0], this.currentPath[1]);
    this.canvasContext.stroke();
    this.canvasContext.restore();
  }

  private isNodeConnected(node: TrailMakingANode): boolean {
    // 只有當計時開始後，1 號才算被連線 (亮起)
    if (node.label === 1 && this.isTimerRunning) return true;
    return this.lines.some(line => line.from === node || line.to === node);
  }

  private getNodeAt(x: number, y: number): TrailMakingANode | null {
    for (const node of this.nodes) {
      if ((node.x - x) ** 2 + (node.y - y) ** 2 <= this.nodeRadius * this.nodeRadius) return node;
    }
    return null;
  }

  canvasPointerStart(event: MouseEvent | TouchEvent) {
    if (this.dragging) return; // 防止多點觸控干擾
    const pointer = this.pointerInputService.onPointerStart(event);
    if (!pointer) return;
    const coords = this.toCanvasCoordinates(pointer);
    const node = this.getNodeAt(coords.x, coords.y);

    if (!node) return;

    // 邏輯修改：第一次點擊 1 號時，觸發計時開始
    if (!this.isTimerRunning && node.label === 1) {
        this.startTimer();
    }

    if (this.isTimerRunning) {
        if (this.lines.length === 0 && node.label === 1) {
            this.dragging = true;
            this.lastNode = node;
            this.activePointerId = pointer.identifier;
        } else if (this.lines.length > 0 && node.label === this.lines.length + 1) {
            this.dragging = true;
            this.lastNode = node;
            this.activePointerId = pointer.identifier;
        }
    }

    this.drawAll();
  }

  // 新增：獨立的開始計時函式
  private startTimer() {
      localStorage.removeItem(this.storageKey);
      this.isTimerRunning = true;
      this.startTime = Date.now();
      this.timerInterval = setInterval(() => this.updateTimerDisplay(), 100);
  }

  canvasPointerMove(event: MouseEvent | TouchEvent) {
    if (!this.dragging || !this.lastNode || this.activePointerId === null) return;
    const pointer = this.pointerInputService.onPointerMove(event, this.activePointerId);
    if (!pointer) return;
    const coords = this.toCanvasCoordinates(pointer);
    this.currentPath = [coords.x, coords.y];
    this.drawAll();
  }

  canvasPointerEnd(event: MouseEvent | TouchEvent) {
    if (!this.dragging || !this.lastNode || this.activePointerId === null) return;
    const pointer = this.pointerInputService.onPointerEnd(event, this.activePointerId);
    if (!pointer) return;
    const coords = this.toCanvasCoordinates(pointer);
    const nextNode = this.getNodeAt(coords.x, coords.y);
    const expectedLabel = this.lines.length + 2;

    if (nextNode && nextNode.label === expectedLabel && nextNode !== this.lastNode) {
      this.lines.push({ from: this.lastNode, to: nextNode });
      this.lastNode = nextNode;
      if (nextNode.label === this.totalNodeCount) {
        this.finishTest();
      }
    } else if (nextNode && nextNode !== this.lastNode) {
      this.errorCount++; // 記錄錯誤
      alert(`錯誤！你剛連到數字 ${this.lastNode?.label}，下一個要連甚麼?`);
    }
    this.dragging = false;
    this.currentPath = [];
    this.activePointerId = null;
    this.drawAll();
  }

  private finishTest() {
      this.dragging = false;
      this.endTime = Date.now();
      this.updateTimerDisplay();
      if (this.timerInterval !== null) clearInterval(this.timerInterval);

      const duration = (this.endTime - (this.startTime || 0)) / 1000;
      const result = { duration, errors: this.errorCount };

      // 稍微延遲一點讓線條畫完再跳視窗
      setTimeout(() => {
          alert(`完成！總花費時間：${duration.toFixed(1)} 秒\n錯誤次數：${this.errorCount}`);
          localStorage.setItem(this.storageKey, JSON.stringify(result));
          this.canProceed = true;
      }, 50);
  }

  canvasPointerCancel(event: TouchEvent) {
    if (!this.dragging || this.activePointerId === null) return;
    this.pointerInputService.onPointerEnd(event, this.activePointerId);
    this.dragging = false;
    this.currentPath = [];
    this.lastNode = null;
    this.activePointerId = null;
    this.drawAll();
  }

  nextPage() {
    if (!this.canProceed) {
      alert('請先完成測驗');
      this.showIncompleteWarning = true;
      return;
    }
    this.showIncompleteWarning = false;
    this.router.navigate(['/trail-making-test-b']);
  }

  private restoreResult() {
    // 雖然移除了自動 restore 邏輯，但保留此函式結構以防萬一需要
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) return;
    const result = JSON.parse(saved);
    this.timerDisplay = result.duration.toFixed(1);
    this.canProceed = true;
  }

  private toCanvasCoordinates(pointer: NormalizedPointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    return {
      x: ((pointer.clientX - rect.left) * scaleX) / this.devicePixelRatio,
      y: ((pointer.clientY - rect.top) * scaleY) / this.devicePixelRatio
    };
  }

  private updateCanvasSize() {
    const canvas = this.canvasRef.nativeElement;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.isMobileLayout = window.matchMedia('(max-width: 600px)').matches;
    this.nodeRadius = this.isMobileLayout ? this.mobileNodeRadius : this.desktopNodeRadius;

    // 修改：無論手機或桌機，都維持圖片的長寬比邏輯
    this.logicalWidth = this.baseWidth;
    this.logicalHeight = this.baseHeight;

    canvas.width = this.logicalWidth * this.devicePixelRatio;
    canvas.height = this.logicalHeight * this.devicePixelRatio;

    this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    this.canvasContext.scale(this.devicePixelRatio, this.devicePixelRatio);
  }

  private hasActiveSession(): boolean {
    if (this.loginService.userInfo) {
      this.user = this.loginService.userInfo;
      return true;
    }
    return this.guestAuth.isGuestActive;
  }
}

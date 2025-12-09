import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { User } from '../../models/user';
import { TrailMakingBLine, TrailMakingBNode } from '../../models/trail-making';
import { PointerInputService } from '../../service/pointer-input.service';
import { NormalizedPointerEvent } from '../../models/pointer-input';
import { GuestAuthService } from '../../service/guest-auth.service';

@Component({
  selector: 'app-trail-making-test-b-page',
  imports: [CommonModule],
  templateUrl: './trail-making-test-b-page.component.html',
  styleUrl: './trail-making-test-b-page.component.scss'
})
export class TrailMakingTestBPageComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvasContext!: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver | null = null;
  private devicePixelRatio = window.devicePixelRatio || 1;

  // 直向比例 540x750
  private readonly baseWidth = 540;
  private readonly baseHeight = 750;
  private logicalWidth = this.baseWidth;
  private logicalHeight = this.baseHeight;

  private readonly desktopNodeRadius = 24;
  private readonly mobileNodeRadius = 30;
  private nodeRadius = this.desktopNodeRadius;

  // 修改：順序列表只到 10 (End) 和 猴 (I)
  // 對應關係：A=鼠, B=牛, C=虎, D=兔, E=龍, F=蛇, G=馬, H=羊, I=猴
  readonly orderList: { type: 'num' | 'char'; label: string }[] = [
    { type: 'num', label: '1' },   // Begin
    { type: 'char', label: '鼠' }, // A
    { type: 'num', label: '2' },
    { type: 'char', label: '牛' }, // B
    { type: 'num', label: '3' },
    { type: 'char', label: '虎' }, // C
    { type: 'num', label: '4' },
    { type: 'char', label: '兔' }, // D
    { type: 'num', label: '5' },
    { type: 'char', label: '龍' }, // E
    { type: 'num', label: '6' },
    { type: 'char', label: '蛇' }, // F
    { type: 'num', label: '7' },
    { type: 'char', label: '馬' }, // G
    { type: 'num', label: '8' },
    { type: 'char', label: '羊' }, // H
    { type: 'num', label: '9' },
    { type: 'char', label: '猴' }, // I
    { type: 'num', label: '10' }  // End
  ];

  nodes: TrailMakingBNode[] = [];
  lines: TrailMakingBLine[] = [];
  dragging = false;
  lastNode: TrailMakingBNode | null = null;
  currentPath: number[] = [];
  private activePointerId: number | null = null;

  startTime: number | null = null;
  endTime: number | null = null;
  timerInterval: ReturnType<typeof setInterval> | null = null;
  errorCount = 0;

  started = true;
  isTimerRunning = false;

  timerDisplay = '0.0';
  canProceed = false;

  showRules = true;
  rulesMessage =
    "【遊戲規則】\n" +
    "1. 請依序點擊並連線：\n" +
    "   1 → 鼠 → 2 → 牛 → ... → 10\n" +
    "2. 點擊畫面中央的「1」並拖曳時，系統將自動開始計時。\n" +
    "3. 完成全部連線後，將顯示用時與錯誤數。\n\n" +
    "請按「確定」後，直接點擊畫面上的 ① 開始！";

  showCompletionPopup = false;
  completionMessage = '';
  showIncompleteWarning: boolean = false;
  private isMobileLayout = false;
  private readonly guestAuth = inject(GuestAuthService);

  constructor(
    private loginService: LoginService,
    private router: Router,
    private pointerInputService: PointerInputService
  ) {}

  private readonly storageKey = 'trailMakingTestBResult';
  user: User | null = null;

  ngOnInit(): void {
    if (!this.hasActiveSession()) {
      this.router.navigate(['/login'], { state: { reason: 'relogin' } });
    }
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.canvasContext = canvas.getContext('2d')!;
    this.updateCanvasSize();
    this.resetTest();
    // this.restoreResult();

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

  private startTimer() {
    localStorage.removeItem(this.storageKey);
    this.isTimerRunning = true;
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => this.updateTimerDisplay(), 100);
    this.updateTimerDisplay();
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

  private resetTest() {
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
    this.showCompletionPopup = false;
    this.completionMessage = '';
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.setupNodes();
    this.drawAll();
    this.timerDisplay = '0.0';
  }

  // 修改：根據圖片重新對應座標 (19個節點)
  private getFixedCoordinates(): { x: number, y: number }[] {
    return [
      { x: 270, y: 375 }, // 1 (Begin) - 中央
      { x: 340, y: 550 }, // 鼠 (A) - 右下
      { x: 180, y: 560 }, // 2 - 左下
      { x: 270, y: 200 }, // 牛 (B) - 上中
      { x: 400, y: 250 }, // 3 - 右上
      { x: 380, y: 400 }, // 虎 (C) - 右中 (靠近1)
      { x: 480, y: 360 }, // 4 - 右側邊緣
      { x: 420, y: 650 }, // 兔 (D) - 右下角
      { x: 110, y: 640 }, // 5 - 左下角
      { x: 100, y: 440 }, // 龍 (E) - 左側邊緣
      { x: 180, y: 350 }, // 6 - 左中 (靠近1)
      { x: 200, y: 100 }, // 蛇 (F) - 左上
      { x: 380, y: 80  }, // 7 - 右上頂部
      { x: 490, y: 110 }, // 馬 (G) - 右上角
      { x: 500, y: 300 }, // 8 - 右側邊緣 (G下面)
      { x: 500, y: 700 }, // 羊 (H) - 右下底角
      { x: 50,  y: 690 }, // 9 - 左下底角
      { x: 50,  y: 250 }, // 猴 (I) - 左側 (補位，路徑 9->I->10)
      { x: 80,  y: 120 }  // 10 (End) - 左上角
    ];
  }

  private setupNodes() {
    this.nodes = [];
    const coordinates = this.getFixedCoordinates();
    for (let i = 0; i < this.orderList.length; i++) {
      const coord = coordinates[i] || { x: 0, y: 0 };
      const node = { ...this.orderList[i], x: coord.x, y: coord.y } as TrailMakingBNode;
      this.nodes.push(node);
    }
  }

  private drawAll() {
    this.canvasContext.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    this.drawLines();
    this.drawNodes();
    this.drawDraggingLine();
    this.drawLabels();
  }

  private drawLabels() {
    this.canvasContext.save();
    this.canvasContext.fillStyle = '#000';
    this.canvasContext.font = '20px serif';
    this.canvasContext.textAlign = 'center';

    // 1 號上方顯示 Begin
    const node1 = this.nodes.find(n => n.label === '1');
    if (node1) {
      this.canvasContext.fillText('Begin', node1.x, node1.y - this.nodeRadius - 10);
    }

    // 最後一個 (10) 上方顯示 End
    const nodeEnd = this.nodes[this.nodes.length - 1];
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

      this.canvasContext.fillStyle = node.type === 'num' ? '#222' : '#1e50a2';
      const labelFontSize = this.isMobileLayout ? 24 : 19;
      this.canvasContext.font = `${labelFontSize}px bold sans-serif`;
      this.canvasContext.textAlign = 'center';
      this.canvasContext.textBaseline = 'middle';
      this.canvasContext.fillText(node.label, node.x, node.y);
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

  private isNodeConnected(node: TrailMakingBNode): boolean {
    if (node.type === 'num' && node.label === '1' && this.isTimerRunning) return true;
    return this.lines.some(line => line.from === node || line.to === node);
  }

  private getNodeAt(x: number, y: number): TrailMakingBNode | null {
    return this.nodes.find(node => (node.x - x) ** 2 + (node.y - y) ** 2 <= this.nodeRadius ** 2) || null;
  }

  canvasPointerStart(event: MouseEvent | TouchEvent) {
    if (this.dragging) return;
    const pointer = this.pointerInputService.onPointerStart(event);
    if (!pointer) return;
    const coords = this.toCanvasCoordinates(pointer);
    const node = this.getNodeAt(coords.x, coords.y);

    if (!node) return;

    if (!this.isTimerRunning && node.type === 'num' && node.label === '1') {
      this.startTimer();
    }

    if (this.isTimerRunning) {
      if (this.lines.length === 0 && node.type === 'num' && node.label === '1') {
        this.dragging = true;
        this.lastNode = node;
        this.activePointerId = pointer.identifier;
      } else if (this.lines.length > 0) {
        const expected = this.orderList[this.lines.length];
        if (node && node.type === expected.type && node.label === expected.label) {
          this.dragging = true;
          this.lastNode = node;
          this.activePointerId = pointer.identifier;
        }
      }
    }
    this.drawAll();
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
    const expected = this.orderList[this.lines.length + 1];

    if (nextNode && expected && nextNode.type === expected.type && nextNode.label === expected.label && nextNode !== this.lastNode) {
      this.lines.push({ from: this.lastNode, to: nextNode });
      this.lastNode = nextNode;
      if (this.lines.length === this.orderList.length - 1) {
        this.dragging = false;
        this.endTime = Date.now();
        this.updateTimerDisplay();
        if (this.timerInterval !== null) clearInterval(this.timerInterval);
        const duration = (this.endTime - (this.startTime || 0)) / 1000;
        const result = { duration, errors: this.errorCount };
        this.completionMessage =
          `完成！總花費時間：${duration.toFixed(1)} 秒\n\n接下來由醫護人操作，請將裝置交給醫護人員。`;

        setTimeout(() => {
          this.showCompletionPopup = true;
          localStorage.setItem(this.storageKey, JSON.stringify(result));
          this.canProceed = true;
        }, 50);
      }
    } else if (nextNode && nextNode !== this.lastNode) {
      this.errorCount++;
      const actuallyExpected = this.orderList[this.lines.length + 1];
      alert(`錯誤！你剛連到 ${this.lastNode.label}，下一個要連甚麼?`);
    }
    this.dragging = false;
    this.currentPath = [];
    this.activePointerId = null;
    this.drawAll();
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
    this.router.navigate(['/memory-decline']);
  }

  private restoreResult() {
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

    this.logicalWidth = this.baseWidth;
    this.logicalHeight = this.baseHeight;

    canvas.width = this.logicalWidth * this.devicePixelRatio;
    canvas.height = this.logicalHeight * this.devicePixelRatio;

    this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    this.canvasContext.scale(this.devicePixelRatio, this.devicePixelRatio);
  }

  closeCompletionPopup() {
    this.showCompletionPopup = false;
  }

  private hasActiveSession(): boolean {
    if (this.loginService.userInfo) {
      this.user = this.loginService.userInfo;
      return true;
    }
    return this.guestAuth.isGuestActive;
  }
}

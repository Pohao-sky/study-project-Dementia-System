import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { User } from '../../models/user';
import { TrailMakingALine, TrailMakingANode } from '../../models/trail-making';
import { PointerInputService } from '../../service/pointer-input.service';
import { NormalizedPointerEvent } from '../../models/pointer-input';

@Component({
  selector: 'app-trail-making-test-a-page',
  imports: [CommonModule],
  templateUrl: './trail-making-test-a-page.component.html',
  styleUrl: './trail-making-test-a-page.component.scss'
})
export class TrailMakingTestAPageComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvasContext!: CanvasRenderingContext2D;

  private readonly totalNodeCount = 24;
  private readonly nodeRadius = 29;
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
  started = false;
  timerDisplay = '0.0';
  canProceed = false;

  showRules = true;
  rulesMessage = "【遊戲規則】\n" +
  "1. 請依序由小到大，點擊畫面上數字圓圈並拖曳連線。\n" +
  "2. 只能依序連線，錯誤連線會有提醒，並記錄錯誤次數。\n" +
  "3. 點擊「開始連線測驗」後開始計時，完成全部連線即結束並顯示用時與錯誤數。\n\n" +
  "請點擊下方「開始連線測驗」按鈕開始遊戲！";

  showIncompleteWarning: boolean = false;

  user: User | null = null;

  private readonly storageKey = 'trailMakingTestAResult';

  constructor(
    private loginService: LoginService,
    private router: Router,
    private pointerInputService: PointerInputService
  ) {}

  ngOnInit() {
    if (this.loginService.userInfo) {
      this.user = this.loginService.userInfo;
    } else {
      const userString = localStorage.getItem('userInfo');
      if (userString) this.user = JSON.parse(userString);
    }
    if (!this.user) this.router.navigate(['/login']);

    const canvas = this.canvasRef.nativeElement;
    this.canvasContext = canvas.getContext('2d')!;
    this.resetTest();
    this.restoreResult();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
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
    this.started = false;
    this.canProceed = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.setupNodes();
    this.drawAll();
    this.updateTimerDisplay();
  }

  start() {
    localStorage.removeItem(this.storageKey);
    this.resetTest();
    this.started = true;
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => this.updateTimerDisplay(), 100);
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

  private randomNodes(count: number): TrailMakingANode[] {
    const points: TrailMakingANode[] = [];
    let attempts = 0;
    const canvas = this.canvasRef.nativeElement;
    while (points.length < count && attempts < 3000) {
      const x = Math.random() * (canvas.width - this.nodeRadius * 2) + this.nodeRadius;
      const y = Math.random() * (canvas.height - this.nodeRadius * 2) + this.nodeRadius;
      const isFarEnough = points.every(point => (point.x - x) ** 2 + (point.y - y) ** 2 > this.nodeRadius * 2.8 * this.nodeRadius * 2.8);
      if (isFarEnough) {
        points.push({ label: points.length + 1, x, y });
      }
      attempts++;
    }
    return points;
  }

  private setupNodes() {
    const coordinates = this.randomNodes(this.totalNodeCount);
    const numbers = Array.from({ length: this.totalNodeCount }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    for (let i = 0; i < this.totalNodeCount; i++) {
      this.nodes.push({ label: numbers[i], x: coordinates[i].x, y: coordinates[i].y });
    }
    this.nodes.sort((a, b) => a.label - b.label);
  }

  private drawAll() {
    const canvas = this.canvasRef.nativeElement;
    this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    this.drawLines();
    this.drawNodes();
    this.drawDraggingLine();
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
      if (this.isNodeConnected(node)) {
        this.canvasContext.shadowColor = '#09ff00ff';
        this.canvasContext.shadowBlur = 15;
      }
      this.canvasContext.beginPath();
      this.canvasContext.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
      this.canvasContext.fillStyle = '#fff';
      this.canvasContext.fill();
      this.canvasContext.lineWidth = 2.2;
      this.canvasContext.strokeStyle = '#222';
      this.canvasContext.stroke();
      this.canvasContext.fillStyle = '#222';
      this.canvasContext.font = '18px bold sans-serif';
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
    return node.label === 1 || this.lines.some(line => line.from === node || line.to === node);
  }

  private getNodeAt(x: number, y: number): TrailMakingANode | null {
    for (const node of this.nodes) {
      if ((node.x - x) ** 2 + (node.y - y) ** 2 <= this.nodeRadius * this.nodeRadius) return node;
    }
    return null;
  }

  canvasPointerStart(event: MouseEvent | TouchEvent) {
    if (!this.started || this.dragging) return;
    const pointer = this.pointerInputService.onPointerStart(event);
    if (!pointer) return;
    const coords = this.toCanvasCoordinates(pointer);
    const node = this.getNodeAt(coords.x, coords.y);
    if (!node) return;
    if (this.lines.length === 0 && node.label === 1) {
      this.dragging = true;
      this.lastNode = node;
      this.activePointerId = pointer.identifier;
    } else if (this.lines.length > 0 && node.label === this.lines.length + 1) {
      this.dragging = true;
      this.lastNode = node;
      this.activePointerId = pointer.identifier;
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
    const expectedLabel = this.lines.length + 2;
    if (nextNode && nextNode.label === expectedLabel && nextNode !== this.lastNode) {
      this.lines.push({ from: this.lastNode, to: nextNode });
      this.lastNode = nextNode;
      if (nextNode.label === this.totalNodeCount) {
        this.dragging = false;
        this.endTime = Date.now();
        this.updateTimerDisplay();
          if (this.timerInterval !== null) clearInterval(this.timerInterval);
        const duration = (this.endTime - (this.startTime || 0)) / 1000;
        const result = { duration, errors: this.errorCount };
        alert(`完成！總花費時間：${duration.toFixed(1)} 秒`);
        localStorage.setItem(this.storageKey, JSON.stringify(result));
        this.canProceed = true;
      }
    } else if (nextNode && nextNode !== this.lastNode) {
      alert(`錯誤！你剛連到數字 ${this.lastNode?.label}，下一個數字是什麼？`);
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
      this.showIncompleteWarning = true; // 顯示下方的視覺提示
      return; // Early Return
    }
    this.showIncompleteWarning = false; // 清理提示狀態
    this.router.navigate(['/trail-making-test-b']);
  }

  private restoreResult() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) return;
    const result = JSON.parse(saved);
    this.timerDisplay = result.duration.toFixed(1);
    this.canProceed = true;
    this.showIncompleteWarning = false; // 若有歷史結果，進入時就不顯示警告
  }

  private toCanvasCoordinates(pointer: NormalizedPointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: pointer.clientX - rect.left,
      y: pointer.clientY - rect.top
    };
  }
}

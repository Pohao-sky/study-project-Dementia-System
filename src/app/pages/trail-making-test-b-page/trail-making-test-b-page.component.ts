import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { User } from '../../models/user';
import { TrailMakingBLine, TrailMakingBNode } from '../../models/trail-making';
import { PointerInputService } from '../../service/pointer-input.service';
import { NormalizedPointerEvent } from '../../models/pointer-input';

@Component({
  selector: 'app-trail-making-test-b-page',
  imports: [CommonModule],
  templateUrl: './trail-making-test-b-page.component.html',
  styleUrl: './trail-making-test-b-page.component.scss'
})
export class TrailMakingTestBPageComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvasContext!: CanvasRenderingContext2D;

  private readonly nodeRadius = 29;
  readonly orderList: {type: 'num'|'char', label: string}[] = [
    {type:'num',label:'1'}, {type:'char',label:'A'},
    {type:'num',label:'2'}, {type:'char',label:'B'},
    {type:'num',label:'3'}, {type:'char',label:'C'},
    {type:'num',label:'4'}, {type:'char',label:'D'},
    {type:'num',label:'5'}, {type:'char',label:'E'},
    {type:'num',label:'6'}, {type:'char',label:'F'},
    {type:'num',label:'7'}, {type:'char',label:'G'},
    {type:'num',label:'8'}, {type:'char',label:'H'},
    {type:'num',label:'9'}, {type:'char',label:'I'},
    {type:'num',label:'10'}, {type:'char',label:'J'},
    {type:'num',label:'11'}, {type:'char',label:'K'},
    {type:'num',label:'12'}, {type:'char',label:'L'},
    {type:'num',label:'13'}
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
  started = false;
  timerDisplay = '0.0';
  canProceed = false;

  showRules = true;
  rulesMessage =
    "【遊戲規則】\n" +
    "1. 依序點擊並連線「1→A→2→B→...→13→L」。\n" +
    "2. 拖曳錯誤會提醒並記錄錯誤次數。\n" +
    "3. 按「開始連線測驗」後開始計時，全部完成即顯示用時與錯誤數。\n\n" +
    "請點擊下方「開始連線測驗」按鈕開始！";

  showIncompleteWarning: boolean = false;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private pointerInputService: PointerInputService
  ) {}

  private readonly storageKey = 'trailMakingTestBResult';

  user: User | null = null;

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

  start() {
    localStorage.removeItem(this.storageKey);
    this.resetTest();
    this.started = true;
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
    this.started = false;
    this.canProceed = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.setupNodes();
    this.drawAll();
    this.updateTimerDisplay();
  }

  private randomCoordinates(count: number): { x: number; y: number }[] {
    const coordinates: { x: number; y: number }[] = [];
    const canvas = this.canvasRef.nativeElement;
    while (coordinates.length < count) {
      const x = Math.random() * (canvas.width - this.nodeRadius * 2) + this.nodeRadius;
      const y = Math.random() * (canvas.height - this.nodeRadius * 2) + this.nodeRadius;
      const isFarEnough = coordinates.every(point => (point.x - x) ** 2 + (point.y - y) ** 2 > (this.nodeRadius * 3) ** 2);
      if (isFarEnough) coordinates.push({ x, y });
    }
    return coordinates;
  }

  private setupNodes() {
    this.nodes = [];
    const coordinates = this.randomCoordinates(this.orderList.length);
    for (let i = 0; i < this.orderList.length; i++) {
      const node = { ...this.orderList[i], x: coordinates[i].x, y: coordinates[i].y } as TrailMakingBNode;
      this.nodes.push(node);
    }
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
      this.canvasContext.fillStyle = node.type === 'num' ? '#222' : '#1e50a2';
      this.canvasContext.font = '19px bold sans-serif';
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
    return (
      (node.type === 'num' && node.label === '1') ||
      this.lines.some(line => line.from === node || line.to === node)
    );
  }

  private getNodeAt(x: number, y: number): TrailMakingBNode | null {
    return this.nodes.find(node => (node.x - x) ** 2 + (node.y - y) ** 2 <= this.nodeRadius ** 2) || null;
  }

  canvasPointerStart(event: MouseEvent | TouchEvent) {
    if (!this.started || this.dragging) return;
    const pointer = this.pointerInputService.onPointerStart(event);
    if (!pointer) return;
    const coords = this.toCanvasCoordinates(pointer);
    const node = this.getNodeAt(coords.x, coords.y);
    if (this.lines.length === 0 && node && node.type === 'num' && node.label === '1') {
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
        alert(`完成！總花費時間：${duration.toFixed(1)} 秒`);
        localStorage.setItem(this.storageKey, JSON.stringify(result));
        this.canProceed = true;
      }
    } else if (nextNode && nextNode !== this.lastNode) {
      const currentExpected = this.orderList[this.lines.length];
      const nextTypeLabel = currentExpected.type === 'num' ? '字母' : '數字';
      alert(`你剛連到 ${this.lastNode.label}，下一個${nextTypeLabel}是什麼？`);
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
    this.router.navigate(['/memory-decline']);
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

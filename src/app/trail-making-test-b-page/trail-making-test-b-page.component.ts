import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { TrailMakingTestBService } from '../service/trail-making-test-b.service';
import { Router } from '@angular/router';
import { LoginService } from '../service/login.service';
import { User } from '../models/user';

interface TmtNode {
  type: 'num' | 'char';
  label: string;
  x: number;
  y: number;
}
interface TmtLine {
  from: TmtNode;
  to: TmtNode;
}

@Component({
  selector: 'app-trail-making-test-b-page',
  imports: [CommonModule],
  templateUrl: './trail-making-test-b-page.component.html',
  styleUrl: './trail-making-test-b-page.component.scss'
})
export class TrailMakingTestBPageComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  readonly RADIUS = 29;
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

  nodes: TmtNode[] = [];
  lines: TmtLine[] = [];
  dragging = false;
  lastNode: TmtNode | null = null;
  currentPath: number[] = [];

  startTime: number | null = null;
  endTime: number | null = null;
  timerInterval: any = null;
  errorCount = 0;
  started = false;
  timerDisplay = '0.0';

  showRules = true;
  rulesMessage =
    "【遊戲規則】\n" +
    "1. 依序點擊並連線「1→A→2→B→...→13→L」。\n" +
    "2. 拖曳錯誤會提醒並記錄錯誤次數。\n" +
    "3. 按「開始連線測驗」後開始計時，全部完成即顯示用時與錯誤數。\n\n" +
    "請點擊下方「開始連線測驗」按鈕開始！";

  constructor(
    private api: LoginService,
    private service: TrailMakingTestBService,
    private router: Router
  ) {}

  user: User | null = null;

  ngOnInit() {
        // 1. 先從 service 拿
    if (this.api.userInfo) {
      this.user = this.api.userInfo;
    } else {
      // 2. 再從 localStorage 拿
      const userStr = localStorage.getItem('userInfo');
      if (userStr) this.user = JSON.parse(userStr);
    }
    // 3. 沒資料就跳回登入頁
    if (!this.user) this.router.navigate(['/login']);
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resetTest();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  start() {
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
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.setupNodes();
    this.drawAll();
    this.updateTimerDisplay();
  }

  private randomCoords(count: number): {x:number,y:number}[] {
    const coords: {x:number,y:number}[] = [];
    const canvas = this.canvasRef.nativeElement;
    while (coords.length < count) {
      const x = Math.random() * (canvas.width - this.RADIUS * 2) + this.RADIUS;
      const y = Math.random() * (canvas.height - this.RADIUS * 2) + this.RADIUS;
      const ok = coords.every(pt => (pt.x - x) ** 2 + (pt.y - y) ** 2 > (this.RADIUS * 3) ** 2);
      if (ok) coords.push({x,y});
    }
    return coords;
  }

  private setupNodes() {
    this.nodes = [];
    const coords = this.randomCoords(this.orderList.length);
    for (let i = 0; i < this.orderList.length; i++) {
      const node = { ...this.orderList[i], x: coords[i].x, y: coords[i].y } as TmtNode;
      this.nodes.push(node);
    }
  }

  private drawAll() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    // lines
    this.ctx.save();
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#2186f6';
    this.lines.forEach(l => {
      this.ctx.beginPath();
      this.ctx.moveTo(l.from.x, l.from.y);
      this.ctx.lineTo(l.to.x, l.to.y);
      this.ctx.stroke();
    });
    this.ctx.restore();
    // nodes
    this.nodes.forEach(n => {
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, this.RADIUS, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
      this.ctx.lineWidth = 2.2;
      this.ctx.strokeStyle = '#222';
      this.ctx.stroke();
      this.ctx.fillStyle = n.type === 'num' ? '#222' : '#1e50a2';
      this.ctx.font = '19px bold sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(n.label, n.x, n.y);
    });
    // dragging line
    if (this.dragging && this.lastNode && this.currentPath.length > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = '#3bc5f3ff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastNode.x, this.lastNode.y);
      this.ctx.lineTo(this.currentPath[0], this.currentPath[1]);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private getNodeAt(x:number,y:number): TmtNode | null {
    return this.nodes.find(n => (n.x - x) ** 2 + (n.y - y) ** 2 <= this.RADIUS ** 2) || null;
  }

  canvasMouseDown(e: MouseEvent) {
    if (!this.started) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = this.getNodeAt(mx, my);
    if (this.lines.length === 0 && node && node.type === 'num' && node.label === '1') {
      this.dragging = true;
      this.lastNode = node;
    } else if (this.lines.length > 0) {
      const exp = this.orderList[this.lines.length];
      if (node && node.type === exp.type && node.label === exp.label) {
        this.dragging = true;
        this.lastNode = node;
      }
    }
    this.drawAll();
  }

  canvasMouseMove(e: MouseEvent) {
    if (!this.dragging || !this.lastNode) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.currentPath = [mx, my];
    this.drawAll();
  }

  canvasMouseUp(e: MouseEvent) {
    if (!this.dragging || !this.lastNode) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const next = this.getNodeAt(mx, my);
    const expected = this.orderList[this.lines.length + 1];

    if (next && expected && next.type === expected.type && next.label === expected.label && next !== this.lastNode) {
      this.lines.push({ from: this.lastNode, to: next });
      this.lastNode = next;
      if (this.lines.length === this.orderList.length - 1) {
        this.dragging = false;
        this.endTime = Date.now();
        this.updateTimerDisplay();
        clearInterval(this.timerInterval);
        const duration = (this.endTime - (this.startTime || 0)) / 1000;
        alert(`完成！總花費時間：${duration.toFixed(1)} 秒\n錯誤次數：${this.errorCount}`);
        this.service.submitResult({ duration, errors: this.errorCount }).subscribe();
      }
    } else if (next && next !== this.lastNode) {
      this.errorCount += 1;
      const curr = this.orderList[this.lines.length];
      const nextTypeLabel = curr.type === 'num' ? '字母' : '數字';
      alert(`你剛連到 ${this.lastNode.label}，下一個${nextTypeLabel}是什麼？`);
    }
    this.dragging = false;
    this.currentPath = [];
    this.drawAll();
  }

  nextPage() {
    // 進入下一個頁面或顯示全部結果
    alert('連線測驗全部完成，可進入下個步驟！');
    // this.router.navigate(...)
  }
}

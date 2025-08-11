import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { TrailMakingTestAService } from '../service/trail-making-test-a.service';


interface NodePoint {
  num: number;
  x: number;
  y: number;
}
interface LineConn {
  from: NodePoint;
  to: NodePoint;
}

@Component({
  selector: 'app-trail-making-test-a-page',
  imports: [CommonModule],
  templateUrl: './trail-making-test-a-page.component.html',
  styleUrl: './trail-making-test-a-page.component.scss'
})
export class TrailMakingTestAPageComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  readonly N = 24;
  readonly RADIUS = 22;
  nodes: NodePoint[] = [];
  lines: LineConn[] = [];
  dragging = false;
  lastNode: NodePoint | null = null;
  currentPath: number[] = [];

  startTime: number | null = null;
  endTime: number | null = null;
  timerInterval: any = null;
  errorCount = 0;
  started = false;
  timerDisplay = '0.0';

  showRules = true;
rulesMessage = "【遊戲規則】\n" +
"1. 請依序由小到大，點擊畫面上數字圓圈並拖曳連線。\n" +
"2. 只能依序連線，錯誤連線會有提醒，並記錄錯誤次數。\n" +
"3. 點擊「開始連線測驗」後開始計時，完成全部連線即結束並顯示用時與錯誤數。\n\n" +
"請點擊下方「開始連線測驗」按鈕開始遊戲！";

  constructor(private tmtService: TrailMakingTestAService) {}

  ngOnInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resetTest();
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
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.setupNodes();
    this.drawAll();
    this.updateTimerDisplay();
  }

  start() {
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

  private randomNodes(n: number): NodePoint[] {
    const arr: NodePoint[] = [];
    let count = 0;
    const canvas = this.canvasRef.nativeElement;
    while (arr.length < n && count < 3000) {
      const x = Math.random() * (canvas.width - this.RADIUS * 2) + this.RADIUS;
      const y = Math.random() * (canvas.height - this.RADIUS * 2) + this.RADIUS;
      if (arr.every(pt => (pt.x - x) ** 2 + (pt.y - y) ** 2 > this.RADIUS * 2.8 * this.RADIUS * 2.8)) {
        arr.push({ num: arr.length + 1, x, y });
      }
      count++;
    }
    return arr;
  }

  private setupNodes() {
    const coords = this.randomNodes(this.N);
    const nums = Array.from({ length: this.N }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    for (let i = 0; i < this.N; i++) {
      this.nodes.push({ num: nums[i], x: coords[i].x, y: coords[i].y });
    }
    this.nodes.sort((a, b) => a.num - b.num);
  }

  private drawAll() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    this.nodes.forEach(n => {
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, this.RADIUS, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
      this.ctx.lineWidth = 2.2;
      this.ctx.strokeStyle = '#222';
      this.ctx.stroke();
      this.ctx.fillStyle = '#222';
      this.ctx.font = '18px bold sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(n.num.toString(), n.x, n.y);
    });
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

  private getNodeAt(x: number, y: number): NodePoint | null {
    for (const n of this.nodes) {
      if ((n.x - x) ** 2 + (n.y - y) ** 2 <= this.RADIUS * this.RADIUS) return n;
    }
    return null;
  }

  canvasMouseDown(evt: MouseEvent) {
    if (!this.started) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;
    const node = this.getNodeAt(mx, my);
    if (!node) return;
    if (this.lines.length === 0 && node.num === 1) {
      this.dragging = true;
      this.lastNode = node;
    } else if (this.lines.length > 0 && node.num === this.lines.length + 1) {
      this.dragging = true;
      this.lastNode = node;
    }
    this.drawAll();
  }

  canvasMouseMove(evt: MouseEvent) {
    if (!this.dragging || !this.lastNode) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;
    this.currentPath = [mx, my];
    this.drawAll();
  }

  canvasMouseUp(evt: MouseEvent) {
    if (!this.dragging || !this.lastNode) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;
    const next = this.getNodeAt(mx, my);
    const expectedNum = this.lines.length + 2;
    if (next && next.num === expectedNum && next !== this.lastNode) {
      this.lines.push({ from: this.lastNode, to: next });
      this.lastNode = next;
      if (next.num === this.N) {
        this.dragging = false;
        this.endTime = Date.now();
        this.updateTimerDisplay();
        clearInterval(this.timerInterval);
        const duration = (this.endTime - (this.startTime || 0)) / 1000;
        alert(`完成！總花費時間：${duration.toFixed(1)} 秒\n錯誤次數：${this.errorCount}`);
        this.tmtService.submitResult({
          duration,
          errors: this.errorCount
        }).subscribe();
      }
    } else if (next && next !== this.lastNode) {
      this.errorCount += 1;
      alert(`錯誤！你剛連到數字 ${this.lastNode?.num}，下一個數字是什麼？`);
    }
    this.dragging = false;
    this.currentPath = [];
    this.drawAll();
  }
  nextPage() {
    // 進入下一個頁面或顯示全部結果
    alert('語詞流暢性測驗全部完成，可進入下個步驟！');
    // this.router.navigate(...)
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { User } from '../models/user';
import { LoginService } from '../service/login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-memory-decline-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-decline-page.component.html',
  styleUrl: './memory-decline-page.component.scss'
})
export class MemoryDeclinePageComponent implements OnInit {
  private readonly storageKey = 'memoryDeclineAnswer';
  user: User | null = null;

  // 作答狀態
  selectedAnswer: 'yes' | 'no' | null = null;

  // 未作答警告顯示控制
  showIncompleteWarning: boolean = false;

  constructor(private loginService: LoginService, private router: Router) {}

  ngOnInit(): void {
    this.loadUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    this.restoreAnswer();
  }

  /** 是否可前往下一頁：唯讀屬性，直接回傳布林 */
  get canProceedToNextPage(): boolean {
    return this.selectedAnswer !== null;
  }

  /** 選擇答案：更新狀態與儲存，同時關閉未作答警告 */
  selectAnswer(answer: 'yes' | 'no'): void {
    this.selectedAnswer = answer;
    localStorage.setItem(this.storageKey, answer === 'yes' ? '1' : '0');
    this.showIncompleteWarning = false;
  }

  /** 點擊下一頁：未作答→警告並早退；已作答→導頁 */
  onNextButtonClick(): void {
    if (!this.canProceedToNextPage) {
      alert('請先選擇「是」或「否」');
      this.showIncompleteWarning = true; // 顯示頁內提示
      return; // Early Return
    }
    this.showIncompleteWarning = false; // 清除殘留訊息
    this.router.navigate(['/dementia-prediction']);
  }

  // ---- 私有輔助 ----

  private loadUser(): void {
    if (this.loginService.userInfo) {
      this.user = this.loginService.userInfo;
      return;
    }
    const userStr = localStorage.getItem('userInfo');
    if (userStr) this.user = JSON.parse(userStr);
  }

  private restoreAnswer(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === '1') {
      this.selectedAnswer = 'yes';
      return;
    }
    if (saved === '0') {
      this.selectedAnswer = 'no';
    }
  }
}

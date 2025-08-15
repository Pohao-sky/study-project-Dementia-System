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
  selectedAnswer: 'yes' | 'no' | null = null;

  constructor(private loginService: LoginService, private router: Router) {}

  ngOnInit() {
    this.loadUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    this.restoreAnswer();
  }

  selectAnswer(answer: 'yes' | 'no') {
    this.selectedAnswer = answer;
    const value = answer === 'yes' ? '1' : '0';
    localStorage.setItem(this.storageKey, value);
  }

  private loadUser() {
    if (this.loginService.userInfo) {
      this.user = this.loginService.userInfo;
      return;
    }
    const userStr = localStorage.getItem('userInfo');
    if (userStr) this.user = JSON.parse(userStr);
  }

  private restoreAnswer() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === '1') {
      this.selectedAnswer = 'yes';
      return;
    }
    if (saved === '0') {
      this.selectedAnswer = 'no';
    }
  }

  nextPage() {
    // 進入下一個頁面或顯示全部結果
    alert('可進入下個步驟！');
    // this.router.navigate(...)
  }
}

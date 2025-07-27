import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';
import { Router } from '@angular/router';
import { User } from '../models/user';


@Component({
  selector: 'app-user-info-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-info-page.component.html',
  styleUrls: ['./user-info-page.component.scss']
})
export class UserInfoPageComponent implements OnInit {
  user: User | null = null;

  constructor(private api: ApiService, private router: Router) {}

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
  }

  getAge(): number | null {
    if (!this.user) return null;
    return new Date().getFullYear() - this.user.birth_year;
  }

  nextPage() {
    // TODO: 實作下一頁功能
    alert('之後導向測驗頁');
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../models/user';
import { LoginService } from '../../service/login.service';


@Component({
  selector: 'app-user-info-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-info-page.component.html',
  styleUrls: ['./user-info-page.component.scss']
})
export class UserInfoPageComponent implements OnInit {
  ///若沒登入就近此頁就跳回登入頁
  user: User | null = null;

  constructor(private api: LoginService, private router: Router) {}

  ngOnInit() {
    // 1. 先從 service 拿
    if (this.api.userInfo) {
      this.user = this.api.userInfo;
    }
    // 2. 沒資料就跳回登入頁
    if (!this.user) this.router.navigate(['/login'], { state: { reason: 'relogin' } });
  }
  ///

  getAge(): number | null {
    if (!this.user) return null;
    return new Date().getFullYear() - this.user.birth_year;
  }

  nextPage() {
    this.router.navigate(['/voice-test']);
  }
}

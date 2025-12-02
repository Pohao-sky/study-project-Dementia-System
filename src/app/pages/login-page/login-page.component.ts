import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginResponse, LoginService } from '../../service/login.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-page',
  standalone: true,   // ★★★ 一定要加這行
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {
  loginForm: FormGroup;
  errorMsg = '';
  infoMsg = '';

  constructor(
    private fb: FormBuilder,
    private api: LoginService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const reason = navigation?.extras?.state?.['reason'];
    if (reason === 'expired') {
      this.infoMsg = '登入已逾期，請重新登入。';
    } else if (reason === 'idle') {
      this.infoMsg = '因長時間未操作，請重新登入。';
    } else if (reason === 'unauthorized') {
      this.infoMsg = '驗證失敗或權杖已失效，請重新登入。';
    } else if (reason === 'logout') {
      this.infoMsg = '已登出。';
    } else if (reason === 'relogin') {
      this.infoMsg = '請重新登入以繼續。';
    }
  }

  onLogin() {
    this.errorMsg = '';
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.value;
    this.api.login(username, password).subscribe({
      next: (res: LoginResponse) => {
        this.api.setSession(res.token, res.user);
        this.router.navigate(['/user-info']);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg = err.error?.error || '帳號或密碼錯誤';
      }
    });
  }
}

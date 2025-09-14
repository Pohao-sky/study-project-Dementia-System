import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginResponse, LoginService } from '../../service/login.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-page',
  standalone: true,   // ★★★ 一定要加這行
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  loginForm: FormGroup;
  errorMsg = '';

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

  onLogin() {
    this.errorMsg = '';
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.value;
      this.api.login(username, password).subscribe({
        next: (res: LoginResponse) => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('userInfo', JSON.stringify(res.user));
          this.api.userInfo = res.user;
          this.router.navigate(['/user-info']);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMsg = err.error?.error || '帳號或密碼錯誤';
        }
      });
    }
  }

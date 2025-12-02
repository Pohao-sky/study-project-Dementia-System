import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  userInfo: User | null = null;
  token: string | null = null;
  private expiresAt: number | null = null;
  private lastActivityAt: number | null = null;

  private readonly sessionStorageKey = 'auth_session';
  private readonly tokenTtlMs = 2 * 60 * 60 * 1000; // 2 hours
  private readonly idleThresholdMs = 30 * 60 * 1000; // assumption: 30 minutes of inactivity
  private readonly expiryWarningWindowMs = 5 * 60 * 1000;

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private hasWarned = false;

  constructor(
    private http: HttpClient,
    @Inject(API_BASE_URL) private apiUrl: string,
    private router: Router,
  ) {
    ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(event => {
      window.addEventListener(event, () => this.resetIdleTimer());
    });

    this.restoreSession();
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map(res => {
          // 後端有些欄位可能是字串，要轉成 number
          const user = {
            ...res.user,
            CDR_SUM: res.user.CDR_SUM !== null ? Number(res.user.CDR_SUM) : null,
            MMSE_Score: res.user.MMSE_Score !== null ? Number(res.user.MMSE_Score) : null,
            MEMORY: res.user.MEMORY !== null ? Number(res.user.MEMORY) : null,
            CDRGLOB: res.user.CDRGLOB !== null ? Number(res.user.CDRGLOB) : null,
          };
          return { token: res.token, user };
        })
      );
  }

  setSession(token: string, user: User) {
    this.token = token;
    this.userInfo = user;
    this.expiresAt = Date.now() + this.tokenTtlMs;
    this.lastActivityAt = Date.now();
    this.persistSession();
    this.scheduleExpiryTimers();
    this.resetIdleTimer();
  }

  clearSession(reason?: 'logout' | 'expired' | 'idle' | 'unauthorized' | 'relogin') {
    this.token = null;
    this.userInfo = null;
    this.expiresAt = null;
    this.lastActivityAt = null;
    this.cancelTimers();
    this.clearTestRecords();
    sessionStorage.removeItem(this.sessionStorageKey);
    if (reason) {
      this.router.navigate(['/login'], { state: { reason } });
    }
  }

  handleUnauthorized() {
    this.clearSession('unauthorized');
  }

  logout() {
    this.clearSession('logout');
  }

  private scheduleExpiryTimers() {
    this.cancelTimers();
    this.hasWarned = false;
    if (!this.token || !this.expiresAt) return;

    const now = Date.now();
    const remainingMs = this.expiresAt - now;

    if (remainingMs <= 0) {
      this.handleTokenExpiry();
      return;
    }

    const warningDelay = Math.max(remainingMs - this.expiryWarningWindowMs, 0);
    this.warningTimer = setTimeout(() => this.showExpiryWarning(), warningDelay);
    this.expiryTimer = setTimeout(() => this.handleTokenExpiry(), remainingMs);
  }

  private resetIdleTimer() {
    if (!this.token) return;
    this.lastActivityAt = Date.now();
    this.persistSession();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.handleIdleTimeout(), this.idleThresholdMs);
  }

  private handleIdleTimeout() {
    if (!this.token) return;
    alert('已閒置一段時間，請重新登入以繼續。');
    this.clearSession('idle');
  }

  private showExpiryWarning() {
    if (!this.token || this.hasWarned) return;
    this.hasWarned = true;
    alert('登入將於 5 分鐘內逾期，請儘速完成或儲存資料。');
  }

  private handleTokenExpiry() {
    if (!this.token) return;
    alert('登入已逾期，請重新登入。');
    this.clearSession('expired');
  }

  private cancelTimers() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.idleTimer = this.warningTimer = this.expiryTimer = null;
  }

  private clearTestRecords() {
    const keys = [
      'verbalFluencyResult_animals',
      'verbalFluencyResult_vegetables',
      'trailMakingTestAResult',
      'trailMakingTestBResult',
      'memoryDeclineAnswer'
    ];

    keys.forEach(key => localStorage.removeItem(key));
  }

  private persistSession() {
    if (!this.token || !this.userInfo || !this.expiresAt || !this.lastActivityAt) return;
    const payload = {
      token: this.token,
      user: this.userInfo,
      expiresAt: this.expiresAt,
      lastActivityAt: this.lastActivityAt,
    };
    sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(payload));
  }

  private restoreSession() {
    const raw = sessionStorage.getItem(this.sessionStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        token: string;
        user: User;
        expiresAt: number;
        lastActivityAt?: number;
      };

      if (!parsed.token || !parsed.user || !parsed.expiresAt) return;

      const now = Date.now();

      if (parsed.expiresAt <= now) {
        this.clearSession('expired');
        return;
      }

      const lastActivity = parsed.lastActivityAt ?? parsed.expiresAt - this.tokenTtlMs;
      if (now - lastActivity >= this.idleThresholdMs) {
        this.clearSession('idle');
        return;
      }

      this.token = parsed.token;
      this.userInfo = parsed.user;
      this.expiresAt = parsed.expiresAt;
      this.lastActivityAt = now;

      this.scheduleExpiryTimers();
      this.resetIdleTimer();
    } catch (error) {
      sessionStorage.removeItem(this.sessionStorageKey);
    }
  }
}

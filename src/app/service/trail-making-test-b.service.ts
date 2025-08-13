import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginService } from './login.service';

export interface TrailMakingResult {
  userId?: string;
  duration: number;
  errors: number;
}

@Injectable({ providedIn: 'root' })
export class TrailMakingTestBService {
  constructor(private http: HttpClient, private loginService: LoginService) {}

  submitResult(result: TrailMakingResult): Observable<any> {
    const payload: any = {
      duration: result.duration,
      errors: result.errors
    };
    if (result.userId) {
      payload.user_id = result.userId;
    }
    return this.http.post(`${this.loginService.apiUrl}/trail_making_test_b_result`, payload);
  }
}

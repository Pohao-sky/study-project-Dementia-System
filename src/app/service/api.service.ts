import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { User } from '../models/user';

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  userInfo: User | null = null;
  apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

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
}

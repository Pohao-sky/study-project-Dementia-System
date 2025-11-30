import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token.js';
import { GuestClinicalMetrics, GuestSessionRequest, GuestSessionResponse, GuestSessionState } from '../models/guest-mode.js';


@Injectable({ providedIn: 'root' })
export class GuestAuthService {
  private readonly sessionStorageKey = 'guest_session';
  private guestSession: GuestSessionState | null;

  constructor(private http: HttpClient, @Inject(API_BASE_URL) private apiUrl: string) {
    this.guestSession = this.restoreSession();
  }

  createGuestSession(payload: GuestSessionRequest): Observable<GuestSessionState> {
    return this.http.post<GuestSessionResponse>(`${this.apiUrl}/guest/session`, payload).pipe(
      map(res => this.persistSession(res))
    );
  }

  clearGuestSession(): void {
    this.guestSession = null;
    sessionStorage.removeItem(this.sessionStorageKey);
  }

  get token(): string | null {
    return this.guestSession?.token ?? null;
  }

  get isGuestActive(): boolean {
    return Boolean(this.guestSession?.token);
  }

  get sessionPayload(): GuestClinicalMetrics | null {
    return this.guestSession?.payload ?? null;
  }

  private persistSession(response: GuestSessionResponse): GuestSessionState {
    const state: GuestSessionState = {
      token: response.token,
      expiresAt: response.expiresAt,
      role: 'guest',
      payload: response.payload,
    };
    this.guestSession = state;
    sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(state));
    return state;
  }

  private restoreSession(): GuestSessionState | null {
    const raw = sessionStorage.getItem(this.sessionStorageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as GuestSessionState;
      if (!parsed.token || !parsed.payload) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }
}

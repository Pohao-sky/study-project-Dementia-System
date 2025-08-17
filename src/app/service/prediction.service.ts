import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginService } from './login.service';
import { Observable } from 'rxjs';

export interface PredictionPayload {
  CDR_SUM: number;
  CDR_MEMORY: number;
  CDR_GLOB: number;
  MMSE: number;
  ANIMAL_COUNT: number;
  VEGETABLE_COUNT: number;
  TRAIL_A_SECONDS: number;
  TRAIL_B_SECONDS: number;
  MEMORY_DECLINE: number;
}

export interface PredictionResult {
  prediction: string;
  probability: number;
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  constructor(private http: HttpClient, private loginService: LoginService) {}

  predict(payload: PredictionPayload): Observable<PredictionResult> {
    return this.http.post<PredictionResult>(`${this.loginService.apiUrl}/predict`, payload);
  }
}

import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';

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
  prediction: number;
  probability: number;
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  constructor(private http: HttpClient, @Inject(API_BASE_URL) private apiUrl: string) {}

  predict(payload: PredictionPayload): Observable<PredictionResult> {
    return this.http.post<PredictionResult>(`${this.apiUrl}/predict`, payload);
  }
}

import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { VerbalFluencyResult } from '../models/verbal-fluency-result';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  constructor(private http: HttpClient, @Inject(API_BASE_URL) private apiUrl: string) {}

  uploadChunk(formData: FormData): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.apiUrl}/speech_upload_chunk`, formData));
  }

  finalize(formData: FormData): Promise<VerbalFluencyResult> {
    return firstValueFrom(
      this.http.post<VerbalFluencyResult>(`${this.apiUrl}/speech_test_finalize`, formData)
    );
  }
}

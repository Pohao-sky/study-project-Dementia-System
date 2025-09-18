import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SpeechService } from './speech.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';

describe('SpeechService', () => {
  let service: SpeechService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SpeechService,
        { provide: API_BASE_URL, useValue: '/api' },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SpeechService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts chunk to /api/speech_upload_chunk', async () => {
    const formData = new FormData();
    const promise = service.uploadChunk(formData);
    const req = httpMock.expectOne('/api/speech_upload_chunk');
    expect(req.request.method).toBe('POST');
    req.flush({});
    await promise;
  });

  it('posts finalize to /api/speech_test_finalize', async () => {
    const formData = new FormData();
    const promise = service.finalize(formData);
    const req = httpMock.expectOne('/api/speech_test_finalize');
    expect(req.request.method).toBe('POST');
    req.flush({});
    await promise;
  });
});

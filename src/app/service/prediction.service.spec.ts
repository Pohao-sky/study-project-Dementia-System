import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PredictionService, PredictionPayload } from './prediction.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';

describe('PredictionService', () => {
  let service: PredictionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PredictionService,
        { provide: API_BASE_URL, useValue: '/api' },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(PredictionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts to /api/predict', () => {
    const payload: PredictionPayload = {
      CDR_SUM: 0,
      CDR_MEMORY: 0,
      CDR_GLOB: 0,
      MMSE: 0,
      ANIMAL_COUNT: 0,
      VEGETABLE_COUNT: 0,
      TRAIL_A_SECONDS: 0,
      TRAIL_B_SECONDS: 0,
      MEMORY_DECLINE: 0
    };
    service.predict(payload).subscribe();
    const req = httpMock.expectOne('/api/predict');
    expect(req.request.method).toBe('POST');
    req.flush({ prediction: 0, probability: 0 });
  });
});

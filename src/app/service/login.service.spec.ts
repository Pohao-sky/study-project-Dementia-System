import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LoginService, LoginResponse } from './login.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { User } from '../models/user';

describe('LoginService', () => {
  let service: LoginService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoginService,
        { provide: API_BASE_URL, useValue: '/api' },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(LoginService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts to /api/login', () => {
    service.login('user', 'pass').subscribe();
    const req = httpMock.expectOne('/api/login');
    expect(req.request.method).toBe('POST');
    const user: User = {
      name: '',
      gender: '',
      birth_year: 0,
      CDR_SUM: 0,
      MMSE_Score: 0,
      MEMORY: 0,
      CDRGLOB: 0
    };
    req.flush({ token: '', user } as LoginResponse);
  });
});

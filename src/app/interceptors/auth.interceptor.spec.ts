import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { LoginService } from '../service/login.service';
import { RouterTestingModule } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../tokens/api-base-url.token';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loginService: LoginService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '/api' }
      ],
      imports: [RouterTestingModule]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    loginService = TestBed.inject(LoginService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Authorization header for /api requests', () => {
    loginService.token = 'abc';
    http.get('/api/foo').subscribe();
    const req = httpMock.expectOne('/api/foo');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('does not add Authorization header for non-api requests', () => {
    loginService.token = 'abc';
    http.get('/assets/data.json').subscribe();
    const req = httpMock.expectOne('/assets/data.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});

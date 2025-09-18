import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Authorization header for /api requests', () => {
    localStorage.setItem('token', 'abc');
    http.get('/api/foo').subscribe();
    const req = httpMock.expectOne('/api/foo');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('does not add Authorization header for non-api requests', () => {
    localStorage.setItem('token', 'abc');
    http.get('/assets/data.json').subscribe();
    const req = httpMock.expectOne('/assets/data.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});

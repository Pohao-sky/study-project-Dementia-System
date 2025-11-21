import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginService, LoginResponse } from './login.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { User } from '../models/user';
import { RouterTestingModule } from '@angular/router/testing';

describe('LoginService', () => {
  let service: LoginService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoginService,
        { provide: API_BASE_URL, useValue: '/api' },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
      imports: [RouterTestingModule]
    });
    service = TestBed.inject(LoginService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
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

  it('clears session state and local test data when ending a session', async () => {
    service.setSession('token', {
      name: '',
      gender: '',
      birth_year: 0,
      CDR_SUM: 0,
      MMSE_Score: 0,
      MEMORY: 0,
      CDRGLOB: 0
    });

    localStorage.setItem('verbalFluencyResult_animals', '{}');
    localStorage.setItem('verbalFluencyResult_vegetables', '{}');
    localStorage.setItem('trailMakingTestAResult', '{}');
    localStorage.setItem('trailMakingTestBResult', '{}');
    localStorage.setItem('memoryDeclineAnswer', '1');

    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    service.clearSession('logout');

    expect(service.token).toBeNull();
    expect(service.userInfo).toBeNull();
    expect(localStorage.getItem('verbalFluencyResult_animals')).toBeNull();
    expect(localStorage.getItem('verbalFluencyResult_vegetables')).toBeNull();
    expect(localStorage.getItem('trailMakingTestAResult')).toBeNull();
    expect(localStorage.getItem('trailMakingTestBResult')).toBeNull();
    expect(localStorage.getItem('memoryDeclineAnswer')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { state: { reason: 'logout' } });
  });
});

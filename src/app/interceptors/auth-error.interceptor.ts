import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoginService } from '../service/login.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const loginService = inject(LoginService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        loginService.handleUnauthorized();
      }
      return throwError(() => error);
    })
  );
};

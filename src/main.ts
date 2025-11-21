import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { authErrorInterceptor } from './app/interceptors/auth-error.interceptor';
import { API_BASE_URL } from './app/tokens/api-base-url.token';
import { environment } from './environment';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor, authErrorInterceptor])),
    provideRouter(routes), // <--- 關鍵
    { provide: API_BASE_URL, useValue: environment.apiUrl }
  ],
});

import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';


registerLocaleData(localePt);

// ✅ HEALTH CHECK
function initHealth(http: HttpClient) {
  return () => {
    // Chamar /api/health a cada 90 segundos para manter app acordado
    setInterval(() => {
      http.get('https://test-backend-k1u1.onrender.com/api/health').subscribe(
        () => console.log('✅ Health check'),
        () => console.log('Health check falhou')
      );
    }, 90000);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initHealth,
      deps: [HttpClient],
      multi: true
    }
  ],
};
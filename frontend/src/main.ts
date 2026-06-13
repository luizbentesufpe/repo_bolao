import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { environment } from './environment/environment';
import { routes } from './app/app.routes';
import { AppComponent } from './app/appcomponent/app.component';

if ('serviceWorker' in navigator && environment.production) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js'
      );

      console.log('✅ Service Worker registrado');
      console.log('Scope:', registration.scope);

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'JOGOS_UPDATED') {
          window.dispatchEvent(
            new CustomEvent('jogos-atualizados', {
              detail: event.data.dados
            })
          );
        }
      });

    } catch (err) {
      console.error('❌ Erro ao registrar SW', err);
    }
  });
}else{
  console.log('⚠️ Service Worker desabilitado (desenvolvimento)');
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([])),
    provideRouter(routes)
  ]
}).catch(err => console.error(err));
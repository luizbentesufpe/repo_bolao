import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { environment } from './environment/environment';
import { AppComponent } from './app/appcomponent/app.component';
import { appConfig } from './app/app.config';

// ✅ Registrar Service Worker apenas em production
if ('serviceWorker' in navigator && environment.production) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
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
} else {
  console.log('⚠️ Service Worker desabilitado (desenvolvimento)');
}

// ✅ Bootstrap com appConfig (já contém todos os providers)
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
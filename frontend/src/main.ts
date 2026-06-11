import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));

// ✅ ADICIONE: Registra Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('✅ Service Worker registrado'))
    .catch(err => console.error('❌ Erro:', err));

  // Escuta atualizações
  navigator.serviceWorker.onmessage = (event) => {
    if (event.data.type === 'JOGOS_UPDATED') {
      console.log('🔄 Dados atualizados em background!');
      // Opcionalmente: notificar usuário ou recarregar
    }
  };
}
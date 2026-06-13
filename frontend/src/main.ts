import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';

// ✅ REGISTRAR SERVICE WORKER PARA PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('✅ Service Worker registrado:', reg.scope);
        
        // ✅ Ouve mensagens do Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'JOGOS_UPDATED') {
            console.log('📦 Jogos atualizados pelo SW');
            window.dispatchEvent(new CustomEvent('jogos-atualizados', {
              detail: event.data.dados
            }));
          }
        });

        // ✅ Notificar quando SW for atualizado
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nova versão do app disponível');
            }
          });
        });
      })
      .catch(err => {
        console.warn('⚠️ Erro ao registrar SW:', err);
      });
  });
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([]))
  ]
}).catch(err => console.error('❌ Erro ao bootstrapear:', err));
import { Injectable } from '@angular/core';

/**
 * ✅ Serviço para notificações PWA
 * Gerencia permissões e envia notificações ao usuário
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor() {
    this.requestPermission();
  }

  /**
   * ✅ Solicita permissão para notificações
   * Chamado automaticamente ao inicializar
   */
  requestPermission() {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notificações não suportadas neste navegador');
      return;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notificações já permitidas');
      return;
    }

    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Permissão para notificações concedida');
        } else {
          console.log('⚠️ Permissão para notificações negada');
        }
      });
    }
  }

  /**
   * ✅ Envia notificação
   * @param title Título da notificação
   * @param options Opções (body, icon, badge, etc)
   */
  notify(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notificações não suportadas');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Permissão para notificações não concedida');
      return;
    }

    // ✅ Usar Service Worker se disponível
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          ...options
        });
      }).catch(() => {
        // Fallback: usar API padrão
        new Notification(title, options);
      });
    } else {
      // Fallback: usar API padrão
      new Notification(title, options);
    }
  }

  /**
   * ✅ Notificação de sucesso
   */
  notifySuccess(message: string) {
    this.notify('✅ Sucesso!', {
      body: message,
      tag: 'success'
    });
  }

  /**
   * ✅ Notificação de erro
   */
  notifyError(message: string) {
    this.notify('❌ Erro', {
      body: message,
      tag: 'error'
    });
  }

  /**
   * ✅ Notificação de info
   */
  notifyInfo(title: string, message: string) {
    this.notify(title, {
      body: message,
      tag: 'info'
    });
  }

  /**
   * ✅ Notificação de palpite salvo
   */
  notifyApostaSalva(time1: string, time2: string, placar: string) {
    this.notifySuccess(`${time1} × ${time2}: ${placar}`);
  }
}
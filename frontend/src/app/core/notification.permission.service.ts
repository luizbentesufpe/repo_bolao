import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class NotificationPermissionService {
  private readonly STORAGE_KEY = 'bolao_notif_perguntado';

  constructor(private http: HttpClient) {}

  /**
   * ✅ Solicita permissão de notificações
   */
  async solicitarPermissao(): Promise<NotificationPermission> {
    // ✅ Verificar se browser suporta
    if (!('Notification' in window)) {
      console.warn('⚠️ Browser não suporta Notifications');
      return 'denied';
    }

    // ✅ Se já foi negado, não pedir novamente
    if (Notification.permission === 'denied') {
      console.log('⚠️ Notificações bloqueadas pelo usuário');
      return 'denied';
    }

    // ✅ Se já foi concedido, registrar subscription
    if (Notification.permission === 'granted') {
      console.log('✅ Notificações já habilitadas');
      await this.registrarSubscription();
      return 'granted';
    }

    // ✅ Solicitar permissão (default = 'default')
    const permissao = await Notification.requestPermission();
    this.marcarComoPerguntado();

    // ✅ Se concedido, registrar subscription
    if (permissao === 'granted') {
      await this.registrarSubscription();
    }

    return permissao;
  }

  /**
   * ✅ Registra subscription do Service Worker no backend
   */
  private async registrarSubscription(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker não suportado');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          environment.vapidPublicKey
        ) as BufferSource
      });

      // ✅ Enviar para backend
      const token = localStorage.getItem('bolao_token');
      const response = await fetch(`${environment.apiUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          auth: subscription.getKey('auth'),
          p256dh: subscription.getKey('p256dh')
        })
      });

      if (response.ok) {
        console.log('✅ Subscription registrada no backend!');
      } else {
        console.error('❌ Erro ao registrar no backend:', response.statusText);
      }
    } catch (err) {
      console.error('❌ Erro ao registrar subscription:', err);
    }
  }

  /**
   * ✅ Envia notificação de teste
   */
  testarNotificacao(): void {
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Notificações não estão habilitadas');
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification('✅ Notificações Ativadas!', {
          body: 'Você receberá lembretes de jogos próximos.',
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          tag: 'test-notification'
        });
      });
    }
  }

  /**
   * ✅ Converte VAPID key para Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * ✅ Verifica se notificações estão habilitadas
   */
  estaPermitido(): boolean {
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  /**
   * ✅ Retorna estado da permissão
   */
  getPermissao(): NotificationPermission | 'unavailable' {
    if (!('Notification' in window)) return 'unavailable';
    return Notification.permission;
  }

  /**
   * ✅ Verifica se já foi perguntado ao usuário
   */
  foiPerguntado(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  /**
   * ✅ Marca como já perguntado
   */
  marcarComoPerguntado(): void {
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }

  /**
   * ✅ Reseta o estado de perguntado (para testar novamente)
   */
  resetarEstado(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🧹 Estado de notificações resetado');
  }
}
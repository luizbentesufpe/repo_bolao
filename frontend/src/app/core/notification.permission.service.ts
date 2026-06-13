import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class NotificationPermissionService {
  private readonly STORAGE_KEY = 'bolao_notif_perguntado';

  constructor(private http: HttpClient) {}

  async solicitarPermissao(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission === 'granted') {
      await this.registrarSubscription();
      return 'granted';
    }

    const permissao = await Notification.requestPermission();
    this.marcarComoPerguntado();

    if (permissao === 'granted') {
      await this.registrarSubscription();
    }

    return permissao;
  }

  /**
   * ✅ Registra subscription do Service Worker no backend
   */
  private async registrarSubscription(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // ✅ FIX: Fazer cast para BufferSource
        applicationServerKey: this.urlBase64ToUint8Array(
          environment.vapidPublicKey
        ) as BufferSource
      });

      // Envia para o backend
      const token = localStorage.getItem('bolao_token');
      await fetch(`${environment.apiUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });

      console.log('✅ Subscription registrada!');
    } catch (err) {
      console.error('❌ Erro ao registrar subscription:', err);
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

  estaPermitido(): boolean {
    return Notification.permission === 'granted';
  }

  getPermissao(): NotificationPermission {
    return Notification.permission;
  }

  jaPerguntou(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  marcarComoPerguntado(): void {
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }
}
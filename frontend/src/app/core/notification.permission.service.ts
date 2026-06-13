import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class NotificationPermissionService {
  private readonly STORAGE_KEY = 'bolao_notif_perguntado';

  constructor(private http: HttpClient) {}

  /**
   * ✅ Solicita permissão de notificações + sincroniza com banco
   */
  async solicitarPermissao(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('⚠️ Browser não suporta Notifications');
      return 'denied';
    }

    if (Notification.permission === 'denied') {
      console.log('⚠️ Notificações bloqueadas pelo usuário');
      await this.unsubscribe();
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notificações já habilitadas');
      await this.registrarSubscription();
      return 'granted';
    }

    const permissao = await Notification.requestPermission();
    this.marcarComoPerguntado();

    if (permissao === 'granted') {
      await this.registrarSubscription();
    } else if (permissao === 'denied') {
      await this.unsubscribe();
    }

    return permissao;
  }

  /**
   * ✅ Sincroniza permissão do navegador com banco
   * Chamado no primeiro acesso (app.component.ts ngOnInit)
   */
  async sincronizarNotificacoes(): Promise<void> {
    const permissaoNavegador = this.getPermissao();

    try {
      const statusBanco = await this.statusNotificacoes().toPromise();
      const temNoBank = statusBanco?.ativadas || false;

      console.log(`📊 Navegador: ${permissaoNavegador} | Banco: ${temNoBank ? '✅' : '❌'}`);

      if (permissaoNavegador === 'granted' && !temNoBank) {
        console.log('⚠️ [SINCRONIZAÇÃO] Resubscrevendo no banco...');
        await this.registrarSubscription();
      }

      if (permissaoNavegador === 'denied' && temNoBank) {
        console.log('⚠️ [SINCRONIZAÇÃO] Removendo subscription do banco...');
        await this.unsubscribe();
      }

      console.log('✅ Notificações sincronizadas');

    } catch (e) {
      console.error('❌ Erro ao sincronizar notificações:', e);
    }
  }

  /**
   * ✅ Verifica status NO BANCO
   * FIX: Envia Authorization header com JWT token
   */
  statusNotificacoes() {
    const token = localStorage.getItem('bolao_token');
    return this.http.get<{ ativadas: boolean }>(
      `${environment.apiUrl}/api/notifications/status`,
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
    );
  }

  /**
   * ✅ Verifica status REAL (navegador + banco)
   */
  async verificarStatusReal(): Promise<{ navegador: NotificationPermission | 'unavailable', banco: boolean }> {
    const navegador = this.getPermissao();
    let banco = false;

    try {
      const status = await this.statusNotificacoes().toPromise();
      banco = status?.ativadas || false;
    } catch (e) {
      console.warn('⚠️ Erro ao verificar banco:', e);
    }

    return { navegador, banco };
  }

  /**
   * ✅ Registra subscription do Service Worker no backend
   * FIX: Converte ArrayBuffer → base64url string antes de enviar
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

      // ✅ FIX: getKey() retorna ArrayBuffer — converter para base64url string
      const authBuffer = subscription.getKey('auth');
      const p256dhBuffer = subscription.getKey('p256dh');

      if (!authBuffer || !p256dhBuffer) {
        console.error('❌ Chaves de subscription inválidas (nulas)');
        return;
      }

      const auth = this.arrayBufferToBase64(authBuffer);
      const p256dh = this.arrayBufferToBase64(p256dhBuffer);

      const token = localStorage.getItem('bolao_token');
      const response = await fetch(`${environment.apiUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint, auth, p256dh })
      });

      if (response.ok) {
        console.log('✅ Subscription registrada no backend!');
      } else {
        const erro = await response.text();
        console.error('❌ Erro ao registrar no backend:', response.status, erro);
      }
    } catch (err) {
      console.error('❌ Erro ao registrar subscription:', err);
    }
  }

  /**
   * ✅ Desinscreve do banco + navegador
   */
  async unsubscribe(): Promise<void> {
    try {
      const token = localStorage.getItem('bolao_token');
      if (!token) {
        console.warn('⚠️ Sem token para desinscrever');
        return;
      }

      const response = await fetch(`${environment.apiUrl}/api/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('❌ Erro ao desinscrever do banco:', response.statusText);
      }

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          console.log('✅ Desincrito do navegador');
        }
      }

      console.log('✅ Desincrito do banco e navegador');

    } catch (e) {
      console.error('❌ Erro ao desinscrever:', e);
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
   * ✅ Converte ArrayBuffer → base64url string
   * Necessário para serializar as chaves da PushSubscription
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * ✅ Converte VAPID key de base64url para Uint8Array
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
   * ✅ Verifica se notificações estão habilitadas (navegador)
   */
  estaPermitido(): boolean {
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  /**
   * ✅ Retorna estado da permissão (navegador)
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
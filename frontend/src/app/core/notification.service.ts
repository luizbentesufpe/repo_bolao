import { Injectable } from '@angular/core';
import { NotificationPermissionService } from './notification.permission.service';

/**
 * ✅ Serviço para enviar notificações PWA
 * Gerencia e envia notificações ao usuário
 * 
 * Uso:
 * this.notificationService.notifySuccess('Aposta salva!');
 * this.notificationService.notifyApostaSalva('Brasil', 'Argentina', '2×1');
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private permissao: NotificationPermissionService) {}

  /**
   * ✅ Verifica se notificações estão disponíveis e permitidas
   */
  private estaDisponivel(): boolean {
    return !!(
      'Notification' in window &&
      this.permissao.estaPermitido()
    );
  }

  /**
   * ✅ Envia notificação via Service Worker (preferido)
   * Com fallback para API padrão se SW não estiver disponível
   */
  private enviarViaServiceWorker(
    title: string,
    options: NotificationOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then(reg => {
            reg.showNotification(title, {
              icon: '/assets/icon-192.png',
              badge: '/assets/icon-192.png',
              ...options
            });
            resolve();
          })
          .catch(() => {
            // Fallback: API padrão
            new Notification(title, options);
            resolve();
          });
      } else {
        // Fallback: API padrão
        new Notification(title, options);
        resolve();
      }
    });
  }

  /**
   * ✅ Notificação genérica
   * @param title Título da notificação
   * @param options Opções (body, icon, tag, etc)
   */
  notify(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.estaDisponivel()) {
      console.warn('⚠️ Notificações não permitidas ou não suportadas');
      return Promise.reject('Notificações desativadas');
    }

    return this.enviarViaServiceWorker(title, options || {});
  }

  /**
   * ✅ Notificação de sucesso
   * @param message Mensagem de sucesso
   */
  notifySuccess(message: string): Promise<void> {
    return this.notify('✅ Sucesso!', {
      body: message,
      tag: 'success'
    });
  }

  /**
   * ✅ Notificação de erro
   * @param message Mensagem de erro
   */
  notifyError(message: string): Promise<void> {
    return this.notify('❌ Erro', {
      body: message,
      tag: 'error'
    });
  }

  /**
   * ✅ Notificação de informação
   * @param title Título
   * @param message Mensagem
   */
  notifyInfo(title: string, message: string): Promise<void> {
    return this.notify(title, {
      body: message,
      tag: 'info'
    });
  }

  /**
   * ✅ Notificação de aposta salva
   * @param time1 Primeiro time
   * @param time2 Segundo time
   * @param placar Placar (ex: "2×1")
   */
  notifyApostaSalva(time1: string, time2: string, placar: string): Promise<void> {
    return this.notifySuccess(`${time1} × ${time2}: ${placar}`);
  }

  /**
   * ✅ Notificação de lembrete de jogo
   * @param time1 Primeiro time
   * @param time2 Segundo time
   * @param minutosRestantes Minutos até o jogo começar
   */
  notifyLembreteJogo(
    time1: string,
    time2: string,
    minutosRestantes: number
  ): Promise<void> {
    const msg = minutosRestantes > 1
      ? `${minutosRestantes} minutos até ${time1} × ${time2}`
      : `${time1} × ${time2} começando em 1 minuto!`;

    return this.notify('⏰ Jogo começando em breve!', {
      body: msg,
      tag: 'jogo-comecando',
      requireInteraction: true
    });
  }

  /**
   * ✅ Notificação de ranking atualizado
   * @param posicao Nova posição no ranking
   * @param pontos Pontos atuais
   */
  notifyRankingAtualizado(posicao: number, pontos: number): Promise<void> {
    const emoji = posicao === 1 ? '🏆' : '📈';
    return this.notify(`${emoji} Ranking atualizado!`, {
      body: `Você está em ${posicao}º lugar com ${pontos} pontos`,
      tag: 'ranking'
    });
  }

  /**
   * ✅ Notificação de resultado de jogo
   * @param time1 Primeiro time
   * @param time2 Segundo time
   * @param placar Placar final (ex: "2×1")
   * @param seuPalpite Seu palpite (ex: "2×0")
   * @param pontos Pontos ganhos
   */
  notifyResultadoJogo(
    time1: string,
    time2: string,
    placar: string,
    seuPalpite: string,
    pontos: number
  ): Promise<void> {
    const emoji = pontos > 0 ? '✅' : '❌';
    const msg = pontos > 0
      ? `Você acertou! Ganhou ${pontos} pts`
      : `Resultado: ${placar}. Seu palpite: ${seuPalpite}`;

    return this.notify(`${emoji} ${time1} × ${time2}`, {
      body: msg,
      tag: 'resultado'
    });
  }

  /**
   * ✅ Notificação de teste
   * Útil para verificar se notificações estão funcionando
   */
  notifyTeste(): Promise<void> {
    return this.notify('🧪 Teste de notificação!', {
      body: 'Se você vê isso, notificações estão funcionando corretamente!',
      tag: 'teste'
    });
  }
}
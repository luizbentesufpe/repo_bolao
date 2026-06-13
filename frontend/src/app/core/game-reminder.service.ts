import { Injectable, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';

/**
 * ✅ Serviço para lembrar o usuário antes de cada jogo
 * Verifica a cada minuto se há jogos próximos (30min e 10min antes)
 */
@Injectable({
  providedIn: 'root'
})
export class GameReminderService implements OnInit {

  private checkInterval: Subscription | null = null;
  private notifiedGames = new Map<number, Set<number>>(); // jogo_id → [30, 10]

  constructor(
    private api: ApiService,
    private notif: NotificationService
  ) {
    this.startChecking();
  }

  ngOnInit() {
    this.startChecking();
  }

  /**
   * ✅ Inicia verificação a cada minuto
   */
  private startChecking() {
    // Verificar a cada 1 minuto
    this.checkInterval = interval(60 * 1000).subscribe(() => {
      this.checkUpcomingGames();
    });

    // Também verificar imediatamente ao inicializar
    this.checkUpcomingGames();
  }

  /**
   * ✅ Verifica jogos próximos e envia notificações
   */
  private checkUpcomingGames() {
    this.api.jogos('todos').subscribe(jogos => {
      const agora = new Date();

      jogos.forEach(jogo => {
        const dataJogo = new Date(jogo.data_hora);
        const minutosFaltando = (dataJogo.getTime() - agora.getTime()) / (1000 * 60);

        // ✅ 30 minutos antes
        if (minutosFaltando > 29 && minutosFaltando <= 30) {
          this.notificarSeNaoAvisado(jogo, 30);
        }

        // ✅ 10 minutos antes
        if (minutosFaltando > 9 && minutosFaltando <= 10) {
          this.notificarSeNaoAvisado(jogo, 10);
        }
      });
    });
  }

  /**
   * ✅ Notifica apenas uma vez por jogo e intervalo
   */
  private notificarSeNaoAvisado(jogo: any, minutos: number) {
    if (!this.notifiedGames.has(jogo.id)) {
      this.notifiedGames.set(jogo.id, new Set());
    }

    const notificados = this.notifiedGames.get(jogo.id)!;

    // ✅ Verifica se já notificou neste intervalo
    if (!notificados.has(minutos)) {
      notificados.add(minutos);
      this.enviarNotificacao(jogo, minutos);
    }
  }

  /**
   * ✅ Envia notificação de lembrete
   */
  private enviarNotificacao(jogo: any, minutos: number) {
    const titulo = minutos === 30 
      ? '⚽ Faltam 30 minutos!' 
      : '⚽ Faltam 10 minutos!';

    const mensagem = `${jogo.time1.nome} × ${jogo.time2.nome}`;

    this.notif.notify(titulo, {
      body: `${mensagem}\n\nFaça seu palpite agora!`,
      tag: `jogo-${jogo.id}`,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      requireInteraction: true // Fica visível até clicar
    });

    console.log(`⏰ Lembrete enviado: ${titulo} - ${mensagem}`);
  }

  /**
   * ✅ Para as verificações (quando usuário logout)
   */
  stop() {
    if (this.checkInterval) {
      this.checkInterval.unsubscribe();
    }
  }

  /**
   * ✅ Limpa notificações quando usuário logout
   */
  reset() {
    this.notifiedGames.clear();
    this.stop();
  }
}
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { GameReminderService } from '../core/game-reminder.service';
import { NotificationPermissionService } from '../core/notification.permission.service';
import { DeviceService } from '../core/device.service';
import { PwaInstallService } from '../core/pwa-install.service';
import { BackButtonService } from '../core/back-button.service';
import { ConnectionService } from '../core/connection.service';
import { SincronizacaoService } from '../core/sincronizacao.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  menuAberto = signal(false);
  mostrarModalPWA = false;
  mostrarModalNotif = false;
  mostrarModalNotifNegada = false;
  mostrarModalSair = false;
  mostrarModalFecharApp = false;
  online = true;
  sincronizando = false;

  private backSubscription: any;
  private connectionSubscription: Subscription | null = null;
  private avisoDismissed = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private gameReminder: GameReminderService,
    private notifPermission: NotificationPermissionService,
    public device: DeviceService,
    public pwaService: PwaInstallService,
    private backButton: BackButtonService,
    private connection: ConnectionService,
    private sincronizacaoService: SincronizacaoService
  ) { }

  /**
   * ✅ Instalar PWA
   */
  instalarPWA() {
    this.pwaService.instalar();
    this.fecharModalPWA();
  }

  ngOnInit() {
    // ✅ MONITORAR CONEXÃO
    this.connectionSubscription = this.connection.getStatus().subscribe((status: boolean) => {
      this.online = status;
      this.avisoDismissed = false;
      
      // Se voltou online, sincronizar automaticamente
      if (status) {
        console.log('✅ Conexão retornou! Sincronizando...');
        this.sincronizarEmBackground();
      }
    });

    if (this.auth.logado) {
      this.notifPermission.sincronizarNotificacoes().catch(e => {
        console.error('❌ Erro ao sincronizar:', e);
      });

      // ✅ NOTIFICAÇÕES: PWA pergunta 1x, Navegador pergunta por sessão
      if (this.device.isPWAInstalled()) {
        // PWA: usa localStorage (persiste entre sessões)
        const jaVerificouPWA = localStorage.getItem('verificou_notif_pwa');
        if (!jaVerificouPWA) {
          setTimeout(() => {
            this.verificarNotificacoesDessincronizadas();
            localStorage.setItem('verificou_notif_pwa', 'true');
          }, 1000);
        }
      } else {
        // Navegador: usa sessionStorage (apenas por sessão)
        const jaVerificou = sessionStorage.getItem('verificou_notif_dessincronizadas');
        if (!jaVerificou) {
          setTimeout(() => {
            this.verificarNotificacoesDessincronizadas();
            sessionStorage.setItem('verificou_notif_dessincronizadas', 'true');
          }, 1000);
        }
      }

      // ✅ Verificar modal PWA (apenas 1x por sessão)
      const jaVerificouPWA = sessionStorage.getItem('verificou_modal_pwa');
      if (!jaVerificouPWA) {
        setTimeout(() => {
          this.verificarModalPWA();
          sessionStorage.setItem('verificou_modal_pwa', 'true');
        }, 2000);
      }

      // ✅ APENAS mobile: detectar double tap para fechar app
      if (this.device.isMobile()) {
        this.backSubscription = this.backButton.doubleTapSair$.subscribe(() => {
          this.verificarFecharApp();
        });
      }
    }
  }

  /**
   * ✅ SINCRONIZAR EM BACKGROUND
   */
  private sincronizarEmBackground() {
    console.log('🔄 Sincronizando em background...');
    this.sincronizando = true;

    // Sincronizar
    this.sincronizacaoService.sincronizar();

    // Marcar como completo
    setTimeout(() => {
      this.sincronizando = false;
      console.log('✅ Sincronização concluída!');
    }, 2000);
  }

  /**
   * ✅ Toggle do menu lateral
   */
  toggleMenu() {
    this.menuAberto.update(v => !v);
  }

  /**
   * ✅ Fecha menu lateral
   */
  fecharMenu() {
    this.menuAberto.set(false);
  }

  /**
   * ✅ Verifica se deve mostrar modal PWA
   */
  verificarModalPWA() {
    if (
      this.device.isMobile() &&
      !this.device.isPWAInstalled() &&
      this.device.supportsPWA()
    ) {
      const jaFechou = sessionStorage.getItem('fechou_modal_pwa');
      if (!jaFechou) {
        this.mostrarModalPWA = true;
        console.log('📱 Mostrando modal de PWA para mobile');
      }
    }
  }

  /**
   * ✅ Fecha modal PWA
   */
  fecharModalPWA() {
    this.mostrarModalPWA = false;
    sessionStorage.setItem('fechou_modal_pwa', 'true');
  }

  /**
   * ✅ Fechar aviso de internet
   */
  fecharAviso() {
    this.avisoDismissed = true;
  }

  /**
   * ✅ Verifica notificações dessincronizadas (UMA VEZ por sessão)
   */
  async verificarNotificacoesDessincronizadas() {
    try {
      const status = await this.notifPermission.verificarStatusReal();

      // ✅ Se tudo está OK: ativado no navegador E no banco → NÃO mostra modal
      if (status.navegador === 'granted' && status.banco) {
        console.log('✅ Notificações já estão completamente ativadas e sincronizadas');
        return;
      }

      // ⚠️ Caso 1: Ativa no navegador mas não no banco
      if (status.navegador === 'granted' && !status.banco) {
        console.log('⚠️ Notificação ativa no navegador mas não no banco!');
        this.mostrarModalNotif = true;
        return;
      }

      // ⚠️ Caso 2: No banco mas negada no navegador
      if (status.navegador === 'denied' && status.banco) {
        console.log('⚠️ Notificação no banco mas negada no navegador!');
        this.mostrarModalNotifNegada = true;
        return;
      }

      // ⚠️ Caso 3: Nunca perguntou ao usuário (navegador default/unknown)
      if (
        this.auth.logado &&
        !this.notifPermission.foiPerguntado() &&
        status.navegador !== 'granted' &&
        status.navegador !== 'denied'
      ) {
        this.mostrarModalNotif = true;
        console.log('📬 Modal de notificações exibido (primeira vez)');
        return;
      }

      console.log('✅ Notificações sincronizadas');
    } catch (e) {
      console.error('❌ Erro ao verificar dessincronização:', e);
    }
  }

  ngOnDestroy() {
    this.gameReminder.stop();
    this.backSubscription?.unsubscribe();
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

  /**
   * ✅ Ativar notificações
   */
  ativarNotif() {
    this.notifPermission.solicitarPermissao().then(permissao => {
      this.mostrarModalNotif = false;

      if (permissao === 'granted') {
        console.log('✅ Notificações ativadas!');
        this.notifPermission.testarNotificacao();
        setTimeout(() => {
          this.notifPermission.sincronizarNotificacoes().then(() => {
            this.verificarNotificacoesDessincronizadas();
          });
        }, 500);
      } else if (permissao === 'denied') {
        console.log('⚠️ Notificações bloqueadas pelo usuário');
        this.mostrarModalNotifNegada = true;
      }
    });
  }

  /**
   * ✅ Tentar novamente
   */
  tentarNovamente() {
    console.log('🔄 Tentando solicitar permissão novamente...');
    this.ativarNotif();
  }

  /**
   * ✅ Fechar modal de notificações negadas
   */
  fecharModalNegada() {
    this.mostrarModalNotifNegada = false;
    this.notifPermission.marcarComoPerguntado();
  }

  /**
   * ✅ Recusar notificações por enquanto
   */
  recusarNotif() {
    this.notifPermission.marcarComoPerguntado();
    this.mostrarModalNotif = false;
    console.log('⏭️ Usuário recusou notificações por enquanto');
  }

  /**
   * ✅ EXECUTAR logout de verdade
   */
  private executarSaida() {
    this.gameReminder.reset();
    this.auth.logout();
    this.router.navigate(['/entrar']);
  }

  /**
   * ✅ Pergunta se quer FECHAR o APP (double tap no voltar - MOBILE ONLY)
   */
  private verificarFecharApp() {
    const temModalAberto = this.mostrarModalPWA ||
      this.mostrarModalNotif ||
      this.mostrarModalNotifNegada ||
      this.mostrarModalSair ||
      this.mostrarModalFecharApp;

    if (temModalAberto) {
      console.log('⚠️ Modal já aberto');
      return;
    }

    this.mostrarModalFecharApp = true;
    console.log('❓ Perguntando se quer fechar o app (mobile)');
  }

  /**
   * ✅ Confirmar fechar APP (sem logout)
   */
  confirmarFecharApp() {
    this.mostrarModalFecharApp = false;
    // Apenas volta para trás (sai do app)
    history.back();
  }

  /**
   * ✅ Cancelar fechar APP
   */
  cancelarFecharApp() {
    this.mostrarModalFecharApp = false;
  }

  /**
   * ✅ Confirmar saída (logout)
   */
  confirmarSaida() {
    this.mostrarModalSair = false;
    this.executarSaida();
  }

  /**
   * ✅ Cancelar saída
   */
  cancelarSaida() {
    this.mostrarModalSair = false;
  }

  /**
   * ✅ Sair (botão navbar) - DESKTOP E MOBILE (logout)
   */
  sair() {
    const temModalAberto = this.mostrarModalPWA ||
      this.mostrarModalNotif ||
      this.mostrarModalNotifNegada;

    if (temModalAberto) {
      console.log('⚠️ Modal já aberto');
      return;
    }

    this.mostrarModalSair = true;
  }

  /**
   * ✅ Sair (mobile navbar) - MOBILE ONLY
   */
  sairMobile() {
    this.fecharMenu();
    this.sair();
  }
}
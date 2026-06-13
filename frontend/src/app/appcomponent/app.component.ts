import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { GameReminderService } from '../core/game-reminder.service';
import { NotificationPermissionService } from '../core/notification.permission.service';
import { DeviceService } from '../core/device.service';

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

  constructor(
    public auth: AuthService,
    private router: Router,
    private gameReminder: GameReminderService,
    private notifPermission: NotificationPermissionService,
    public device: DeviceService
  ) {}

  ngOnInit() {
    if (this.auth.logado) {
      this.notifPermission.sincronizarNotificacoes().catch(e => {
        console.error('❌ Erro ao sincronizar:', e);
      });

      // ✅ Verificar notificações dessincronizadas (apenas 1x por sessão)
      const jaVerificou = sessionStorage.getItem('verificou_notif_dessincronizadas');
      if (!jaVerificou) {
        setTimeout(() => {
          this.verificarNotificacoesDessincronizadas();
          sessionStorage.setItem('verificou_notif_dessincronizadas', 'true');
        }, 1000);
      }

      // ✅ Verificar modal PWA (apenas 1x por sessão)
      const jaVerificouPWA = sessionStorage.getItem('verificou_modal_pwa');
      if (!jaVerificouPWA) {
        setTimeout(() => {
          this.verificarModalPWA();
          sessionStorage.setItem('verificou_modal_pwa', 'true');
        }, 2000);
      }
    }
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
   * ✅ Mostra instruções PWA
   */
  mostrarInstrucoesPWA() {
    console.log('📲 Abrindo instruções de como instalar PWA');
    alert('📱 iPhone/iPad: Toque em Compartilhar → Adicionar à Tela de Início\n\n📱 Android: Toque no menu (⋮) → Instalar aplicativo');
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
   * ✅ Sair (desktop)
   */
  sair() {
    if (confirm('Tem certeza que deseja sair?')) {
      this.gameReminder.reset();
      this.auth.logout();
      this.router.navigate(['/entrar']);
    }
  }

  /**
   * ✅ Sair (mobile)
   */
  sairMobile() {
    this.fecharMenu();
    this.sair();
  }
}
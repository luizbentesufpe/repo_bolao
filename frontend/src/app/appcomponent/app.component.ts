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
  template: './app.component.html',
  styles: './app.component.scss'
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

      setTimeout(() => {
        this.verificarNotificacoesDessincronizadas();
      }, 1000);

      setTimeout(() => {
        this.verificarModalPWA();
      }, 2000);
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
   * ✅ Verifica notificações dessincronizadas
   */
  async verificarNotificacoesDessincronizadas() {
    try {
      const status = await this.notifPermission.verificarStatusReal();

      if (status.navegador === 'granted' && !status.banco) {
        console.log('⚠️ Notificação ativa no navegador mas não no banco!');
        this.mostrarModalNotif = true;
        return;
      }

      if (status.navegador === 'denied' && status.banco) {
        console.log('⚠️ Notificação no banco mas negada no navegador!');
        this.mostrarModalNotifNegada = true;
        return;
      }

      if (this.auth.logado && !this.notifPermission.foiPerguntado()) {
        setTimeout(() => {
          this.mostrarModalNotif = true;
          console.log('📬 Modal de notificações exibido');
        }, 2000);
      }

      console.log('✅ Notificações sincronizadas');
    } catch (e) {
      console.error('❌ Erro ao verificar dessincronização:', e);
    }
  }

  ngOnDestroy() {
    this.gameReminder.stop();
  }

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

  tentarNovamente() {
    console.log('🔄 Tentando solicitar permissão novamente...');
    this.ativarNotif();
  }

  fecharModalNegada() {
    this.mostrarModalNotifNegada = false;
    this.notifPermission.marcarComoPerguntado();
  }

  recusarNotif() {
    this.notifPermission.marcarComoPerguntado();
    this.mostrarModalNotif = false;
    console.log('⏭️ Usuário recusou notificações por enquanto');
  }

  sair() {
    if (confirm('Tem certeza que deseja sair?')) {
      this.gameReminder.reset();
      this.auth.logout();
      this.router.navigate(['/entrar']);
    }
  }

  sairMobile() {
    this.fecharMenu();
    this.sair();
  }
}
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { GameReminderService } from './core/game-reminder.service';
import { NotificationPermissionService } from './core/notification.permission.service';
import { DeviceService } from './core/device.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    @if (auth.logado) {
      <header class="topo">
        <div class="topo-inner">
          <!-- ✅ HAMBURGER MENU (apenas mobile) -->
          @if (device.isMobile()) {
            <button class="hamburger" (click)="toggleMenu()" [class.ativo]="menuAberto()">
              <span></span>
              <span></span>
              <span></span>
            </button>
          }

          <div class="logo">BOLÃO <span>DA COPA 2026 - Familia</span></div>

          <!-- ✅ NAV DESKTOP (apenas desktop) -->
          @if (!device.isMobile()) {
            <nav class="nav">
              <a routerLink="/jogos" routerLinkActive="ativo">🎯 Jogos</a>
              <a routerLink="/bolao" routerLinkActive="ativo">📊 Fazer bolão</a>
              <a routerLink="/ranking" routerLinkActive="ativo">🏆 Mais acertos</a>
              <a routerLink="/ranking-jogo" routerLinkActive="ativo">📈 Ranking/Jogo</a>
              <a routerLink="/perfil" routerLinkActive="ativo">👤 Meu Perfil</a>
              @if (auth.usuario()?.email === 'luizfrancisco2000@gmail.com') {
                <a routerLink="/admin-placares" routerLinkActive="ativo" class="admin-link">
                  ⚙️ Admin
                </a>
              }
            </nav>
          }

          <div class="usuario">
            <span>{{ auth.usuario()?.nome }}</span>
            <button (click)="sair()" class="btn-sair">Sair</button>
          </div>
        </div>
      </header>

      <!-- ✅ MENU LATERAL (apenas mobile) -->
      @if (device.isMobile()) {
        <div class="menu-overlay" [class.ativo]="menuAberto()" (click)="fecharMenu()"></div>
        <nav class="menu-lateral" [class.ativo]="menuAberto()">
          <button class="fechar-menu" (click)="fecharMenu()">✕</button>
          
          <div class="usuario-menu">
            <div class="nome">{{ auth.usuario()?.nome }}</div>
            <div class="email">{{ auth.usuario()?.email }}</div>
          </div>

          <a routerLink="/jogos" routerLinkActive="ativo" (click)="fecharMenu()" class="menu-item">
            🎯 Jogos
          </a>
          <a routerLink="/bolao" routerLinkActive="ativo" (click)="fecharMenu()" class="menu-item">
            📊 Fazer bolão
          </a>
          <a routerLink="/ranking" routerLinkActive="ativo" (click)="fecharMenu()" class="menu-item">
            🏆 Mais acertos
          </a>
          <a routerLink="/ranking-jogo" routerLinkActive="ativo" (click)="fecharMenu()" class="menu-item">
            📈 Ranking/Jogo
          </a>
          <a routerLink="/perfil" routerLinkActive="ativo" (click)="fecharMenu()" class="menu-item">
            👤 Meu Perfil
          </a>

          @if (auth.usuario()?.email === 'luizfrancisco2000@gmail.com') {
            <a routerLink="/admin-placares" routerLinkActive="ativo" (click)="fecharMenu()" class="menu-item admin-link">
              ⚙️ Admin
            </a>
          }

          <button (click)="sairMobile()" class="menu-item btn-sair-mobile">
            🚪 Sair
          </button>
        </nav>
      }
    }

    <!-- ✅ MODAL PWA (mobile) -->
    @if (mostrarModalPWA) {
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: 16px;">
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: var(--tinta);">
            📱 Instalar Bolão?
          </h2>
          <p style="color: var(--tinta-fraca); margin-bottom: 20px; line-height: 1.6;">
            Acesse o Bolão da Copa 2026 direto da tela inicial do seu celular! Funciona offline e é muito mais rápido.
          </p>

          <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; color: #666; line-height: 1.6;">
            <strong>📲 Como instalar:</strong><br>
            <br>
            <strong>iPhone/iPad:</strong><br>
            Toque em Compartilhar → Adicionar à Tela de Início
            <br><br>
            <strong>Android:</strong><br>
            Toque no menu (⋮) → Instalar aplicativo
          </div>

          <div style="display: flex; gap: 12px;">
            <button
              (click)="fecharModalPWA()"
              style="flex: 1; padding: 12px; background: #f0f0f0; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; color: #666;">
              Depois
            </button>
            <button
              (click)="mostrarInstrucoesPWA()"
              style="flex: 1; padding: 12px; background: var(--campo); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
              ℹ️ Ver como
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ✅ MODAL NOTIFICAÇÕES -->
    @if (mostrarModalNotif) {
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: 16px;">
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: var(--tinta);">
            🔔 Ativar Notificações?
          </h2>
          <p style="color: var(--tinta-fraca); margin-bottom: 20px; line-height: 1.6;">
            Receba lembretes automáticos 30 minutos e 10 minutos antes de cada jogo para não perder seus palpites!
          </p>
          <div style="display: flex; gap: 12px;">
            <button
              (click)="recusarNotif()"
              style="flex: 1; padding: 12px; background: #f0f0f0; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; color: #666;">
              Agora não
            </button>
            <button
              (click)="ativarNotif()"
              style="flex: 1; padding: 12px; background: var(--campo); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
              ✅ Ativar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ✅ MODAL NOTIFICAÇÕES NEGADAS -->
    @if (mostrarModalNotifNegada) {
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: 16px;">
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: var(--tinta);">
            🔔 Ativar Notificações?
          </h2>
          <p style="color: var(--tinta-fraca); margin-bottom: 16px; line-height: 1.6;">
            As notificações estão desativadas no seu navegador. Para ativá-las:
          </p>
          
          <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; color: #666; line-height: 1.6;">
            <strong>📱 No celular:</strong><br>
            Abra as configurações do navegador → Permissões → Notificações → Ativar
            <br><br>
            <strong>💻 No computador:</strong><br>
            Clique no ícone de cadeado/engrenagem na barra de endereço → Permissões → Notificações → Permitir
          </div>

          <p style="color: var(--tinta-fraca); margin-bottom: 20px; font-size: 14px;">
            Depois volte aqui e clique em "Tentar Novamente"
          </p>

          <div style="display: flex; gap: 12px;">
            <button
              (click)="fecharModalNegada()"
              style="flex: 1; padding: 12px; background: #f0f0f0; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; color: #666;">
              Depois
            </button>
            <button
              (click)="tentarNovamente()"
              style="flex: 1; padding: 12px; background: var(--campo); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
              🔄 Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    }

    <router-outlet />
  `,
  styles: [`
    /* ✅ HEADER */
    .topo {
      background: white;
      border-bottom: 1px solid var(--linha);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .topo-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      font-weight: 700;
      font-size: 18px;
      color: var(--tinta);
    }

    .logo span {
      font-size: 12px;
      color: var(--tinta-fraca);
      display: block;
    }

    .nav {
      display: flex;
      gap: 8px;
      flex: 1;
    }

    .nav a {
      padding: 8px 12px;
      border-radius: 4px;
      text-decoration: none;
      color: var(--tinta);
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .nav a:hover,
    .nav a.ativo {
      background: var(--fundo);
      color: var(--campo);
    }

    .admin-link {
      background: #ff9800 !important;
      color: white !important;
    }

    .usuario {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .usuario span {
      font-size: 14px;
      color: var(--tinta);
    }

    .btn-sair {
      background: var(--vermelho);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s ease;
    }

    .btn-sair:hover {
      opacity: 0.9;
    }

    /* ✅ HAMBURGER MENU */
    .hamburger {
      display: none;
      flex-direction: column;
      background: none;
      border: none;
      cursor: pointer;
      gap: 5px;
      padding: 0;
    }

    .hamburger span {
      width: 24px;
      height: 2px;
      background: var(--tinta);
      border-radius: 2px;
      transition: all 0.3s ease;
    }

    .hamburger.ativo span:nth-child(1) {
      transform: rotate(45deg) translate(8px, 8px);
    }

    .hamburger.ativo span:nth-child(2) {
      opacity: 0;
    }

    .hamburger.ativo span:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -7px);
    }

    /* ✅ MENU LATERAL (mobile) */
    .menu-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .menu-overlay.ativo {
      display: block;
      opacity: 1;
    }

    .menu-lateral {
      display: none;
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      width: 280px;
      background: white;
      z-index: 101;
      flex-direction: column;
      padding: 16px;
      gap: 8px;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    }

    .menu-lateral.ativo {
      transform: translateX(0);
    }

    .fechar-menu {
      align-self: flex-end;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--tinta);
      padding: 4px;
      margin-bottom: 12px;
    }

    .usuario-menu {
      padding: 12px;
      border-bottom: 1px solid var(--linha);
      margin-bottom: 8px;
    }

    .usuario-menu .nome {
      font-weight: 700;
      color: var(--tinta);
      font-size: 16px;
      margin-bottom: 4px;
    }

    .usuario-menu .email {
      font-size: 12px;
      color: var(--tinta-fraca);
    }

    .menu-item {
      padding: 12px 16px;
      border-radius: 6px;
      text-decoration: none;
      color: var(--tinta);
      font-size: 16px;
      font-weight: 600;
      transition: all 0.2s ease;
      display: block;
      cursor: pointer;
      border: none;
      background: none;
      text-align: left;
    }

    .menu-item:hover,
    .menu-item.ativo {
      background: var(--fundo);
      color: var(--campo);
    }

    .menu-item.admin-link {
      background: #ff9800;
      color: white;
    }

    .btn-sair-mobile {
      background: var(--vermelho) !important;
      color: white !important;
      margin-top: auto;
    }

    /* ✅ MOBILE */
    @media (max-width: 768px) {
      .topo-inner {
        gap: 12px;
      }

      .hamburger {
        display: flex;
      }

      .nav {
        display: none;
      }

      .usuario {
        flex-direction: column;
        gap: 8px;
      }

      .usuario span {
        display: none;
      }

      .menu-overlay {
        display: block;
      }

      .menu-lateral {
        display: flex;
      }

      .logo {
        flex: 1;
        text-align: center;
        font-size: 14px;
      }

      .logo span {
        font-size: 10px;
      }
    }
  `]
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
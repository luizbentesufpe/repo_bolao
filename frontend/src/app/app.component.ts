import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { GameReminderService } from './core/game-reminder.service';
import { NotificationPermissionService } from './core/notification.permission.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    @if (auth.logado) {
      <header class="topo">
        <div class="topo-inner">
          <div class="logo">BOLÃO <span>DA COPA 2026 - Familia</span></div>
          <nav class="nav">
            <a routerLink="/jogos" routerLinkActive="ativo">🎯 Jogos</a>
            <a routerLink="/bolao" routerLinkActive="ativo">📊 Fazer bolão</a>
            <a routerLink="/ranking" routerLinkActive="ativo">🏆 Mais acertos</a>
            <a routerLink="/ranking-jogo" routerLinkActive="ativo">📈 Ranking/Jogo</a>
            <!-- ✅ Meu Perfil (sempre visível se logado) -->
            <a routerLink="/perfil" routerLinkActive="ativo">👤 Meu Perfil</a>
            <!-- ✅ Admin (apenas se email for admin) -->
            @if (auth.usuario()?.email === 'luizfrancisco2000@gmail.com') {
              <a routerLink="/admin-placares" routerLinkActive="ativo" class="admin-link">
                ⚙️ Admin
              </a>
            }
          </nav>
          <div class="usuario">
            <span>{{ auth.usuario()?.nome }}</span>
            <button (click)="sair()" class="btn-sair">Sair</button>
          </div>
        </div>
      </header>
    }

    <!-- ✅ MODAL DE PERMISSÃO DE NOTIFICAÇÕES -->
    @if (mostrarModalNotif) {
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999;">
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
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

    <router-outlet />
  `,
  styles: [`
    .admin-link {
      background: #ff9800;
      color: white !important;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 700;
    }
    .admin-link:hover {
      background: #f57c00;
    }
    .btn-sair {
      background: var(--vermelho);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-sair:hover {
      opacity: 0.9;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  mostrarModalNotif = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private gameReminder: GameReminderService,
    private notifPermission: NotificationPermissionService
  ) {}

  ngOnInit() {
    // ✅ SINCRONIZAR notificações (navegador + banco)
    if (this.auth.logado) {
      this.notifPermission.sincronizarNotificacoes().catch(e => {
        console.error('❌ Erro ao sincronizar:', e);
      });
    }

    // ✅ Mostrar modal se usuário logou e não foi perguntado ainda
    if (this.auth.logado && !this.notifPermission.foiPerguntado()) {
      setTimeout(() => {
        this.mostrarModalNotif = true;
        console.log('📬 Modal de notificações exibido');
      }, 2000); // Espera 2 segundos para não incomodar
    }
  }

  ngOnDestroy() {
    // Parar GameReminderService ao sair
    this.gameReminder.stop();
  }

  ativarNotif() {
    this.notifPermission.solicitarPermissao().then(permissao => {
      this.mostrarModalNotif = false;
      if (permissao === 'granted') {
        console.log('✅ Notificações ativadas!');
        this.notifPermission.testarNotificacao();
        // ✅ Sincronizar após ativar
        this.notifPermission.sincronizarNotificacoes();
      } else {
        console.log('⚠️ Notificações bloqueadas pelo usuário');
      }
    });
  }

  recusarNotif() {
    this.notifPermission.marcarComoPerguntado();
    this.mostrarModalNotif = false;
    console.log('⏭️ Usuário recusou notificações por enquanto');
  }

  sair() {
    if (confirm('Tem certeza que deseja sair?')) {
      this.gameReminder.reset();  // ✅ Limpar GameReminderService
      this.auth.logout();
      this.router.navigate(['/entrar']);
    }
  }
}
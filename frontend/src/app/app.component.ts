import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';

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
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}

  sair() {
    if (confirm('Tem certeza que deseja sair?')) {
      this.auth.logout();
      this.router.navigate(['/entrar']);
    }
  }
}
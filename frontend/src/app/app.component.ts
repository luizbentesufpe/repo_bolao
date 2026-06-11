import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.logado) {
      <header class="topo">
        <div class="topo-inner">
          <div class="logo">BOLÃO <span>DA COPA 2026 - Familia</span></div>
          <nav class="nav">
            <a routerLink="/jogos" routerLinkActive="ativo">Jogos</a>
            <a routerLink="/bolao" routerLinkActive="ativo">Fazer bolão</a>
            <a routerLink="/resultados" routerLinkActive="ativo">Resultados</a>
            <a routerLink="/ranking" routerLinkActive="ativo">Mais acertos</a>
          </nav>
          <div class="usuario">
            <span>{{ auth.usuario()?.username }}</span>
            <button (click)="sair()">Sair</button>
          </div>
        </div>
      </header>
    }
    <router-outlet />
  `,
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}

  sair() {
    this.auth.logout();
    this.router.navigate(['/entrar']);
  }
}

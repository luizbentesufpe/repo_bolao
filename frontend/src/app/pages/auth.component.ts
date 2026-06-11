import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>Bolão da Copa 2026 - Familia</h1>
        <p class="sub">Entre para apostar nos placares da fase de grupos.</p>

        <div class="auth-tabs">
          <button [class.ativo]="modo === 'login'" (click)="trocar('login')">Entrar</button>
          <button [class.ativo]="modo === 'cadastro'" (click)="trocar('cadastro')">Criar conta</button>
        </div>

        @if (erro) { <div class="msg-erro">{{ erro }}</div> }

<form (ngSubmit)="enviar()">
          @if (modo === 'cadastro') {
            <div class="campo-form">
              <label for="nome">Nome</label>
              <input id="nome" name="nome" [(ngModel)]="nome" required autocomplete="name" placeholder="Seu nome">
            </div>
          }

          <div class="campo-form">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" [(ngModel)]="email" required autocomplete="email" placeholder="seu@email.com">
          </div>

          <div class="campo-form">
            <label for="senha">Senha</label>
            <input id="senha" name="senha" type="password" [(ngModel)]="senha" required
                   [autocomplete]="modo === 'login' ? 'current-password' : 'new-password'">
          </div>

          <button class="btn btn-amarelo" style="width:100%" [disabled]="enviando">
            {{ modo === 'login' ? 'Entrar' : 'Criar conta e entrar' }}
          </button>
        </form>
        @if (modo === 'login') {
          <p style="text-align: center; margin-top: 14px; font-size: 13px;">
            <a routerLink="/resetar-senha" style="color: var(--campo); text-decoration: none;">Esqueceu a senha?</a>
          </p>
        }
      </div>
    </div>
  `,
})
export class AuthComponent {
  modo: 'login' | 'cadastro' = 'login';
  nome = '';
  email = '';
  senha = '';
  erro = '';
  enviando = false;

  constructor(private auth: AuthService, private router: Router) {}

  trocar(modo: 'login' | 'cadastro') {
    this.modo = modo;
    this.erro = '';
    this.nome = '';
    this.email = '';
    this.senha = '';
  }

  enviar() {
    this.erro = '';
    this.enviando = true;
    const obs = this.modo === 'login'
      ? this.auth.login(this.email, this.senha)
      : this.auth.register(this.nome, this.email, this.senha);
    obs.subscribe({
      next: () => this.router.navigate(['/jogos']),
      error: e => {
        this.erro = e.error?.erro || 'Não foi possível conectar ao servidor.';
        this.enviando = false;
      },
    });
  }
}

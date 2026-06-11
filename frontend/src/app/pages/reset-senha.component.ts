import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-reset-senha',
  standalone: true,
    imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>Recuperar senha</h1>
        <p class="sub">Informe seu email e receba um link para resetar.</p>

        @if (etapa === 'solicitar') {
          @if (erro) { <div class="msg-erro">{{ erro }}</div> }
          @if (ok) { <div class="msg-ok">{{ ok }}</div> }

          <form (ngSubmit)="solicitarReset()">
            <div class="campo-form">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" [(ngModel)]="email" 
                     required autocomplete="email">
            </div>
            <button class="btn btn-amarelo" style="width:100%" [disabled]="enviando">
              Enviar link de reset
            </button>
          </form>

          <p style="text-align: center; margin-top: 16px; font-size: 13px;">
            <a routerLink="/entrar" style="color: var(--campo); text-decoration: none; font-weight: 700;">
              ← Voltar ao login
            </a>
          </p>
        }

        @if (etapa === 'reset') {
          @if (erro) { <div class="msg-erro">{{ erro }}</div> }

          <form (ngSubmit)="resetarSenha()">
            <div class="campo-form">
              <label for="nova_senha">Nova senha</label>
              <input id="nova_senha" name="nova_senha" type="password" [(ngModel)]="novaSenha" 
                     required autocomplete="new-password">
            </div>
            <div class="campo-form">
              <label for="confirma">Confirme a senha</label>
              <input id="confirma" name="confirma" type="password" [(ngModel)]="confirmaSenha" 
                     required autocomplete="new-password">
            </div>
            @if (novaSenha !== confirmaSenha && novaSenha && confirmaSenha) {
              <div class="msg-erro">As senhas não coincidem.</div>
            }
            <button class="btn btn-amarelo" style="width:100%" 
                    [disabled]="enviando || novaSenha !== confirmaSenha || !novaSenha">
              Resetar senha
            </button>
          </form>
        }

        @if (etapa === 'sucesso') {
          <div class="msg-ok" style="text-align: center;">
            <strong>✓ Senha alterada com sucesso!</strong>
            <p style="margin-top: 12px; font-size: 13px;">
              <a routerLink="/entrar" style="color: var(--campo); text-decoration: none; font-weight: 700;">
                Voltar ao login
              </a>
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ResetSenhaComponent {
  etapa: 'solicitar' | 'reset' | 'sucesso' = 'solicitar';
  email = '';
  novaSenha = '';
  confirmaSenha = '';
  erro = '';
  ok = '';
  enviando = false;

  constructor(private auth: AuthService, private router: Router) {
    // Se veio com token na URL, pula pra etapa de reset
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('bolao_reset_token', token);
      this.etapa = 'reset';
    }
  }

  solicitarReset() {
    this.erro = '';
    this.ok = '';
    this.enviando = true;
    this.auth.solicitarReset(this.email).subscribe({
      next: r => {
        this.ok = r.msg;
        this.enviando = false;
      },
      error: e => {
        this.erro = e.error?.erro || 'Erro ao solicitar reset.';
        this.enviando = false;
      },
    });
  }

  resetarSenha() {
    if (this.novaSenha !== this.confirmaSenha) {
      this.erro = 'As senhas não coincidem.';
      return;
    }
    if (this.novaSenha.length < 4) {
      this.erro = 'A senha precisa de pelo menos 4 caracteres.';
      return;
    }

    this.erro = '';
    this.enviando = true;
    this.auth.resetarSenha(this.novaSenha).subscribe({
      next: () => {
        localStorage.removeItem('bolao_reset_token');
        this.etapa = 'sucesso';
        this.enviando = false;
        setTimeout(() => this.router.navigate(['/entrar']), 2000);
      },
      error: e => {
        this.erro = e.error?.erro || 'Erro ao resetar senha.';
        this.enviando = false;
      },
    });
  }
}
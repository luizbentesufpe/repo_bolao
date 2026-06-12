import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">👤 Meu Perfil</h1>

      @if (usuario) {
        <div style="max-width: 500px; margin: 0 auto;">
          <!-- SEÇÃO: INFORMAÇÕES PESSOAIS -->
          <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="font-family: var(--fonte-display); font-size: 16px; margin-bottom: 20px; color: var(--tinta);">
              📋 Informações Pessoais
            </h2>

            <!-- Nome -->
            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--tinta-fraca); text-transform: uppercase; margin-bottom: 8px;">
                Nome Completo
              </label>
              <input 
                [(ngModel)]="novoNome" 
                type="text"
                placeholder="Seu nome"
                style="width: 100%; padding: 12px; border: 1px solid var(--linha); border-radius: 6px; font-size: 14px;">
            </div>

            <!-- Email (readonly) -->
            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--tinta-fraca); text-transform: uppercase; margin-bottom: 8px;">
                Email
              </label>
              <input 
                [value]="usuario.email" 
                type="email"
                disabled
                style="width: 100%; padding: 12px; border: 1px solid var(--linha); border-radius: 6px; font-size: 14px; background: var(--fundo-claro); color: var(--tinta-fraca); cursor: not-allowed;">
              <p style="font-size: 11px; color: var(--tinta-fraca); margin-top: 6px;">
                Email não pode ser alterado por questões de segurança.
              </p>
            </div>

            <button 
              (click)="atualizarNome()" 
              style="width: 100%; padding: 12px; background: var(--campo); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; margin-bottom: 12px;">
              ✅ Atualizar Nome
            </button>
          </div>

          <!-- SEÇÃO: SEGURANÇA -->
          <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="font-family: var(--fonte-display); font-size: 16px; margin-bottom: 20px; color: var(--tinta);">
              🔐 Segurança
            </h2>

            <!-- Senha Atual -->
            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--tinta-fraca); text-transform: uppercase; margin-bottom: 8px;">
                Senha Atual
              </label>
              <input 
                [(ngModel)]="senhaAtual" 
                type="password"
                placeholder="Digite sua senha atual"
                style="width: 100%; padding: 12px; border: 1px solid var(--linha); border-radius: 6px; font-size: 14px;">
            </div>

            <!-- Nova Senha -->
            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--tinta-fraca); text-transform: uppercase; margin-bottom: 8px;">
                Nova Senha
              </label>
              <input 
                [(ngModel)]="novaSenha" 
                type="password"
                placeholder="Mínimo 4 caracteres"
                style="width: 100%; padding: 12px; border: 1px solid var(--linha); border-radius: 6px; font-size: 14px;">
            </div>

            <!-- Confirmar Senha -->
            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--tinta-fraca); text-transform: uppercase; margin-bottom: 8px;">
                Confirmar Nova Senha
              </label>
              <input 
                [(ngModel)]="confirmarSenha" 
                type="password"
                placeholder="Repita a nova senha"
                style="width: 100%; padding: 12px; border: 1px solid var(--linha); border-radius: 6px; font-size: 14px;">
            </div>

            <button 
              (click)="atualizarSenha()" 
              style="width: 100%; padding: 12px; background: var(--vermelho); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
              🔄 Mudar Senha
            </button>
          </div>
        </div>
      }
    </main>
  `,
  styles: []
})
export class PerfilComponent implements OnInit {
  usuario: any = null;
  novoNome = '';
  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    this.usuario = auth.usuario();
    if (!this.usuario) {
      this.router.navigate(['/entrar']);
      return;
    }
    this.novoNome = this.usuario.nome;
  }

  ngOnInit() {}

  atualizarNome() {
    if (!this.novoNome.trim()) {
      alert('❌ Nome não pode estar vazio');
      return;
    }

    // ✅ CORRIGIDO: Usa AuthService
    this.auth.atualizarPerfil({ nome: this.novoNome }).subscribe({
      next: () => {
        alert('✅ Nome atualizado com sucesso!');
      },
      error: (err: any) => {
        alert('❌ Erro ao atualizar: ' + (err.error?.erro || 'Tente novamente'));
      }
    });
  }

  atualizarSenha() {
    if (!this.senhaAtual.trim()) {
      alert('❌ Informe sua senha atual');
      return;
    }
    if (!this.novaSenha.trim() || this.novaSenha.length < 4) {
      alert('❌ Nova senha deve ter mínimo 4 caracteres');
      return;
    }
    if (this.novaSenha !== this.confirmarSenha) {
      alert('❌ Senhas não conferem');
      return;
    }

    // ✅ CORRIGIDO: Usa AuthService
    this.auth.login(this.usuario.email, this.senhaAtual).subscribe({
      next: () => {
        // Agora reseta a senha
        this.auth.resetarSenha(this.novaSenha).subscribe({
          next: () => {
            alert('✅ Senha alterada com sucesso! Faça login novamente.');
            this.auth.logout();
            this.router.navigate(['/entrar']);
          },
          error: (err: any) => {
            alert('❌ Erro ao mudar senha: ' + (err.error?.erro || 'Tente novamente'));
          }
        });
      },
      error: () => {
        alert('❌ Senha atual incorreta');
      }
    });

    this.senhaAtual = '';
    this.novaSenha = '';
    this.confirmarSenha = '';
  }
}
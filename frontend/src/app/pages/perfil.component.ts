import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';
import { NotificationPermissionService } from '../core/notification.permission.service';
import { ConnectionService } from '../core/connection.service';
import { CacheService } from '../core/cache.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="conteudo">
      <!-- ✅ AVISO SEM INTERNET -->
      @if (!online) {
        <div class="aviso-sem-internet">
          <div class="aviso-conteudo">
            <span class="aviso-icone">📡</span>
            <div class="aviso-texto">
              <strong>Sem conexão com a internet</strong>
              <p>Você está usando dados em cache. Os dados serão sincronizados quando a conexão retornar.</p>
            </div>
            <button class="aviso-fechar" (click)="fecharAviso()">✕</button>
          </div>
        </div>
      }

      <!-- ✅ INDICADOR DE SINCRONIZAÇÃO -->
      @if (sincronizando) {
        <div style="padding: 8px 12px; background: #fff8e1; border-left: 4px solid var(--amarelo); margin-bottom: 16px; border-radius: 4px; font-size: 12px; color: #666;">
          🔄 Atualizando dados em tempo real...
        </div>
      }

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

          <!-- SEÇÃO: NOTIFICAÇÕES -->
          <div style="background: linear-gradient(135deg, rgba(66,165,245,0.1) 0%, rgba(25,118,210,0.1) 100%); border: 2px solid #42a5f5; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="font-family: var(--fonte-display); font-size: 16px; margin-bottom: 12px; color: var(--tinta);">
              🔔 Notificações
            </h2>
            
            <p style="font-size: 13px; color: var(--tinta-fraca); margin-bottom: 16px; line-height: 1.6;">
              Receba lembretes automáticos antes de cada jogo.
            </p>

            <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #42a5f5;">
              <div style="font-size: 12px; color: #666;">
                <strong>Status:</strong><br>
                @if (notificacoesAtivas) {
                  <span style="color: var(--campo); font-weight: 700;">✅ Ativadas</span>
                } @else {
                  <span style="color: var(--tinta-fraca);">❌ Desativadas</span>
                }
              </div>
            </div>

            @if (!notificacoesAtivas) {
              <button 
                (click)="ativarNotificacoes()"
                style="width: 100%; padding: 12px; background: #42a5f5; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                🔔 Ativar Notificações
              </button>
            } @else {
              <button 
                (click)="testarNotificacao()"
                style="width: 100%; padding: 12px; background: #42a5f5; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                🧪 Testar Notificação
              </button>
            }
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
  styles: [`
    /* ✅ AVISO SEM INTERNET */
    .aviso-sem-internet {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 12px 16px;
      z-index: 9999;
      animation: slideDown 0.3s ease-out;
    }

    .aviso-conteudo {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 800px;
      margin: 0 auto;
    }

    .aviso-icone {
      font-size: 24px;
      flex-shrink: 0;
    }

    .aviso-texto {
      flex: 1;
      font-size: 13px;
    }

    .aviso-texto strong {
      display: block;
      margin-bottom: 2px;
      font-size: 14px;
    }

    .aviso-texto p {
      margin: 0;
      opacity: 0.9;
      line-height: 1.4;
    }

    .aviso-fechar {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      flex-shrink: 0;
      transition: opacity 0.2s;
    }

    .aviso-fechar:hover {
      opacity: 0.8;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `]
})
export class PerfilComponent implements OnInit, OnDestroy {
  usuario: any = null;
  novoNome = '';
  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';
  notificacoesAtivas = false;
  online = true;
  sincronizando = false;

  private connectionSubscription: Subscription | null = null;
  private avisoDismissed = false;

  constructor(
    private auth: AuthService,
    private notifPermission: NotificationPermissionService,
    private router: Router,
    private connection: ConnectionService,
    private cache: CacheService
  ) {
    this.usuario = auth.usuario();
    if (!this.usuario) {
      this.router.navigate(['/entrar']);
      return;
    }
    this.novoNome = this.usuario.nome;
  }

  ngOnInit() {
    // ✅ VERIFICAR NOTIFICAÇÕES
    this.notificacoesAtivas = this.notifPermission.estaPermitido();

    // ✅ MONITORAR CONEXÃO
    this.connectionSubscription = this.connection.getStatus().subscribe((status: boolean) => {
      this.online = status;
      this.avisoDismissed = false;
    });
  }

  ngOnDestroy() {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

  atualizarNome() {
    if (!this.novoNome.trim()) {
      alert('❌ Nome não pode estar vazio');
      return;
    }

    this.auth.atualizarPerfil({ nome: this.novoNome }).subscribe({
      next: () => {
        alert('✅ Nome atualizado com sucesso!');
      },
      error: (err: any) => {
        alert('❌ Erro ao atualizar: ' + (err.error?.erro || 'Tente novamente'));
      }
    });
  }

  // ✅ ATIVAR NOTIFICAÇÕES
  async ativarNotificacoes() {
    const permissao = await this.notifPermission.solicitarPermissao();
    this.notificacoesAtivas = permissao === 'granted';
    
    if (this.notificacoesAtivas) {
      alert('✅ Notificações ativadas com sucesso!');
      this.notifPermission.testarNotificacao();
    } else {
      alert('⚠️ Notificações foram bloqueadas. Verifique as configurações do navegador.');
    }
  }

  // ✅ TESTAR NOTIFICAÇÃO
  testarNotificacao() {
    this.notifPermission.testarNotificacao();
    alert('📢 Verifique se recebeu a notificação!');
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

    this.auth.login(this.usuario.email, this.senhaAtual).subscribe({
      next: () => {
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

  fecharAviso() {
    this.avisoDismissed = true;
  }
}
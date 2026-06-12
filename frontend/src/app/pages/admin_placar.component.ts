import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Jogo } from '../core/models';
import { BandeiraPipe } from '../core/bandeiras.pipe';

@Component({
  selector: 'app-admin-placares',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BandeiraPipe],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">⚙️ Admin - Placares</h1>

      @if (meuEmail !== 'luizfrancisco2000@gmail.com') {
        <div style="background: #fee; border: 1px solid #c00; padding: 16px; border-radius: 8px; color: #c00; font-weight: 700;">
          ❌ Acesso restrito. Apenas administradores podem acessar esta página.
        </div>
      } @else {
        <p style="color: var(--tinta-fraca); margin-bottom: 20px;">Edite placares dos jogos em caso de falha da API.</p>

        <div style="display: grid; gap: 12px;">
          @for (jogo of jogos; track jogo.id) {
            <div style="padding: 16px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid var(--linha);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <img [src]="jogo.time1.nome | bandeira" style="width: 24px; height: 18px;">
                    <strong>{{ jogo.time1.nome }}</strong>
                    <span style="color: var(--tinta-fraca);">vs</span>
                    <strong>{{ jogo.time2.nome }}</strong>
                    <img [src]="jogo.time2.nome | bandeira" style="width: 24px; height: 18px;">
                  </div>
                  <div style="font-size: 12px; color: var(--tinta-fraca);">
                    {{ jogo.data_hora | date:'dd/MM HH:mm' }}
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  @if (jogo.gols_time1 !== null && jogo.gols_time2 !== null) {
                    <div style="font-family: var(--fonte-placar); font-weight: 700; font-size: 24px; color: var(--campo);">
                      {{ jogo.gols_time1 }} × {{ jogo.gols_time2 }}
                    </div>
                  } @else {
                    <div style="color: var(--tinta-fraca); font-size: 12px;">
                      Sem placar
                    </div>
                  }

                  <button 
                    (click)="abrirEdicao(jogo)" 
                    style="padding: 8px 12px; background: var(--campo); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 12px;">
                    ✏️ Editar
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- MODAL DE EDIÇÃO -->
        @if (jogoEmEdicao) {
          <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;" (click)="jogoEmEdicao = null">
            <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);" (click)="$event.stopPropagation()">
              <h2 style="font-family: var(--fonte-display); margin-bottom: 20px;">
                {{ jogoEmEdicao.time1.nome }} × {{ jogoEmEdicao.time2.nome }}
              </h2>

              <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <div style="flex: 1;">
                  <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--tinta-fraca); text-transform: uppercase;">
                    Gols {{ jogoEmEdicao.time1.nome }}
                  </label>
                  <input 
                    [(ngModel)]="novoGol1" 
                    type="number" 
                    min="0" 
                    max="99"
                    style="width: 100%; padding: 10px; border: 1px solid var(--linha); border-radius: 4px; font-size: 16px; font-weight: 700; font-family: var(--fonte-placar);">
                </div>

                <div style="flex: 1;">
                  <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: var(--tinta-fraca); text-transform: uppercase;">
                    Gols {{ jogoEmEdicao.time2.nome }}
                  </label>
                  <input 
                    [(ngModel)]="novoGol2" 
                    type="number" 
                    min="0" 
                    max="99"
                    style="width: 100%; padding: 10px; border: 1px solid var(--linha); border-radius: 4px; font-size: 16px; font-weight: 700; font-family: var(--fonte-placar);">
                </div>
              </div>

              <div style="display: flex; gap: 12px;">
                <button 
                  (click)="salvarPlacar()" 
                  style="flex: 1; padding: 12px; background: var(--campo); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                  ✅ Salvar
                </button>
                <button 
                  (click)="jogoEmEdicao = null" 
                  style="flex: 1; padding: 12px; background: var(--linha); color: var(--tinta); border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        }
      }
    </main>
  `,
  styles: []
})
export class AdminPlacaresComponent implements OnInit {
  jogos: Jogo[] = [];
  meuEmail = '';
  jogoEmEdicao: Jogo | null = null;
  novoGol1 = 0;
  novoGol2 = 0;

  constructor(private api: ApiService, auth: AuthService) {
    this.meuEmail = auth.usuario()?.email ?? '';
  }

  ngOnInit() {
    this.carregarJogos();
  }

  carregarJogos() {
    this.api.jogos('todos').subscribe(jogos => {
      this.jogos = jogos.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
    });
  }

  abrirEdicao(jogo: Jogo) {
    this.jogoEmEdicao = jogo;
    this.novoGol1 = jogo.gols_time1 ?? 0;
    this.novoGol2 = jogo.gols_time2 ?? 0;
  }

  salvarPlacar() {
    if (!this.jogoEmEdicao) return;

    this.api.salvarResultado(this.jogoEmEdicao.id, this.novoGol1, this.novoGol2).subscribe({
      next: () => {
        alert('✅ Placar atualizado!');
        this.jogoEmEdicao = null;
        this.carregarJogos();
      },
      error: (err) => {
        alert('❌ Erro ao salvar: ' + err.error.erro);
      }
    });
  }
}
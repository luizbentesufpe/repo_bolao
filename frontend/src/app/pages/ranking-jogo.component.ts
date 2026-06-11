import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Jogo, ApostasDoJogo } from '../core/models';
import { AuthService } from '../core/auth.service';
import { BandeiraPipe } from '../core/bandeiras.pipe';

@Component({
  selector: 'app-ranking-jogo',
  standalone: true,
  imports: [DatePipe, FormsModule, CommonModule, BandeiraPipe],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">Ranking por jogo</h1>
      <p class="subtitulo">Veja os palpites de todos em cada partida.</p>

      <!-- FILTROS -->
      <div class="filtros">
        <button [class.ativo]="filtro === 'todos'" (click)="filtro = 'todos'; atualizarLista()">Todos</button>
        <button [class.ativo]="filtro === 'encerrado'" (click)="filtro = 'encerrado'; atualizarLista()">Encerrados</button>
        <button [class.ativo]="filtro === 'ao-vivo'" (click)="filtro = 'ao-vivo'; atualizarLista()">⚽ Ao vivo</button>
        <button [class.ativo]="filtro === 'em-breve'" (click)="filtro = 'em-breve'; atualizarLista()">Em breve</button>
      </div>

      @if (jogosFiltrados.length === 0) {
        <p class="vazio">Nenhum jogo neste filtro.</p>
      }

      <!-- LISTA DE JOGOS PARA SELECIONAR -->
      @for (jogo of jogosFiltrados; track jogo.id) {
        <div class="jogo-card" style="cursor: pointer; position: relative;" (click)="buscar(jogo.id)">
          <div class="jogo-time">
            <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" 
                 style="width: 32px; height: 24px; margin-right: 8px;">
            {{ jogo.time1.nome }}
          </div>

          <div class="placar">
            <span class="digito" [class.vazio]="jogo.gols_time1 === null">
              {{ jogo.gols_time1 ?? '–' }}
            </span>
            <span class="x">×</span>
            <span class="digito" [class.vazio]="jogo.gols_time2 === null">
              {{ jogo.gols_time2 ?? '–' }}
            </span>
          </div>

          <div class="jogo-time dir">
            {{ jogo.time2.nome }}
            <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" 
                 style="width: 32px; height: 24px; margin-left: 8px;">
          </div>

          <div class="jogo-meta">
            {{ jogo.data_hora | date:'dd/MM HH:mm' }}
            
            @if (jogo.encerrado) {
              <span style="color: var(--campo); font-weight: 700; text-transform: uppercase; font-size: 11px;">✓ Encerrado</span>
            } @else if (jogo.comecou) {
              <span style="color: var(--vermelho); font-weight: 700; text-transform: uppercase; font-size: 11px;">⚽ Ao vivo</span>
            } @else {
              <span style="color: #999; font-weight: 700; text-transform: uppercase; font-size: 11px;">📅 Em breve</span>
            }
          </div>

          <!-- CORTINA COM PALPITE DO USUÁRIO -->
          @if (usuariosMeusPalpites[jogo.id]) {
            <div style="position: absolute; inset: 0; background: rgba(14, 122, 60, 0.95); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-family: var(--fonte-placar); font-weight: 700; color: var(--amarelo); backdrop-filter: blur(2px);">
              {{ usuariosMeusPalpites[jogo.id].gols_time1 }} × {{ usuariosMeusPalpites[jogo.id].gols_time2 }}
            </div>
          }
        </div>
      }

      <!-- DETALHE DO JOGO SELECIONADO -->
      @if (detalhe) {
        <div style="margin-top: 40px; padding-top: 28px; border-top: 2px solid var(--linha);">
          <h2 style="font-family: var(--fonte-display); margin-bottom: 20px; text-align: center;">Ranking</h2>

          <!-- STATUS -->
          <div style="text-align: center; margin-bottom: 20px;">
            @if (detalhe.jogo.encerrado) {
              <span style="background: var(--campo); color: white; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">✓ Encerrado</span>
            } @else if (detalhe.jogo.comecou) {
              <span style="background: var(--vermelho); color: white; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">⚽ Ao vivo</span>
            } @else {
              <span style="background: #999; color: white; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">📅 Em breve</span>
            }
          </div>

          <!-- TABELA DO RANKING -->
          @if (detalhe.apostas.length === 0) {
            <p class="vazio">Ninguém apostou neste jogo.</p>
          } @else {
            <table class="tabela">
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Participante</th>
                  <th style="width: 120px;">Palpite</th>
                  @if (detalhe.jogo.encerrado) {
                    <th style="width: 80px;">Pontos</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (aposta of detalhe.apostas; track aposta.id; let idx = $index) {
                  <tr [class.eu]="aposta.username === meuUsername" [class.pos-1]="idx === 0 && detalhe.jogo.encerrado">
                    <td class="num" style="font-size: 18px; font-weight: 700;">
                      @if (detalhe.jogo.encerrado) {
                        @if (idx === 0) { 🥇 } 
                        @else if (idx === 1) { 🥈 } 
                        @else if (idx === 2) { 🥉 } 
                        @else { {{ idx + 1 }} }
                      }
                    </td>
                    <td>
                      <strong>{{ aposta.username }}</strong>
                      @if (aposta.username === meuUsername) { 
                        <span style="color: var(--campo); font-size: 12px;">(você)</span>
                      }
                    </td>
                    <td class="num" style="font-family: var(--fonte-placar); font-weight: 700; font-size: 16px;">
                      <span [style.color]="detalhe.jogo.encerrado && aposta.gols_time1 === detalhe.jogo.gols_time1 && aposta.gols_time2 === detalhe.jogo.gols_time2 ? 'var(--campo)' : ''">
                        {{ aposta.gols_time1 }}×{{ aposta.gols_time2 }}
                      </span>
                      @if (detalhe.jogo.encerrado && aposta.gols_time1 === detalhe.jogo.gols_time1 && aposta.gols_time2 === detalhe.jogo.gols_time2) {
                        <span style="color: var(--campo); margin-left: 6px; font-weight: 700;">✓</span>
                      }
                    </td>
                    @if (detalhe.jogo.encerrado) {
                      <td class="num" style="font-weight: 700; background: #fff8e1; border-radius: 4px;">{{ aposta.pontos }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </main>
  `,
})
export class RankingJogoComponent implements OnInit, OnDestroy {
  jogos: Jogo[] = [];
  jogosFiltrados: Jogo[] = [];
  detalhe: ApostasDoJogo | null = null;
  meuUsername = '';
  filtro: 'todos' | 'encerrado' | 'ao-vivo' | 'em-breve' = 'todos';
  usuariosMeusPalpites: { [key: number]: any } = {};
  private intervaloAtualizacao: any;
  constructor(private api: ApiService, auth: AuthService) {
    this.meuUsername = auth.usuario()?.username ?? '';
  }

  ngOnInit() {
    this.carregarDados();
    this.intervaloAtualizacao = setInterval(() => this.carregarDados(), 10000);
  }
  ngOnDestroy() {
    // Parar o intervalo quando sair da página
    if (this.intervaloAtualizacao) {
      clearInterval(this.intervaloAtualizacao);
    }
  }
  atualizarLista() {
    switch (this.filtro) {
      case 'encerrado':
        this.jogosFiltrados = this.jogos.filter(j => j.encerrado);
        break;
      case 'ao-vivo':
        this.jogosFiltrados = this.jogos.filter(j => j.comecou && !j.encerrado);
        break;
      case 'em-breve':
        this.jogosFiltrados = this.jogos.filter(j => !j.comecou);
        break;
      default:
        this.jogosFiltrados = this.jogos;
    }
  }
private carregarDados() {
  this.api.jogos('todos').subscribe(jogos => {
    this.jogos = jogos.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
    
    // Armazena o palpite do usuário para cada jogo
    jogos.forEach(jogo => {
      if (jogo.minha_aposta) {
        this.usuariosMeusPalpites[jogo.id] = jogo.minha_aposta;
      }
    });
    
    this.atualizarLista();

    // Se tem um jogo selecionado, atualiza também o ranking
    if (this.detalhe) {
      const jogoAtualizado = this.jogos.find(j => j.id === this.detalhe!.jogo.id);
      if (jogoAtualizado) {
        this.buscar(jogoAtualizado.id);
      }
    }
  });
}
  buscar(jogoId: number) {
    this.detalhe = null;
    this.api.apostasDoJogo(jogoId).subscribe(detalhe => {
      detalhe.apostas.sort((a, b) => b.pontos - a.pontos);
      this.detalhe = detalhe;
    });
  }
}
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

      <!-- SUB-FILTROS DE DATA -->
      <div class="filtros" style="margin-top: 12px;">
        <button [class.ativo]="periodo === 'hoje'" (click)="periodo = 'hoje'; atualizarLista()">Hoje</button>
        <button [class.ativo]="periodo === 'semana'" (click)="periodo = 'semana'; atualizarLista()">Próximos 7 dias</button>
        <button [class.ativo]="periodo === 'todos'" (click)="periodo = 'todos'; atualizarLista()">Todos</button>
      </div>

      @if (jogosFiltrados.length === 0) {
        <p class="vazio">Nenhum jogo neste filtro.</p>
      }

      <!-- LISTA AGRUPADA POR DATA -->
      @for (dia of diasAgrupados; track dia.chave) {
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--linha);">
          <h3 style="font-family: var(--fonte-display); font-size: 14px; color: var(--tinta-fraca); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
            {{ dia.data | date:'EEEE, d MMM':'pt-BR' }}
          </h3>

          @for (jogo of dia.jogos; track jogo.id) {
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

              <!-- CORTINA COM SEU PALPITE -->
              @if (usuariosMeusPalpites[jogo.id]) {
                <div (click)="jogoComPalpitesAberto = jogo.id; buscar(jogo.id); $event.stopPropagation()" style="cursor: pointer; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255, 199, 44, 0.9) 0%, rgba(14, 122, 60, 0.9) 100%); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; backdrop-filter: blur(1px);">
                  <span style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Seu palpite</span>
                  <div style="font-size: 28px; font-family: var(--fonte-placar); font-weight: 700; color: white;">
                    {{ usuariosMeusPalpites[jogo.id].gols_time1 }} × {{ usuariosMeusPalpites[jogo.id].gols_time2 }}
                  </div>
                  @if (jogo.encerrado && usuariosMeusPalpites[jogo.id].pontos > 0) {
                    <span style="font-size: 14px; font-weight: 700; color: white; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 999px;">
                      {{ usuariosMeusPalpites[jogo.id].pontos }} pts
                    </span>
                  }
                  <span style="font-size: 11px; color: rgba(255,255,255,0.9); margin-top: 6px; font-weight: 700;">
                    👥 clique para ver dos participantes
                  </span>
                </div>
              } @else {
                <!-- CORTINA SEM PALPITE -->
                <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; text-transform: uppercase;">
                  Sem palpite
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- MODAL COM TODOS OS PALPITES -->
      @if (jogoComPalpitesAberto !== null) {
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;" (click)="jogoComPalpitesAberto = null">
          <div style="background: white; border-radius: 12px; padding: 20px; max-width: 500px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);" (click)="$event.stopPropagation()">
            @if (detalhe && detalhe.jogo.id === jogoComPalpitesAberto) {
              <h3 style="font-family: var(--fonte-display); margin-bottom: 16px; text-align: center;">
                Palpites - {{ detalhe.jogo.time1.nome }} × {{ detalhe.jogo.time2.nome }}
              </h3>
              
              @if (detalhe.jogo.encerrado) {
                <div style="background: var(--campo); color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; text-align: center; font-weight: 700;">
                  🏆 Resultado: {{ detalhe.jogo.gols_time1 }} × {{ detalhe.jogo.gols_time2 }}
                </div>
              }
              
              @if (detalhe.apostas.length === 0) {
                <p style="text-align: center; color: var(--tinta-fraca);">Nenhum palpite registrado</p>
              } @else {
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  @for (aposta of detalhe.apostas; track aposta.id; let idx = $index) {
                    <div style="padding: 12px; background: #f9f9f9; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--linha);">
                      <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          @if (detalhe.jogo.encerrado) {
                            <span style="font-size: 18px; min-width: 24px;">
                              @if (idx === 0) { 🥇 }
                              @else if (idx === 1) { 🥈 }
                              @else if (idx === 2) { 🥉 }
                              @else { {{ idx + 1 }}º }
                            </span>
                          }
                          <strong [style.color]="aposta.email === meuEmail ? 'var(--campo)' : ''">
                            {{ aposta.nome }}
                            @if (aposta.email === meuEmail) {
                              <span style="font-size: 12px; font-weight: 400;"> (você)</span>
                            }
                          </strong>
                        </div>
                      </div>
                      
                      <div style="display: flex; align-items: center; gap: 12px; text-align: right;">
                        <div style="font-family: var(--fonte-placar); font-weight: 700; font-size: 18px;">
                          {{ aposta.gols_time1 }}×{{ aposta.gols_time2 }}
                          @if (detalhe.jogo.encerrado && aposta.gols_time1 === detalhe.jogo.gols_time1 && aposta.gols_time2 === detalhe.jogo.gols_time2) {
                            <span style="color: var(--campo); margin-left: 4px;">✓</span>
                          }
                        </div>
                        
                        @if (detalhe.jogo.encerrado) {
                          <div style="font-weight: 700; color: var(--campo); min-width: 50px; background: #fff8e1; padding: 4px 8px; border-radius: 4px; text-align: center;">
                            {{ aposta.pontos }}pts
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
              
              <button (click)="jogoComPalpitesAberto = null" style="width: 100%; margin-top: 16px; padding: 12px; background: var(--campo); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                Fechar
              </button>
            }
          </div>
        </div>
      }

      <!-- DETALHE DO JOGO SELECIONADO (FORA DO @for) -->
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
                  <tr [class.eu]="aposta.email === meuEmail" [class.pos-1]="idx === 0 && detalhe.jogo.encerrado">
                    <td class="num" style="font-size: 18px; font-weight: 700;">
                      @if (detalhe.jogo.encerrado) {
                        @if (idx === 0) { 🥇 } 
                        @else if (idx === 1) { 🥈 } 
                        @else if (idx === 2) { 🥉 } 
                        @else { {{ idx + 1 }} }
                      }
                    </td>
                    <td>
                      <strong>{{ aposta.nome }}</strong>
                      @if (aposta.email === meuEmail) {
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
  styles: [`
    .jogo-card {
      min-height: 100px;
    }
  `]
})
export class RankingJogoComponent implements OnInit, OnDestroy {
  jogos: Jogo[] = [];
  jogosFiltrados: Jogo[] = [];
  detalhe: ApostasDoJogo | null = null;
  meuEmail = '';
  filtro: 'todos' | 'encerrado' | 'ao-vivo' | 'em-breve' = 'todos';
  periodo: 'hoje' | 'semana' | 'todos' = 'todos';
  diasAgrupados: { chave: string; data: Date; jogos: Jogo[] }[] = [];
  usuariosMeusPalpites: { [key: number]: any } = {};
  jogoComPalpitesAberto: number | null = null;
  private intervaloAtualizacao: any;

  constructor(private api: ApiService, auth: AuthService) {
    this.meuEmail = auth.usuario()?.email ?? '';
  }

  ngOnInit() {
    this.carregarDados();
    this.intervaloAtualizacao = setInterval(() => this.carregarDados(), 10000);
  }

  ngOnDestroy() {
    if (this.intervaloAtualizacao) {
      clearInterval(this.intervaloAtualizacao);
    }
  }

  atualizarLista() {
    let jogos = this.jogos;
    
    switch (this.filtro) {
      case 'encerrado':
        jogos = jogos.filter(j => j.encerrado);
        break;
      case 'ao-vivo':
        jogos = jogos.filter(j => j.comecou && !j.encerrado);
        break;
      case 'em-breve':
        jogos = jogos.filter(j => !j.comecou);
        break;
      default:
        jogos = jogos;
    }

    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const proximaSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (this.periodo) {
      case 'hoje':
        jogos = jogos.filter(j => {
          const dataJogo = new Date(j.data_hora);
          const diaJogo = new Date(dataJogo.getFullYear(), dataJogo.getMonth(), dataJogo.getDate());
          return diaJogo.getTime() === hoje.getTime();
        });
        break;
      case 'semana':
        jogos = jogos.filter(j => {
          const dataJogo = new Date(j.data_hora);
          return dataJogo >= hoje && dataJogo <= proximaSemana;
        });
        break;
      default:
        jogos = jogos;
    }

    this.jogosFiltrados = jogos;
    this.agruparPorData();
  }

  private agruparPorData() {
    const mapa = new Map<string, Jogo[]>();
    
    this.jogosFiltrados.forEach(jogo => {
      const dataLocal = new Date(jogo.data_hora);
      const chave = dataLocal.toLocaleDateString('pt-BR')
        .split('/').reverse().join('-');
      
      if (!mapa.has(chave)) {
        mapa.set(chave, []);
      }
      mapa.get(chave)!.push(jogo);
    });

    this.diasAgrupados = [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([chave, jogos]) => {
        const data = new Date(chave + 'T00:00:00');
        return { chave, data, jogos };
      });
  }

  private carregarDados() {
    this.api.jogos('todos').subscribe(jogos => {
      this.jogos = jogos.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
      
      jogos.forEach(jogo => {
        if (jogo.minha_aposta) {
          this.usuariosMeusPalpites[jogo.id] = jogo.minha_aposta;
        }
      });
      
      this.atualizarLista();

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
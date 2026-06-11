import { Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Jogo } from '../core/models';
import { BandeiraPipe } from '../core/bandeiras.pipe';

interface JogoComPalpite extends Jogo {
  palpite1: number | null;
  palpite2: number | null;
  salvando: boolean;
  salvo: boolean;
  erro: string;
}

@Component({
  selector: 'app-bolao',
  standalone: true,
  imports: [DatePipe, FormsModule, CommonModule, BandeiraPipe],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">Fazer bolão</h1>
      <p class="subtitulo">
        Dê seu palpite até a bola rolar. Placar exato vale 5 pontos,
        acertar o vencedor vale 4 e acertar o empate vale 2.
      </p>

      @if (carregando) {
        <p class="vazio">Carregando jogos…</p>
      } @else if (dias.length === 0) {
        <p class="vazio">Nenhum jogo no momento.</p>
      }

      @for (dia of dias; track dia.chave) {
        <!-- JOGOS ABERTOS -->
        @if (dia.jogosAbertos.length > 0) {
          <div class="dia-grupo">
            <span class="rotulo">{{ dia.data | date:'EEEE, d \\'de\\' MMMM' }}</span>
          </div>

          @for (jogo of dia.jogosAbertos; track jogo.id) {
            <article class="jogo-card">
              <div class="jogo-time">
                <img [src]="jogo.time1.nome | bandeira" 
                     [alt]="jogo.time1.nome" 
                     style="width: 32px; height: 24px; margin-right: 8px;">
                {{ jogo.time1.nome }}
              </div>

              <div class="placar">
                <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite1" 
                       [disabled]="!estaAberto(jogo)"
                       [attr.aria-label]="'Gols de ' + jogo.time1.nome">
                <span class="x">×</span>
                <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite2" 
                       [disabled]="!estaAberto(jogo)"
                       [attr.aria-label]="'Gols de ' + jogo.time2.nome">
              </div>

              <div class="jogo-time dir">
                {{ jogo.time2.nome }}
                <img [src]="jogo.time2.nome | bandeira" 
                     [alt]="jogo.time2.nome" 
                     style="width: 32px; height: 24px; margin-left: 8px;">
              </div>

              <div class="jogo-meta">
                <span>{{ jogo.data_hora | date:'HH:mm' }}</span>
                <span>{{ jogo.estadio }} — {{ jogo.cidade_estado }}</span>
                <span style="margin-left:auto; display:flex; gap:8px; align-items:center;">
                  @if (jogo.erro) { 
                    <span style="color:var(--vermelho); font-size:12px;">{{ jogo.erro }}</span> 
                  }
                  @if (jogo.salvo) { 
                    <span style="color:var(--campo); font-weight:700; font-size:12px;">Palpite salvo ✓</span> 
                  }
                  <button class="btn" (click)="salvar(jogo)"
                          [disabled]="!estaAberto(jogo) || jogo.salvando || jogo.palpite1 === null || jogo.palpite2 === null"
                          style="font-size:12px; padding:8px 12px;">
                    {{ jogo.minha_aposta ? 'Atualizar' : 'Salvar' }}
                  </button>
                </span>
              </div>
            </article>
          }
        }

        <!-- JOGOS ENCERRADOS (CORTINA) -->
        @if (dia.jogosEncerrados.length > 0) {
          <div class="cortina-encerrados">
            <button class="btn-cortina" (click)="dia.expandido = !dia.expandido">
              {{ dia.expandido ? '▼' : '▶' }} 🏁 {{ dia.jogosEncerrados.length }} jogo(s) encerrado(s)
            </button>

            @if (dia.expandido) {
              <div class="jogos-expandidos">
                @for (jogo of dia.jogosEncerrados; track jogo.id) {
                  <article class="jogo-card encerrado">
                    <div class="jogo-time">
                      <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" 
                           style="width: 32px; height: 24px; margin-right: 8px;">
                      {{ jogo.time1.nome }}
                    </div>

                    <div class="placar">
                      <span class="digito">{{ jogo.gols_time1 }}</span>
                      <span class="x">×</span>
                      <span class="digito">{{ jogo.gols_time2 }}</span>
                    </div>

                    <div class="jogo-time dir">
                      {{ jogo.time2.nome }}
                      <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" 
                           style="width: 32px; height: 24px; margin-left: 8px;">
                    </div>

                    <div class="jogo-meta">
                      <span style="font-size: 12px; color: #999;">{{ jogo.data_hora | date:'HH:mm' }}</span>

                      @if (jogo.minha_aposta && jogo.minha_aposta.gols_time1 !== null && jogo.minha_aposta.gols_time2 !== null) { 
                        <span class="pontos-chip" [class.cheio]="jogo.minha_aposta.pontos > 0">
                          {{ jogo.minha_aposta.gols_time1 }}×{{ jogo.minha_aposta.gols_time2 }}
                          · {{ jogo.minha_aposta.pontos }} pts
                        </span>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          </div>
        }
      }
    </main>
  `,
  styles: [`
    .cortina-encerrados {
      margin: 20px 0;
      border-top: 2px dashed #ddd;
      padding-top: 16px;
    }
    .btn-cortina {
      width: 100%;
      padding: 12px 16px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .btn-cortina:hover {
      background: #eee;
    }
    .jogos-expandidos {
      margin-top: 12px;
      animation: expandDown 0.3s ease-out;
    }
    @keyframes expandDown {
      from {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
      }
      to {
        opacity: 1;
        max-height: 5000px;
      }
    }
    .jogo-card.encerrado {
      opacity: 0.7;
      background: #fafafa;
    }
  `]
})
export class BolaoComponent implements OnInit, OnDestroy {
  dias: { 
    chave: string; 
    data: string; 
    jogosAbertos: JogoComPalpite[];
    jogosEncerrados: JogoComPalpite[];
    expandido: boolean;
  }[] = [];
  carregando = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.carregarJogos();
  }

  ngOnDestroy() {}

  private carregarJogos() {
    this.api.jogos('todos').subscribe(jogos => {
      const jogosFiltrados = jogos.map(j => ({
        ...j,
        palpite1: j.minha_aposta?.gols_time1 ?? null,
        palpite2: j.minha_aposta?.gols_time2 ?? null,
        salvando: false,
        salvo: false,
        erro: '',
      }));

      const mapa = new Map<string, { abertos: JogoComPalpite[], encerrados: JogoComPalpite[] }>();
      
      for (const j of jogosFiltrados) {
        const dataLocal = new Date(j.data_hora);
        const chave = dataLocal.toLocaleDateString('pt-BR')
          .split('/').reverse().join('-');
        
        if (!mapa.has(chave)) mapa.set(chave, { abertos: [], encerrados: [] });
        
        if (j.encerrado) {
          mapa.get(chave)!.encerrados.push(j);
        } else {
          mapa.get(chave)!.abertos.push(j);
        }
      }

      this.dias = [...mapa.entries()].map(([chave, { abertos, encerrados }]) => ({
        chave,
        data: [...abertos, ...encerrados][0].data_hora,
        jogosAbertos: abertos,
        jogosEncerrados: encerrados,
        expandido: false
      }));

      this.carregando = false;
    });
  }

  estaAberto(jogo: JogoComPalpite): boolean {
    const agora = new Date().getTime();
    const inicio = new Date(jogo.data_hora).getTime();
    return agora < inicio;
  }

  salvar(jogo: JogoComPalpite) {
    if (!this.estaAberto(jogo)) {
      jogo.erro = 'Apostas encerradas: o jogo já começou.';
      return;
    }
    
    jogo.salvando = true;
    jogo.salvo = false;
    jogo.erro = '';

    this.api.salvarAposta(jogo.id, jogo.palpite1!, jogo.palpite2!).subscribe({
      next: aposta => {
        jogo.minha_aposta = aposta;
        jogo.salvando = false;
        jogo.salvo = true;
        setTimeout(() => (jogo.salvo = false), 3000);
      },
      error: e => {
        jogo.erro = e.error?.erro || 'Falha ao salvar.';
        jogo.salvando = false;
      },
    });
  }
}
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
        <p class="vazio">Nenhum jogo aberto para apostas no momento.</p>
      }

      @for (dia of dias; track dia.chave) {
        <div class="dia-grupo">
          <span class="rotulo">{{ dia.data | date:'EEEE, d \\'de\\' MMMM' }}</span>
        </div>

        @for (jogo of dia.jogos; track jogo.id) {
          <article class="jogo-card">
            <div class="jogo-time">
              <img [src]="jogo.time1.nome | bandeira" 
                   [alt]="jogo.time1.nome" 
                   style="width: 32px; height: 24px; margin-right: 8px;">
              {{ jogo.time1.nome }}
            </div>

            <div class="placar">
              <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite1" [disabled]="jogo.comecou"
                     [attr.aria-label]="'Gols de ' + jogo.time1.nome">
              <span class="x">×</span>
              <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite2" [disabled]="jogo.comecou"
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
                        [disabled]="jogo.comecou || jogo.salvando || jogo.palpite1 === null || jogo.palpite2 === null"
                        style="font-size:12px; padding:8px 12px;">
                  {{ jogo.minha_aposta ? 'Atualizar' : 'Salvar' }}
                </button>
              </span>
            </div>
          </article>
        }
      }
    </main>
  `,
})
export class BolaoComponent implements OnInit, OnDestroy {
  dias: { chave: string; data: string; jogos: JogoComPalpite[] }[] = [];
  carregando = true;
  private intervaloAtualizacao: any;  // ✅ ADICIONE

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.carregarJogos();
    // ✅ ADICIONE: recarrega a cada 30 segundos
    this.intervaloAtualizacao = setInterval(() => this.carregarJogos(), 30000);
  }

  ngOnDestroy() {
    if (this.intervaloAtualizacao) {
      clearInterval(this.intervaloAtualizacao);
    }
  }

  private carregarJogos() {
    this.api.jogos('todos').subscribe(jogos => {
      const jogosFiltrados = jogos
        .filter(j => !j.comecou)  // Remove jogos que começaram
        .map(j => ({
          ...j,
          palpite1: j.minha_aposta?.gols_time1 ?? null,
          palpite2: j.minha_aposta?.gols_time2 ?? null,
          salvando: false,
          salvo: false,
          erro: '',
        }));

      const mapa = new Map<string, JogoComPalpite[]>();
      for (const j of jogosFiltrados) {
        const dataLocal = new Date(j.data_hora);
        const chave = dataLocal.toLocaleDateString('pt-BR')
          .split('/').reverse().join('-');
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave)!.push(j);
      }

      this.dias = [...mapa.entries()].map(([chave, lista]) => ({
        chave,
        data: lista[0].data_hora,
        jogos: lista,
      }));

      this.carregando = false;
    });
  }

  salvar(jogo: JogoComPalpite) {
    if (jogo.comecou) {  // ✅ BLOQUEIE se começou
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
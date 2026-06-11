import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Jogo } from '../core/models';

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
  imports: [DatePipe, FormsModule],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">Fazer bolão</h1>
      <p class="subtitulo">
        Dê seu palpite até a bola rolar. Placar exato vale 5 pontos,
        acertar o vencedor vale 4 e acertar o empate vale 2.
      </p>

      @if (carregando) { <p class="vazio">Carregando jogos…</p> }
      @else if (jogos.length === 0) {
        <p class="vazio">Nenhum jogo aberto para apostas no momento.</p>
      }

      @for (jogo of jogos; track jogo.id) {
        <article class="jogo-card">
          <div class="jogo-time">{{ jogo.time1.nome }}</div>
          <div class="placar">
            <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite1"
                   [attr.aria-label]="'Gols de ' + jogo.time1.nome">
            <span class="x">×</span>
            <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite2"
                   [attr.aria-label]="'Gols de ' + jogo.time2.nome">
          </div>
          <div class="jogo-time dir">{{ jogo.time2.nome }}</div>

          <div class="jogo-meta">
            <span>{{ jogo.data_hora | date:'dd/MM HH:mm' }}</span>
            <span>{{ jogo.estadio }}</span>
            <span style="margin-left:auto; display:flex; gap:8px; align-items:center;">
              @if (jogo.erro) { <span style="color:var(--vermelho)">{{ jogo.erro }}</span> }
              @if (jogo.salvo) { <span style="color:var(--campo); font-weight:700">Palpite salvo ✓</span> }
              <button class="btn" (click)="salvar(jogo)"
                      [disabled]="jogo.salvando || jogo.palpite1 === null || jogo.palpite2 === null">
                {{ jogo.minha_aposta ? 'Atualizar palpite' : 'Salvar palpite' }}
              </button>
            </span>
          </div>
        </article>
      }
    </main>
  `,
})
export class BolaoComponent implements OnInit {
  jogos: JogoComPalpite[] = [];
  carregando = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.jogos('todos').subscribe(jogos => {
      this.jogos = jogos
        .filter(j => !j.comecou)
        .map(j => ({
          ...j,
          palpite1: j.minha_aposta?.gols_time1 ?? null,
          palpite2: j.minha_aposta?.gols_time2 ?? null,
          salvando: false, salvo: false, erro: '',
        }));
      this.carregando = false;
    });
  }

  salvar(jogo: JogoComPalpite) {
    jogo.salvando = true;
    jogo.salvo = false;
    jogo.erro = '';
    this.api.salvarAposta(jogo.id, jogo.palpite1!, jogo.palpite2!).subscribe({
      next: aposta => {
        jogo.minha_aposta = aposta;
        jogo.salvando = false;
        jogo.salvo = true;
      },
      error: e => {
        jogo.erro = e.error?.erro || 'Falha ao salvar.';
        jogo.salvando = false;
      },
    });
  }
}

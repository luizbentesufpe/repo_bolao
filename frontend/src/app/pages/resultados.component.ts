import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ApostasDoJogo, Jogo } from '../core/models';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">Resultados do bolão</h1>
      <p class="subtitulo">Escolha um jogo e veja quanto cada participante marcou nele.</p>

      <div class="campo-form" style="max-width:480px">
        <label for="jogo">Jogo</label>
        <select id="jogo" [(ngModel)]="jogoSelecionado" (ngModelChange)="buscar()"
                style="width:100%; padding:11px 12px; border:1px solid var(--linha); border-radius:6px; font-family:inherit; font-size:14px;">
          <option [ngValue]="null">Selecione um jogo…</option>
          @for (jogo of jogos; track jogo.id) {
            <option [ngValue]="jogo.id">
              {{ jogo.data_hora | date:'dd/MM' }} — {{ jogo.time1.nome }} × {{ jogo.time2.nome }}
            </option>
          }
        </select>
      </div>

      @if (detalhe) {
        <article class="jogo-card" style="margin-top:18px">
          <div class="jogo-time">{{ detalhe.jogo.time1.nome }}</div>
          <div class="placar">
            <span class="digito" [class.vazio]="detalhe.jogo.gols_time1 === null">{{ detalhe.jogo.gols_time1 ?? '–' }}</span>
            <span class="x">×</span>
            <span class="digito" [class.vazio]="detalhe.jogo.gols_time2 === null">{{ detalhe.jogo.gols_time2 ?? '–' }}</span>
          </div>
          <div class="jogo-time dir">{{ detalhe.jogo.time2.nome }}</div>
          <div class="jogo-meta">
            <span>{{ detalhe.jogo.data_hora | date:'dd/MM HH:mm' }}</span>
            <span>{{ detalhe.jogo.estadio }} — {{ detalhe.jogo.cidade_estado }}</span>
            @if (!detalhe.jogo.encerrado && detalhe.liberado) { <span class="tag-hoje">Aguardando placar final</span> }
          </div>
        </article>

        @if (!detalhe.liberado) {
          <p class="vazio">As apostas dos participantes aparecem aqui quando a bola rolar. 🤫</p>
        } @else if (detalhe.apostas.length === 0) {
          <p class="vazio">Ninguém apostou neste jogo.</p>
        } @else {
          <table class="tabela" style="margin-top:14px">
            <thead>
              <tr><th>Participante</th><th>Palpite</th><th>Pontos</th></tr>
            </thead>
            <tbody>
              @for (aposta of detalhe.apostas; track aposta.id) {
                <tr [class.eu]="aposta.username === meuUsername">
                  <td>{{ aposta.username }} @if (aposta.username === meuUsername) { (você) }</td>
                  <td class="num">{{ aposta.gols_time1 }} × {{ aposta.gols_time2 }}</td>
                  <td class="num">{{ detalhe.jogo.encerrado ? aposta.pontos : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </main>
  `,
})
export class ResultadosComponent implements OnInit {
  jogos: Jogo[] = [];
  jogoSelecionado: number | null = null;
  detalhe: ApostasDoJogo | null = null;
  meuUsername = '';

  constructor(private api: ApiService, auth: AuthService) {
    this.meuUsername = auth.usuario()?.username ?? '';
  }

  ngOnInit() {
    this.api.jogos('todos').subscribe(jogos => (this.jogos = jogos));
  }

  buscar() {
    this.detalhe = null;
    if (this.jogoSelecionado == null) return;
    this.api.apostasDoJogo(this.jogoSelecionado)
      .subscribe(detalhe => (this.detalhe = detalhe));
  }
}

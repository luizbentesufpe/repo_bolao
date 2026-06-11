import { Component, OnInit } from '@angular/core';
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
      <p class="subtitulo">Veja quem acertou mais em cada partida.</p>

      <div class="campo-form" style="max-width:480px">
        <label for="jogo">Selecione um jogo</label>
        <select id="jogo" [(ngModel)]="jogoSelecionado" (ngModelChange)="buscar()"
                style="width:100%; padding:11px 12px; border:1px solid var(--linha); border-radius:6px; font-family:inherit; font-size:14px;">
          <option [ngValue]="null">Escolha um jogo…</option>
          @for (jogo of jogos; track jogo.id) {
            <option [ngValue]="jogo.id">
              {{ jogo.time1.nome }} × {{ jogo.time2.nome }} — {{ jogo.data_hora | date:'dd/MM HH:mm' }}
            </option>
          }
        </select>
      </div>

      @if (detalhe && detalhe.jogo.encerrado) {
        <!-- PLACAR REAL EM DESTAQUE -->
        <div style="margin-top: 28px; text-align: center;">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 8px;">
            <div style="text-align: right;">
              <img [src]="detalhe.jogo.time1.nome | bandeira" [alt]="detalhe.jogo.time1.nome" 
                   style="width: 48px; height: 36px; margin-right: 12px;">
              <strong style="font-size: 16px;">{{ detalhe.jogo.time1.nome }}</strong>
            </div>

            <div class="placar" style="transform: scale(1.8); margin: 0 12px;">
              <span class="digito">{{ detalhe.jogo.gols_time1 }}</span>
              <span class="x">×</span>
              <span class="digito">{{ detalhe.jogo.gols_time2 }}</span>
            </div>

            <div style="text-align: left;">
              <strong style="font-size: 16px;">{{ detalhe.jogo.time2.nome }}</strong>
              <img [src]="detalhe.jogo.time2.nome | bandeira" [alt]="detalhe.jogo.time2.nome" 
                   style="width: 48px; height: 36px; margin-left: 12px;">
            </div>
          </div>
          <p style="color: var(--tinta-fraca); font-size: 13px; margin-top: 8px;">
            {{ detalhe.jogo.data_hora | date:'dd/MM HH:mm' }} — {{ detalhe.jogo.estadio }}
          </p>
        </div>

        <!-- RANKING ABAIXO -->
        <div style="margin-top: 28px;">
          <h3 style="font-family: var(--fonte-display); margin-bottom: 12px; text-align: center;">Quem acertou</h3>
          
          @if (detalhe.apostas.length === 0) {
            <p class="vazio">Ninguém apostou neste jogo.</p>
          } @else {
            <table class="tabela">
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Participante</th>
                  <th style="width: 120px;">Seu palpite</th>
                  <th style="width: 80px;">Pontos</th>
                </tr>
              </thead>
              <tbody>
                @for (aposta of detalhe.apostas; track aposta.id; let idx = $index) {
                  <tr [class.eu]="aposta.username === meuUsername" [class.pos-1]="idx === 0">
                    <td class="num" style="font-size: 18px; font-weight: 700;">
                      @if (idx === 0) { 🥇 } 
                      @else if (idx === 1) { 🥈 } 
                      @else if (idx === 2) { 🥉 } 
                      @else { {{ idx + 1 }} }
                    </td>
                    <td>
                      <strong>{{ aposta.username }}</strong>
                      @if (aposta.username === meuUsername) { 
                        <span style="color: var(--campo); font-size: 12px;">(você)</span>
                      }
                    </td>
                    <td class="num" style="font-family: var(--fonte-placar); font-weight: 700; font-size: 16px;">
                      <span [style.color]="aposta.gols_time1 === detalhe.jogo.gols_time1 && aposta.gols_time2 === detalhe.jogo.gols_time2 ? 'var(--campo)' : ''">
                        {{ aposta.gols_time1 }}×{{ aposta.gols_time2 }}
                      </span>
                      @if (aposta.gols_time1 === detalhe.jogo.gols_time1 && aposta.gols_time2 === detalhe.jogo.gols_time2) {
                        <span style="color: var(--campo); margin-left: 6px; font-weight: 700;">✓</span>
                      }
                    </td>
                    <td class="num" style="font-weight: 700; background: #fff8e1; border-radius: 4px;">{{ aposta.pontos }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      @if (detalhe && !detalhe.jogo.encerrado) {
        <p class="vazio" style="margin-top: 20px;">
          Este jogo ainda não terminou. O ranking aparecerá após o resultado.
        </p>
      }
    </main>
  `,
})
export class RankingJogoComponent implements OnInit {
  jogos: Jogo[] = [];
  jogoSelecionado: number | null = null;
  detalhe: ApostasDoJogo | null = null;
  meuUsername = '';

  constructor(private api: ApiService, auth: AuthService) {
    this.meuUsername = auth.usuario()?.username ?? '';
  }

  ngOnInit() {
    this.api.jogos('todos').subscribe(jogos => {
      this.jogos = jogos.filter(j => j.encerrado)
        .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
    });
  }

  buscar() {
    this.detalhe = null;
    if (this.jogoSelecionado == null) return;
    
    this.api.apostasDoJogo(this.jogoSelecionado).subscribe(detalhe => {
      detalhe.apostas.sort((a, b) => b.pontos - a.pontos);
      this.detalhe = detalhe;
    });
  }
}
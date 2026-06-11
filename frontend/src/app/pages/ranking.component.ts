import { Component, OnInit } from '@angular/core';
import { ApiService } from '../core/api.service';
import { RankingItem } from '../core/models';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">Mais acertos</h1>
      <p class="subtitulo">Classificação geral do bolão: pontos, placares exatos e apostas que pontuaram.</p>

      @if (carregando) { <p class="vazio">Calculando o ranking…</p> }
      @else if (itens.length === 0) {
        <p class="vazio">Ainda não há jogos com resultado lançado. O ranking aparece depois da primeira rodada.</p>
      } @else {
        <table class="tabela">
          <thead>
            <tr>
              <th>#</th><th>Participante</th><th>Pontos</th>
              <th>Placares exatos</th><th>Apostas certas</th><th>Apostas pontuadas</th>
            </tr>
          </thead>
          <tbody>
            @for (item of itens; track item.username) {
              <tr [class.eu]="item.username === meuUsername" [class.pos-1]="item.posicao === 1">
                <td class="num">{{ item.posicao === 1 ? '🏆' : item.posicao }}</td>
                <td>{{ item.username }} @if (item.username === meuUsername) { (você) }</td>
                <td class="num">{{ item.pontos }}</td>
                <td class="num">{{ item.exatos }}</td>
                <td class="num">{{ item.acertos }}</td>
                <td class="num">{{ item.apostas }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </main>
  `,
})
export class RankingComponent implements OnInit {
  itens: RankingItem[] = [];
  carregando = true;
  meuUsername = '';

  constructor(private api: ApiService, auth: AuthService) {
    this.meuUsername = auth.usuario()?.username ?? '';
  }

  ngOnInit() {
    this.api.ranking().subscribe(itens => {
      this.itens = itens;
      this.carregando = false;
    });
  }
}

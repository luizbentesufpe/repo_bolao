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

    @if (peFreio) {
      <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 12px; margin: 16px 0; border-radius: 8px; text-align: center;">
        <p style="font-size: 18px; font-weight: bold; color: #856404;">
          🥶 <strong>{{ peFreio }}</strong> é o MAIOR PÉ FRIO! 🥶
        </p>
      </div>
    }

    @if (carregando) { <p class="vazio">Calculando o ranking…</p> }
      @else if (itens.length === 0) {
        <p class="vazio">Ainda não há jogos com resultado lançado. O ranking aparece depois da primeira rodada.</p>
      } @else {
        <table class="tabela">
          <thead>
        <tr>
          <th>#</th>
          <th>Participante</th>
          <th>Pontos</th>
          <th>Placares exatos</th>
          <th>Apostas certas</th>
          <th>Apostas pontuadas</th>
          <th>Apostas totais</th>
          <th>Pé frio 🥶</th>
        </tr>
      </thead>
      <tbody>
        @for (item of itens; track item.nome) {
          <tr [class.eu]="item.nome === meuNome" [class.pos-1]="item.posicao === 1">
            <td class="num">{{ item.posicao === 1 ? '🏆' : item.posicao }}</td>
            <td>{{ item.nome }} @if (item.nome === meuNome) { (você) }</td>
            <td class="num">{{ item.pontos }}</td>
            <td class="num">{{ item.exatos }}</td>
            <td class="num">{{ item.acertos }}</td>
            <td class="num">{{ item.apostas_pontuadas }}</td>
            <td class="num">{{ item.apostas }}</td>
            <td class="num">🥶 {{ item.apostas - item.apostas_pontuadas }}</td>
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
  meuNome = '';
  peFreio: string = '';  // ✅ Adicione

  constructor(private api: ApiService, auth: AuthService) {
    this.meuNome = auth.usuario()?.nome ?? '';
  }

  ngOnInit() {
    this.api.ranking().subscribe(itens => {
      this.itens = itens;
      
      // ✅ Encontra quem tem mais pé frio
      const piorAcerto = itens.reduce((pior, atual) => {
        const peFreioAtual = atual.apostas - atual.apostas_pontuadas;
        const peFreioPior = pior.apostas - pior.apostas_pontuadas;
        return peFreioAtual > peFreioPior ? atual : pior;
      });
      
      this.peFreio = piorAcerto.nome;
      this.carregando = false;
    });
  }
}
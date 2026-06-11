import { Component, OnInit } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { BandeiraPipe } from '../core/bandeiras.pipe';
import { Jogo } from '../core/models';

@Component({
  selector: 'app-jogos',
  standalone: true,
  imports: [DatePipe, CommonModule, BandeiraPipe],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">Jogos</h1>
      <p class="subtitulo">Confira as partidas do dia ou da semana, com placares e suas apostas.</p>

      <div class="filtros">
        <button [class.ativo]="periodo === 'hoje'" (click)="filtrar('hoje')">Hoje</button>
        <button [class.ativo]="periodo === 'semana'" (click)="filtrar('semana')">Esta semana</button>
        <button [class.ativo]="periodo === 'todos'" (click)="filtrar('todos')">Todos</button>
      </div>

      @if (carregando) { <p class="vazio">Carregando jogos…</p> }
      @else if (dias.length === 0) {
        <p class="vazio">Nenhum jogo neste período.</p>
      }

      @for (dia of dias; track dia.chave) {
        <div class="dia-grupo"><span class="rotulo">{{ dia.data | date:'EEEE, d \\'de\\' MMMM' }}</span></div>

        @for (jogo of dia.jogos; track jogo.id) {
          <article class="jogo-card">
          <div class="jogo-time">
            <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" 
                style="width: 32px; height: 24px; margin-right: 8px; vertical-align: middle;">
            {{ jogo.time1.nome }}
          </div>
          
          <div class="placar">
            <span class="digito" [class.vazio]="jogo.gols_time1 === null">{{ jogo.gols_time1 ?? '–' }}</span>
            <span class="x">×</span>
            <span class="digito" [class.vazio]="jogo.gols_time2 === null">{{ jogo.gols_time2 ?? '–' }}</span>
          </div>
          
          <div class="jogo-time dir">
            {{ jogo.time2.nome }}
            <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" 
                style="width: 32px; height: 24px; margin-left: 8px; vertical-align: middle;">
          </div>
            <div class="jogo-meta">
              @if (ehHoje(jogo)) { <span class="tag-hoje">Hoje</span> }
              <span>{{ jogo.data_hora | date:'HH:mm' }}</span>
              <span>{{ jogo.estadio }} — {{ jogo.cidade_estado }}</span>
              @if (jogo.minha_aposta) {
                <span class="pontos-chip" [class.cheio]="jogo.encerrado && jogo.minha_aposta.pontos > 0">
                  minha aposta {{ jogo.minha_aposta.gols_time1 }}×{{ jogo.minha_aposta.gols_time2 }}
                  @if (jogo.encerrado) { · {{ jogo.minha_aposta.pontos }} pts }
                </span>
              }
            </div>
          </article>
        }
      }
    </main>
  `,
})
export class JogosComponent implements OnInit {
  periodo: 'hoje' | 'semana' | 'todos' = 'hoje';
  dias: { chave: string; data: string; jogos: Jogo[] }[] = [];
  carregando = true;

  constructor(private api: ApiService) { }

  ngOnInit() { this.filtrar('hoje'); }

  filtrar(periodo: 'hoje' | 'semana' | 'todos') {
    this.periodo = periodo;
    this.carregando = true;
    // Sempre pede todos, filtra no front pelo timezone do navegador
    this.api.jogos('todos').subscribe(jogos => {
      const agora = new Date();
      const hoje00h = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const hoje23h59 = new Date(hoje00h.getTime() + 86400000 - 1);
      const semana00h = new Date(hoje00h.getTime() + 604800000); // +7 dias

      const mapa = new Map<string, Jogo[]>();
      for (const j of jogos) {
        // Agrupar pela data local do navegador, não UTC
        const dataLocal = new Date(j.data_hora);


        if (periodo === 'hoje' && (dataLocal < hoje00h || dataLocal > hoje23h59)) continue;
        if (periodo === 'semana' && dataLocal > semana00h) continue;

        const chave = dataLocal.toLocaleDateString('pt-BR')
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave)!.push(j);
      }
      this.dias = [...mapa.entries()].map(([chave, lista]) =>
        ({ chave, data: lista[0].data_hora, jogos: lista }));
      this.carregando = false;
    });
  }

  ehHoje(jogo: Jogo) {
    return new Date(jogo.data_hora).toDateString() === new Date().toDateString();
  }
}

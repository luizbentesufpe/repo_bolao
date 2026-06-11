import { Component, OnInit } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Jogo } from '../core/models';
import { BandeiraPipe } from '../core/bandeiras.pipe';

@Component({
  selector: 'app-jogos',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule, BandeiraPipe],
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
                   style="width: 32px; height: 24px; margin-right: 8px;">
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
                   style="width: 32px; height: 24px; margin-left: 8px;">
            </div>

            <div class="jogo-meta">
              @if (ehHoje(jogo)) { <span class="tag-hoje">Hoje</span> }
              <span>{{ jogo.data_hora | date:'HH:mm' }}</span>
              
              <!-- CRONOMETRO -->
              @if (!jogo.comecou) {
                <span style="font-weight: 700; color: var(--amarelo);">
                  {{ formatarTempo(getTempo(jogo)) }}
                </span>
              } @else if (!jogo.encerrado) {
                <span style="color: var(--vermelho); font-weight: 700;">⚽ AO VIVO</span>
              }

              <span>{{ jogo.estadio }}</span>

              @if (jogo.minha_aposta) {
                <span class="pontos-chip" [class.cheio]="jogo.encerrado && jogo.minha_aposta.pontos > 0">
                  {{ jogo.minha_aposta.gols_time1 }}×{{ jogo.minha_aposta.gols_time2 }}
                  @if (jogo.encerrado) { · {{ jogo.minha_aposta.pontos }} pts }
                </span>
              }

              <!-- BOTAO APOSTE AQUI -->
              @if (!jogo.comecou && !jogo.encerrado) {
                <button class="btn btn-amarelo" (click)="abrirAposta(jogo)" 
                        style="font-size:12px; padding:6px 10px; margin-left:auto;">
                  {{ jogo.minha_aposta ? '✏️ Editar' : '🎯 Aposte aqui' }}
                </button>
              }
            </div>

            <!-- MODAL DE APOSTA INLINE -->
            @if (jogoEmEdicao?.id === jogo.id) {
              <div class="modal-aposta">
                <div class="modal-conteudo">
                  <h3>Seu palpite</h3>
                  <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; margin: 12px 0;">
                    <input type="number" min="0" max="99" [(ngModel)]="palpite1" 
                           placeholder="Gols" style="text-align: center; font-weight: 700;">
                    <span style="font-weight: 700; font-size: 18px;">×</span>
                    <input type="number" min="0" max="99" [(ngModel)]="palpite2" 
                           placeholder="Gols" style="text-align: center; font-weight: 700;">
                  </div>
                  <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn" (click)="cancelarAposta()" style="background: #b9cdbe; font-size: 12px;">
                      Cancelar
                    </button>
                    <button class="btn btn-amarelo" (click)="confirmarAposta(jogo)" 
                            [disabled]="palpite1 === null || palpite2 === null" 
                            style="font-size: 12px;">
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            }
          </article>
        }
      }
    </main>
  `,
  styles: [`
    .modal-aposta {
      grid-column: 1 / -1;
      background: #fff8e1;
      border: 2px solid var(--amarelo);
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
      animation: slideIn 0.2s ease-out;
    }
    .modal-conteudo h3 {
      margin: 0 0 8px;
      font-size: 14px;
      color: var(--tinta);
    }
    .modal-aposta input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--linha);
      border-radius: 4px;
      font-size: 16px;
      font-family: 'IBM Plex Mono', monospace;
    }
    .modal-aposta input:focus {
      border-color: var(--campo);
      outline: none;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class JogosComponent implements OnInit {
  periodo: 'hoje' | 'semana' | 'todos' = 'hoje';
  dias: { chave: string; data: string; jogos: Jogo[] }[] = [];
  carregando = true;
  
  jogoEmEdicao: Jogo | null = null;
  palpite1: number | null = null;
  palpite2: number | null = null;
  tempos = new Map<number, string>();
  private intervaloAtualizacao: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.filtrar('hoje');
    // Atualizar cronômetros a cada segundo
    this.intervaloAtualizacao = setInterval(() => {
      this.tempos.clear();
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.intervaloAtualizacao);
  }

filtrar(periodo: 'hoje' | 'semana' | 'todos') {
    this.periodo = periodo;
    this.carregando = true;
    // Sempre pede TODOS, filtra no front pelo timezone do navegador
    this.api.jogos('todos').subscribe(jogos => {
      const agora = new Date();
      const hoje00h = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const hoje23h59 = new Date(hoje00h.getTime() + 86400000 - 1);
      const semana00h = new Date(hoje00h.getTime() + 604800000);

      const mapa = new Map<string, Jogo[]>();
      for (const j of jogos) {
        const dataLocal = new Date(j.data_hora);

        // Filtrar pelo periodo escolhido
        if (periodo === 'hoje' && (dataLocal < hoje00h || dataLocal > hoje23h59)) continue;
        if (periodo === 'semana' && dataLocal > semana00h) continue;

        const chave = dataLocal.toLocaleDateString('pt-BR')
          .split('/').reverse().join('-');
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

  getTempo(jogo: Jogo): number {
    const agora = new Date().getTime();
    const inicio = new Date(jogo.data_hora).getTime();
    return Math.max(0, inicio - agora);
  }

  formatarTempo(ms: number): string {
    if (ms === 0) return '⚽ COMEÇOU';
    const dias = Math.floor(ms / 86400000);
    const horas = Math.floor((ms % 86400000) / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);

    if (dias > 0) return `${dias}d ${horas}h`;
    if (horas > 0) return `${horas}h ${minutos}m`;
    if (minutos > 0) return `${minutos}m ${segundos}s`;
    return `${segundos}s`;
  }

  abrirAposta(jogo: Jogo) {
    this.jogoEmEdicao = jogo;
    this.palpite1 = jogo.minha_aposta?.gols_time1 ?? null;
    this.palpite2 = jogo.minha_aposta?.gols_time2 ?? null;
  }

  cancelarAposta() {
    this.jogoEmEdicao = null;
    this.palpite1 = null;
    this.palpite2 = null;
  }

  confirmarAposta(jogo: Jogo) {
    if (this.palpite1 === null || this.palpite2 === null) return;
    
    this.api.salvarAposta(jogo.id, this.palpite1, this.palpite2).subscribe({
      next: aposta => {
        jogo.minha_aposta = aposta;
        this.cancelarAposta();
        // Atualizar a lista
        this.filtrar(this.periodo);
      },
      error: e => {
        alert(e.error?.erro || 'Erro ao salvar aposta');
      }
    });
  }
}
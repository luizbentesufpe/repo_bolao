import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { NotificationPermissionService } from '../core/notification.permission.service';
import { AuthService } from '../core/auth.service';
import { Jogo } from '../core/models';
import { BandeiraPipe } from '../core/bandeiras.pipe';
import { SincronizacaoService } from '../core/sincronizacao.service';

@Component({
  selector: 'app-jogos',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule, BandeiraPipe],
  template: `
<main class="conteudo">
    <!-- ✅ BOTÃO ATIVAR NOTIFICAÇÕES -->
     @if (!notificacoesAtivadas && auth.logado) {
       <div style="padding: 0 0 20px 0;">
         <button
           (click)="ativarNotificacoes()"
           style="
             width: 100%;
             padding: 12px;
             background: var(--campo);
             color: white;
             border: none;
             border-radius: 8px;
             font-weight: 700;
             cursor: pointer;
             font-size: 14px;
           "
         >
           🔔 Ativar Notificações
         </button>
       </div>
     }
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
        <!-- JOGOS ATIVOS -->
        @if (dia.jogosAtivos.length > 0) {
          <div class="dia-grupo"><span class="rotulo">{{ dia.data | date:'EEEE, d MMM':'pt-BR' }}</span></div>
          @for (jogo of dia.jogosAtivos; track jogo.id) {
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
                
                <!-- ✅ CRONOMETRO EM TEMPO REAL -->
                @if (!jogo.comecou) {
                  <span style="font-weight: 700; color: var(--amarelo);">
                    {{ formatarTempo(getTempo(jogo)) }}
                  </span>
                } @else if (!jogo.encerrado) {
                  <span style="color: var(--vermelho); font-weight: 700;">⚽ AO VIVO</span>
                }

                <!-- ✅ STATUS CORRETO -->
                @if (jogo.encerrado) {
                  <span style="color: var(--campo); font-weight: 700; text-transform: uppercase; font-size: 11px;">✓ Finalizado</span>
                } @else if (jogo.ao_vivo) {
                  <span style="color: var(--vermelho); font-weight: 700; text-transform: uppercase; font-size: 11px;">🔴 Ao vivo</span>
                } @else if (jogo.em_breve) {
                  <span style="color: #999; font-weight: 700; text-transform: uppercase; font-size: 11px;">⏰ Em breve</span>
                }

                <span>{{ jogo.estadio }}</span>

                @if (jogo.minha_aposta && jogo.minha_aposta.gols_time1 !== null && jogo.minha_aposta.gols_time2 !== null) { 
                  <span class="pontos-chip" [class.cheio]="jogo.encerrado && jogo.minha_aposta.pontos > 0">
                    {{ jogo.minha_aposta.gols_time1 }}×{{ jogo.minha_aposta.gols_time2 }}
                    @if (jogo.encerrado) { · {{ jogo.minha_aposta.pontos }} pts }
                  </span>
                } @else {
                  <span style="font-size: 12px; color: #999; padding: 4px 8px;">
                    ⊘ Sem aposta
                  </span>
                }

                <!-- BOTAO APOSTE AQUI -->
                @if (estaAberto(jogo)) {
                  <button class="btn btn-amarelo" (click)="abrirAposta(jogo)" 
                          style="font-size:12px; padding:6px 10px; margin-left:auto;">
                    {{ jogo.minha_aposta ? '✏️ Editar' : '🎯 Aposte aqui' }}
                  </button>
                }
              </div>

              <!-- MODAL DE APOSTA INLINE -->
              @if (jogoEmEdicao?.id === jogo.id) {
                <div class="modal-aposta">
                  <h3>Seu palpite</h3>
                  <div class="palpite-container">
                    <input type="number" min="0" max="99" [(ngModel)]="palpite1" 
                          placeholder="Gols" class="input-palpite">
                    <span class="x">×</span>
                    <input type="number" min="0" max="99" [(ngModel)]="palpite2" 
                          placeholder="Gols" class="input-palpite">
                  </div>
                  <div class="modal-botoes">
                    <button class="btn btn-cancelar" (click)="cancelarAposta()">
                      Cancelar
                    </button>
                    <button class="btn btn-amarelo" (click)="confirmarAposta(jogo)" 
                            [disabled]="palpite1 === null || palpite2 === null">
                      Confirmar
                    </button>
                  </div>
                </div>
              }
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
                      <span style="font-size: 12px; color: #999;"><p>{{ jogo.data_hora | date: 'EEEE, d MMM' }}</p></span>

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
  
  /* ✅ MODAL DE APOSTA */
  .modal-aposta {
    grid-column: 1 / -1;
    background: #fff8e1;
    border: 2px solid var(--amarelo);
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
    animation: slideIn 0.2s ease-out;
  }

  .modal-aposta h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--tinta);
  }

  .palpite-container {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .input-palpite {
    width: 70px;
    height: 50px;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    border: 2px solid var(--linha);
    border-radius: 8px;
    padding: 4px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .input-palpite:focus {
    border-color: var(--campo);
    outline: none;
    box-shadow: 0 0 0 3px rgba(14, 122, 60, 0.1);
  }

  .palpite-container .x {
    font-weight: 700;
    font-size: 20px;
    color: var(--tinta);
  }

  .modal-botoes {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .btn-cancelar {
    background: #b9cdbe;
    color: var(--tinta);
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    font-weight: 700;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .btn-cancelar:hover {
    opacity: 0.9;
  }

  .btn-amarelo {
    background: var(--amarelo);
    color: var(--tinta);
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    font-weight: 700;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .btn-amarelo:hover:not(:disabled) {
    opacity: 0.9;
    transform: scale(1.05);
  }

  .btn-amarelo:disabled {
    background: #ddd;
    color: #999;
    cursor: not-allowed;
    opacity: 0.6;
  }

  @keyframes slideIn {
    from { 
      opacity: 0; 
      transform: translateY(-10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
`]
})
export class JogosComponent implements OnInit, OnDestroy {
  periodo: 'hoje' | 'semana' | 'todos' = 'hoje';
  dias: {
    chave: string;
    data: string;
    jogosAtivos: Jogo[];
    jogosEncerrados: Jogo[];
    expandido: boolean;
  }[] = [];
  carregando = true;
  notificacoesAtivadas = false;

  jogoEmEdicao: Jogo | null = null;
  palpite1: number | null = null;
  palpite2: number | null = null;
  private intervaloAtualizacao: any;

  constructor(private api: ApiService, private sincronizacaoService: SincronizacaoService,
    public auth: AuthService, private notifPermission: NotificationPermissionService
  ) { }

  ngOnInit() {
    this.sincronizacaoService.sincronizar();
    this.filtrar('hoje');
    this.verificarStatusNotificacoes();

    // ✅ ATUALIZA CRONÔMETRO A CADA 1 SEGUNDO
    this.intervaloAtualizacao = setInterval(() => {
      this.dias = [...this.dias];
    }, 1000);
  }

  ngOnDestroy() {
    // ✅ LIMPA INTERVAL AO DESMONTAR
    if (this.intervaloAtualizacao) {
      clearInterval(this.intervaloAtualizacao);
    }
  }

  filtrar(periodo: 'hoje' | 'semana' | 'todos') {
    this.periodo = periodo;
    this.carregando = true;
    this.api.jogos('todos').subscribe(jogos => {
      jogos = jogos.map(j => ({
        ...j,
        data_hora: new Date(j.data_hora)
      })) as any;
      const agora = new Date();
      const hoje00h = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const hoje23h59 = new Date(hoje00h.getTime() + 86400000 - 1);
      const semana00h = new Date(hoje00h.getTime() + 604800000);

      const mapa = new Map<string, { ativos: Jogo[], encerrados: Jogo[] }>();

      for (const j of jogos) {
        const dataLocal = new Date(j.data_hora);

        if (periodo === 'hoje' && (dataLocal < hoje00h || dataLocal > hoje23h59)) continue;
        if (periodo === 'semana' && dataLocal > semana00h) continue;

        const chave = dataLocal.toLocaleDateString('pt-BR')
          .split('/').reverse().join('-');

        if (!mapa.has(chave)) mapa.set(chave, { ativos: [], encerrados: [] });

        if (j.encerrado) {
          mapa.get(chave)!.encerrados.push(j);
        } else {
          mapa.get(chave)!.ativos.push(j);
        }
      }

      this.dias = [...mapa.entries()].map(([chave, { ativos, encerrados }]) => ({
        chave,
        data: [...ativos, ...encerrados][0].data_hora,
        jogosAtivos: ativos,
        jogosEncerrados: encerrados,
        expandido: false
      }));

      this.carregando = false;
    });
  }

  ehHoje(jogo: Jogo) {
    return new Date(jogo.data_hora).toDateString() === new Date().toDateString();
  }

  // ✅ CALCULA TEMPO RESTANTE EM TEMPO REAL
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

  estaAberto(jogo: Jogo): boolean {
    const agora = new Date().getTime();
    const inicio = new Date(jogo.data_hora).getTime();
    return agora < inicio;
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
  // ✅ Verifica se notificações estão ativadas
  verificarStatusNotificacoes() {
    this.notifPermission.verificarStatusReal().then(status => {
      this.notificacoesAtivadas = status.navegador === 'granted' && status.banco;
    });
  }

  // ✅ Ativa notificações
  ativarNotificacoes() {
    this.notifPermission.solicitarPermissao().then(permissao => {
      if (permissao === 'granted') {
        this.notifPermission.testarNotificacao();
        setTimeout(() => {
          this.notifPermission.sincronizarNotificacoes().then(() => {
            this.verificarStatusNotificacoes();
          });
        }, 500);
      }
    });
  }

  confirmarAposta(jogo: Jogo) {
    if (this.palpite1 === null || this.palpite2 === null) return;

    if (!this.estaAberto(jogo)) {
      alert('Apostas encerradas: o jogo já começou.');
      this.cancelarAposta();
      return;
    }

    this.api.salvarAposta(jogo.id, this.palpite1, this.palpite2).subscribe({
      next: aposta => {
        jogo.minha_aposta = aposta;
        this.cancelarAposta();
        this.filtrar(this.periodo);
      },
      error: e => {
        alert(e.error?.erro || 'Erro ao salvar aposta');
      }
    });
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Jogo } from '../core/models';
import { BandeiraPipe } from '../core/bandeiras.pipe';
import { SincronizacaoService } from '../core/sincronizacao.service';
import { CacheService } from '../core/cache.service';
import { ConnectionService } from '../core/connection.service';
import { timeout, catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

@Component({
  selector: 'app-jogos',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule, BandeiraPipe],
  template: `
<main class="conteudo">
    <!-- ✅ AVISO SEM INTERNET -->
    @if (!online) {
      <div class="aviso-sem-internet">
        <div class="aviso-conteudo">
          <span class="aviso-icone">📡</span>
          <div class="aviso-texto">
            <strong>Sem conexão com a internet</strong>
            <p>Você está usando dados em cache. Os dados serão sincronizados quando a conexão retornar.</p>
          </div>
          <button class="aviso-fechar" (click)="fecharAviso()">✕</button>
        </div>
      </div>
    }

    <!-- ✅ AVISO DE CACHE EXPIRADO (OPÇÃO B) -->
    @if (cacheExpirado) {
      <div style="padding: 8px 12px; background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 16px; border-radius: 4px; font-size: 12px; color: #856404;">
        ⏰ Dados com {{ idadeCache }}min. Atualizando...
      </div>
    }

    <!-- ✅ INDICADOR DE SINCRONIZAÇÃO -->
    @if (sincronizando) {
      <div style="padding: 8px 12px; background: #fff8e1; border-left: 4px solid var(--amarelo); margin-bottom: 16px; border-radius: 4px; font-size: 12px; color: #666;">
        🔄 Atualizando dados em tempo real...
      </div>
    }

    <h1 class="titulo-pagina">Jogos</h1>
    <p class="subtitulo">Confira as partidas do dia ou da semana, com placares e suas apostas.</p>

    <div class="filtros">
      <button [class.ativo]="periodo === 'hoje'" (click)="filtrar('hoje')">Hoje</button>
      <button [class.ativo]="periodo === 'semana'" (click)="filtrar('semana')">Esta semana</button>
      <button [class.ativo]="periodo === 'todos'" (click)="filtrar('todos')">Todos</button>
    </div>

    <!-- ✅ SKELETON LOADER (OPÇÃO A) - Enquanto carrega primeira vez SEM CACHE -->
    @if (carregando && dias.length === 0) {
      <div class="skeleton-container">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    }

    <!-- ✅ JOGOS ATIVOS (agrupados por dia) -->
    @if (dias.length > 0) {
      @for (dia of dias; track dia.chave) {
        @if (dia.jogosAtivos.length > 0) {
          <div class="dia-grupo"><span class="rotulo">{{ dia.data | date:'EEEE, d MMM':'pt-BR' }}</span></div>
          @for (jogo of dia.jogosAtivos; track jogo.id) {
            <article class="jogo-card">

              <div class="jogo-confronto">
                <div class="jogo-time">
                  <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" class="bandeira-card">
                  <span>{{ jogo.time1.nome }}</span>
                </div>

                <div class="placar">
                  <span class="digito" [class.vazio]="jogo.gols_time1 === null">{{ jogo.gols_time1 ?? '–' }}</span>
                  <span class="x">×</span>
                  <span class="digito" [class.vazio]="jogo.gols_time2 === null">{{ jogo.gols_time2 ?? '–' }}</span>
                </div>

                <div class="jogo-time">
                  <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" class="bandeira-card">
                  <span>{{ jogo.time2.nome }}</span>
                </div>
              </div>

              <div class="jogo-meta">
                @if (ehHoje(jogo)) { <span class="tag-hoje">Hoje</span> }
                <span>{{ jogo.data_hora | date:'HH:mm' }}</span>

                @if (!jogo.comecou) {
                  <span style="font-weight: 700; color: var(--amarelo);">
                    {{ formatarTempo(getTempo(jogo)) }}
                  </span>
                } @else if (!jogo.encerrado) {
                  <span style="color: var(--vermelho); font-weight: 700;">⚽ AO VIVO</span>
                }

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

                @if (estaAberto(jogo)) {
                  <button class="btn btn-amarelo" (click)="abrirAposta(jogo)"
                          style="font-size:12px; padding:6px 10px; margin-left:auto;">
                    {{ jogo.minha_aposta ? '✏️ Editar' : '🎯 Aposte aqui' }}
                  </button>
                }
              </div>

              @if (jogoEmEdicao?.id === jogo.id) {
                <div class="modal-aposta">
                  <h3>Seu palpite</h3>
                  <div class="palpite-container">
                    <div class="palpite-col">
                      <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" class="bandeira-mini">
                      <input type="number" min="0" max="99" [(ngModel)]="palpite1"
                            placeholder="0" class="input-palpite">
                    </div>
                    <span class="x" style="padding-bottom: 12px;">×</span>
                    <div class="palpite-col">
                      <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" class="bandeira-mini">
                      <input type="number" min="0" max="99" [(ngModel)]="palpite2"
                            placeholder="0" class="input-palpite">
                    </div>
                  </div>
                  <div class="modal-botoes">
                    <button class="btn btn-cancelar" (click)="cancelarAposta()">Cancelar</button>
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
      }
    }

    <!-- ✅ UMA ÚNICA CORTINA PARA TODOS OS ENCERRADOS -->
    @if (jogosEncerrados.length > 0) {
      <div class="cortina-encerrados">
        <button class="btn-cortina" (click)="encerradosExpandido = !encerradosExpandido">
          {{ encerradosExpandido ? '▼' : '▶' }} 🏁 {{ jogosEncerrados.length }} jogo(s) encerrado(s)
        </button>

        @if (encerradosExpandido) {
          <div class="jogos-expandidos">
            @for (jogo of jogosEncerrados; track jogo.id) {
              <article class="jogo-card encerrado">
                <div class="jogo-confronto">
                  <div class="jogo-time">
                    <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" class="bandeira-card">
                    <span>{{ jogo.time1.nome }}</span>
                  </div>
                  <div class="placar">
                    <span class="digito">{{ jogo.gols_time1 }}</span>
                    <span class="x">×</span>
                    <span class="digito">{{ jogo.gols_time2 }}</span>
                  </div>
                  <div class="jogo-time">
                    <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" class="bandeira-card">
                    <span>{{ jogo.time2.nome }}</span>
                  </div>
                </div>

                <div class="jogo-meta">
                  <span style="font-size: 12px; color: #999;">{{ jogo.data_hora | date: 'EEEE, d MMM · HH:mm' }}</span>
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

    <!-- ✅ VAZIO -->
    @if (!carregando && dias.length === 0 && jogosEncerrados.length === 0) {
      <p class="vazio">Nenhum jogo neste período.</p>
    }
</main>
  `,
  styles: [`
  /* ✅ AVISO SEM INTERNET */
  .aviso-sem-internet {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: #ff6b6b;
    color: white;
    padding: 12px 16px;
    z-index: 98;
    animation: slideDown 0.3s ease-out;
  }

  .aviso-conteudo {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 800px;
    margin: 0 auto;
  }

  .aviso-icone { font-size: 24px; flex-shrink: 0; }
  .aviso-texto { flex: 1; font-size: 13px; }
  .aviso-texto strong { display: block; margin-bottom: 2px; font-size: 14px; }
  .aviso-texto p { margin: 0; opacity: 0.9; line-height: 1.4; }

  .aviso-fechar {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    flex-shrink: 0;
    transition: opacity 0.2s;
  }

  .aviso-fechar:hover { opacity: 0.8; }

  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  /* ✅ SKELETON LOADER (OPÇÃO A) */
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .skeleton-card {
    height: 120px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    border-radius: 8px;
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ✅ CARD */
  .jogo-card {
    display: flex;
    flex-direction: column;
    background: white;
    border: 1px solid var(--linha);
    border-radius: 8px;
    padding: 14px 12px;
    margin-bottom: 12px;
  }

  .jogo-card.encerrado {
    opacity: 0.7;
    background: #fafafa;
  }

  /* ✅ CONFRONTO */
  .jogo-confronto {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .jogo-time {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 13px;
    color: var(--tinta);
    text-align: center;
    word-break: break-word;
  }

  .bandeira-card {
    width: 40px;
    height: 28px;
    object-fit: cover;
    border-radius: 2px;
  }

  /* PLACAR */
  .placar {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  .digito {
    font-size: 26px;
    font-weight: 700;
    color: var(--amarelo);
    min-width: 32px;
    text-align: center;
  }

  .x {
    font-weight: 700;
    font-size: 18px;
    color: var(--tinta-fraca);
  }

  /* ✅ META */
  .jogo-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--tinta-fraca);
    border-top: 1px solid var(--linha);
    padding-top: 10px;
  }

  .tag-hoje {
    background: var(--amarelo);
    color: var(--tinta);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }

  .pontos-chip {
    display: inline-block;
    background: #f0f0f0;
    color: var(--tinta);
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .pontos-chip.cheio {
    background: var(--campo);
    color: white;
  }

  /* ✅ CORTINA ÚNICA */
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

  .btn-cortina:hover { background: #eee; }

  .jogos-expandidos {
    margin-top: 12px;
    animation: expandDown 0.3s ease-out;
  }

  @keyframes expandDown {
    from { opacity: 0; max-height: 0; overflow: hidden; }
    to { opacity: 1; max-height: 5000px; }
  }

  .dia-grupo { padding: 16px 0 8px 0; margin-top: 12px; }

  .rotulo {
    font-size: 14px;
    font-weight: 700;
    color: var(--amarelo);
    text-transform: capitalize;
  }

  /* ✅ MODAL DE APOSTA INLINE */
  .modal-aposta {
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
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 12px;
  }

  .palpite-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .bandeira-mini {
    width: 26px;
    height: 19px;
    border-radius: 2px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .input-palpite {
    width: 64px;
    height: 50px;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    border: 2px solid #b2d8bf;
    border-radius: 8px;
    padding: 4px;
    font-family: 'IBM Plex Mono', monospace;
    background: #e8f5ee;
    color: var(--campo);
  }

  .input-palpite:focus {
    border-color: var(--campo);
    outline: none;
    box-shadow: 0 0 0 3px rgba(14, 122, 60, 0.1);
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

  .btn-cancelar:hover { opacity: 0.9; }

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
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ✅ MOBILE */
  @media (max-width: 480px) {
    .skeleton-card { height: 100px; }
    .jogo-time { font-size: 11px; }
    .bandeira-card { width: 32px; height: 22px; }
    .digito { font-size: 22px; min-width: 24px; }
    .input-palpite { width: 54px; height: 44px; font-size: 20px; }
    .bandeira-mini { width: 22px; height: 16px; }
  }
`]
})
export class JogosComponent implements OnInit, OnDestroy {
  periodo: 'hoje' | 'semana' | 'todos' = 'hoje';
  dias: {
    chave: string;
    data: string;
    jogosAtivos: Jogo[];
  }[] = [];

  jogosEncerrados: Jogo[] = [];
  encerradosExpandido = false;

  carregando = false;
  sincronizando = false;
  online = true;

  // ✅ OPÇÃO B: CACHE FALLBACK
  cacheExpirado = false;
  idadeCache = 0;

  jogoEmEdicao: Jogo | null = null;
  palpite1: number | null = null;
  palpite2: number | null = null;

  private intervaloAtualizacao: any;
  private connectionSubscription: Subscription | null = null;

  constructor(
    private api: ApiService,
    private sincronizacaoService: SincronizacaoService,
    public auth: AuthService,
    private cache: CacheService,
    private connection: ConnectionService
  ) {}

  ngOnInit() {
    // ✅ OPÇÃO A + B: CARREGAR COM FALLBACK
    this.carregarComFallback();

    // 2️⃣ SINCRONIZAR EM BACKGROUND
    this.sincronizarEmBackground();

    this.connectionSubscription = this.connection.getStatus().subscribe((status: boolean) => {
      this.online = status;
    });

    this.intervaloAtualizacao = setInterval(() => {
      this.dias = [...this.dias];
    }, 1000);
  }

  ngOnDestroy() {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
    if (this.intervaloAtualizacao) {
      clearInterval(this.intervaloAtualizacao);
    }
  }

  /**
   * ✅ OPÇÃO A + B: CARREGAR COM FALLBACK
   * Mostra cache expirado + sincroniza em background
   */
  private carregarComFallback() {
    console.log('📦 Carregando jogos com fallback...');

    this.carregando = true;

    const jogosCached = this.cache.obterJogosComFallback();

    if (jogosCached && jogosCached.length > 0) {
      const idade = this.cache.obterIdadeCache();
      console.log(`✅ Cache encontrado! (${idade}min atrás)`);

      // Mostrar cache IMEDIATAMENTE
      this.processarFiltro(this.periodo, jogosCached);

      // Esconder skeleton
      this.carregando = false;

      // ✅ SE CACHE É VÁLIDO (< 30min), NÃO SINCRONIZA
      if (this.cache.isCacheValido()) {
        console.log('✅ Cache ainda é válido, sem sincronização');
        this.cacheExpirado = false;
        return;
      }

      // ✅ SE CACHE EXPIROU, MOSTRAR AVISO E SINCRONIZAR
      console.log('⚠️ Cache expirado, sincronizando em background...');
      this.cacheExpirado = true;
      this.idadeCache = idade;
    } else {
      console.log('⚠️ Cache vazio - aguardando dados da API');
    }
  }

  /**
   * ✅ SINCRONIZAR EM BACKGROUND
   */
  private sincronizarEmBackground() {
    console.log('🔄 Iniciando sincronização em background...');
    this.sincronizando = true;

    this.sincronizacaoService.sincronizar();

    this.api.jogos('todos').pipe(
      timeout(15000),
      catchError((error: any) => {
        console.error('Erro ao carregar jogos:', error);
        return of([]);
      })
    ).subscribe(jogos => {
      if (jogos && jogos.length > 0) {
        this.cache.salvarJogos(jogos);
        this.processarFiltro(this.periodo, jogos);

        // ✅ ESCONDER AVISO DE CACHE EXPIRADO
        this.cacheExpirado = false;

        this.carregando = false;
        console.log('✅ Dados atualizados na tela!');
      }
      this.sincronizando = false;
    });
  }

  filtrar(periodo: 'hoje' | 'semana' | 'todos', jogosPassados?: Jogo[]) {
    this.periodo = periodo;

    if (!jogosPassados) {
      const jogosCached = this.cache.obterJogosComFallback();
      if (jogosCached && jogosCached.length > 0) {
        jogosPassados = jogosCached;
      } else {
        this.dias = [];
        this.jogosEncerrados = [];
        return;
      }
    }

    this.processarFiltro(periodo, jogosPassados);

    this.api.jogos('todos').pipe(
      timeout(15000),
      catchError(() => of([]))
    ).subscribe(jogos => {
      if (jogos && jogos.length > 0) {
        this.cache.salvarJogos(jogos);
        this.processarFiltro(periodo, jogos);
      }
    });
  }

  private processarFiltro(periodo: 'hoje' | 'semana' | 'todos', jogos: Jogo[]) {
    jogos = jogos.map(j => ({
      ...j,
      data_hora: new Date(j.data_hora)
    })) as any;

    const agora = new Date();
    const hoje00h = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const hoje23h59 = new Date(hoje00h.getTime() + 86400000 - 1);
    const semana00h = new Date(hoje00h.getTime() + 604800000);

    const mapa = new Map<string, { ativos: Jogo[] }>();
    const encerrados: Jogo[] = [];

    for (const j of jogos) {
      const dataReal = new Date(j.data_hora);
      const ehMeiaNoite = dataReal.getHours() === 0 && dataReal.getMinutes() === 0 && dataReal.getSeconds() === 0;

      const dataAnterior = new Date(dataReal);
      dataAnterior.setSeconds(-1);
      const chaveAnterior = dataAnterior.toLocaleDateString('pt-BR').split('/').reverse().join('-');
      const chaveReal = dataReal.toLocaleDateString('pt-BR').split('/').reverse().join('-');

      // Verificar se o jogo passa no filtro de período
      let passaFiltro = false;
      if (periodo === 'todos') {
        passaFiltro = true;
      } else if (periodo === 'hoje') {
        if (dataAnterior >= hoje00h && dataAnterior <= hoje23h59) passaFiltro = true;
        if (ehMeiaNoite && dataReal >= hoje00h && dataReal <= hoje23h59) passaFiltro = true;
      } else {
        if (dataAnterior <= semana00h) passaFiltro = true;
      }

      if (!passaFiltro) continue;

      // Encerrados vão para a lista única
      if (j.encerrado) {
        encerrados.push(j);
        continue;
      }

      // Ativos agrupados por dia
      const chave = chaveAnterior;
      if (!mapa.has(chave)) mapa.set(chave, { ativos: [] });
      mapa.get(chave)!.ativos.push(j);

      // Meia-noite aparece também no dia real (só para hoje)
      if (ehMeiaNoite && periodo === 'hoje' && chaveReal !== chaveAnterior && dataReal >= hoje00h && dataReal <= hoje23h59) {
        if (!mapa.has(chaveReal)) mapa.set(chaveReal, { ativos: [] });
        mapa.get(chaveReal)!.ativos.push(j);
      }
    }

    this.jogosEncerrados = encerrados;

    this.dias = [...mapa.entries()].map(([chave, { ativos }]) => ({
      chave,
      data: ativos[0].data_hora,
      jogosAtivos: ativos,
    }));
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

  fecharAviso() {
    this.online = true;
  }
}
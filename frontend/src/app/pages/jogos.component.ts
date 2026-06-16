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

    <!-- ✅ SKELETON LOADER (enquanto carrega primeira vez) -->
    @if (carregando && dias.length === 0) {
      <div class="skeleton-container">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    }

    <!-- ✅ DADOS CARREGADOS (quando houver) -->
    @if (dias.length > 0) {
      @for (dia of dias; track dia.chave) {
        <!-- JOGOS ATIVOS -->
        @if (dia.jogosAtivos.length > 0) {
          <div class="dia-grupo"><span class="rotulo">{{ dia.data | date:'EEEE, d MMM':'pt-BR' }}</span></div>
          @for (jogo of dia.jogosAtivos; track jogo.id) {
            <article class="jogo-card">

              <!-- ✅ CONFRONTO: bandeira + nome acima do placar -->
              <div class="jogo-confronto">
                <!-- TIME 1 -->
                <div class="jogo-time">
                  <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" class="bandeira-card">
                  <span>{{ jogo.time1.nome }}</span>
                </div>

                <!-- PLACAR -->
                <div class="placar">
                  <span class="digito" [class.vazio]="jogo.gols_time1 === null">{{ jogo.gols_time1 ?? '–' }}</span>
                  <span class="x">×</span>
                  <span class="digito" [class.vazio]="jogo.gols_time2 === null">{{ jogo.gols_time2 ?? '–' }}</span>
                </div>

                <!-- TIME 2 -->
                <div class="jogo-time">
                  <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" class="bandeira-card">
                  <span>{{ jogo.time2.nome }}</span>
                </div>
              </div>

              <!-- META -->
              <div class="jogo-meta">
                @if (ehHoje(jogo)) { <span class="tag-hoje">Hoje</span> }
                <span>{{ jogo.data_hora | date:'HH:mm' }}</span>
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
                      <span style="font-size: 12px; color: #999;">{{ jogo.data_hora | date: 'EEEE, d MMM' }}</span>
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
    }

    <!-- ✅ VAZIO (se realmente não tem nada) -->
    @if (!carregando && dias.length === 0) {
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

  .aviso-icone {
    font-size: 24px;
    flex-shrink: 0;
  }

  .aviso-texto {
    flex: 1;
    font-size: 13px;
  }

  .aviso-texto strong {
    display: block;
    margin-bottom: 2px;
    font-size: 14px;
  }

  .aviso-texto p {
    margin: 0;
    opacity: 0.9;
    line-height: 1.4;
  }

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

  .aviso-fechar:hover {
    opacity: 0.8;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* ✅ SKELETON LOADER */
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .skeleton-card {
    height: 120px;
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e0e0e0 50%,
      #f0f0f0 75%
    );
    background-size: 200% 100%;
    border-radius: 8px;
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
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

  .digito.vazio {
    color: #bbb;
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

  /* ✅ CORTINA */
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
    from { opacity: 0; max-height: 0; overflow: hidden; }
    to { opacity: 1; max-height: 5000px; }
  }

  /* ✅ FILTROS */
  .filtros {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    justify-content: center;
  }

  .filtros button {
    padding: 8px 16px;
    border: 2px solid var(--linha);
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    color: #666;
    transition: all 0.2s ease;
  }

  .filtros button.ativo {
    background: var(--campo);
    color: white;
    border-color: var(--campo);
  }

  .dia-grupo {
    padding: 16px 0 8px 0;
    margin-top: 12px;
  }

  .rotulo {
    font-size: 14px;
    font-weight: 700;
    color: var(--amarelo);
    text-transform: capitalize;
  }

  .vazio {
    text-align: center;
    color: #999;
    padding: 20px;
  }

  .btn-amarelo {
    background: var(--amarelo);
    color: var(--tinta);
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-amarelo:hover {
    opacity: 0.9;
  }

  /* ✅ MOBILE */
  @media (max-width: 480px) {
    .skeleton-card {
      height: 100px;
    }

    .jogo-time {
      font-size: 11px;
    }

    .bandeira-card {
      width: 32px;
      height: 22px;
    }

    .digito {
      font-size: 22px;
      min-width: 24px;
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
  
  carregando = false;  // ✅ CONTROLA SKELETON
  sincronizando = false;
  online = true;

  private connectionSubscription: Subscription | null = null;

  constructor(
    private api: ApiService,
    private sincronizacaoService: SincronizacaoService,
    public auth: AuthService,
    private cache: CacheService,
    private connection: ConnectionService
  ) {}

  ngOnInit() {
    // ✅ MOSTRAR SKELETON
    this.carregando = true;

    // 1️⃣ CARREGAR DO CACHE (instantâneo)
    this.carregarDoCache();

    // 2️⃣ SINCRONIZAR EM BACKGROUND
    this.sincronizarEmBackground();

    // 3️⃣ MONITORAR CONEXÃO
    this.connectionSubscription = this.connection.getStatus().subscribe((status: boolean) => {
      this.online = status;
    });
  }

  ngOnDestroy() {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

  /**
   * ✅ CARREGAR CACHE (instantâneo - < 50ms)
   */
  private carregarDoCache() {
    console.log('📦 Carregando do cache...');
    
    const jogosCached = this.cache.obterJogos();
    
    if (jogosCached && jogosCached.length > 0) {
      console.log('✅ Cache encontrado!');
      this.processarJogos(jogosCached);
      this.carregando = false;  // ✅ ESCONDER SKELETON
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
    this.carregarJogosEmBackground();
    
    setTimeout(() => {
      this.sincronizando = false;
      console.log('✅ Sincronização concluída!');
    }, 2000);
  }

  /**
   * ✅ CARREGAR JOGOS EM BACKGROUND
   */
  private carregarJogosEmBackground() {
    this.api.jogos('todos').pipe(
      timeout(15000),
      catchError((error: any) => {
        console.error('Erro ao carregar jogos:', error);
        return of([]);
      })
    ).subscribe(jogos => {
      if (jogos && jogos.length > 0) {
        this.cache.salvarJogos(jogos);
        this.processarJogos(jogos);
        this.carregando = false;  // ✅ ESCONDER SKELETON
        console.log('✅ Dados atualizados na tela!');
      }
    });
  }

  /**
   * ✅ PROCESSAR JOGOS
   */
  private processarJogos(jogos: Jogo[]) {
    jogos = jogos.map(j => ({
      ...j,
      data_hora: new Date(j.data_hora)
    })) as any;

    this.filtrar(this.periodo, jogos);
  }

  /**
   * ✅ FILTRAR JOGOS
   */
  filtrar(periodo: 'hoje' | 'semana' | 'todos', jogosPassados?: Jogo[]) {
    this.periodo = periodo;

    if (!jogosPassados) {
      const jogosCached = this.cache.obterJogos();
      if (jogosCached && jogosCached.length > 0) {
        jogosPassados = jogosCached;
      } else {
        this.dias = [];
        return;
      }
    }

    this.processarFiltro(periodo, jogosPassados);

    // Carregar novos dados em background
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

  /**
   * ✅ PROCESSA O FILTRO INTERNAMENTE
   */
  private processarFiltro(periodo: 'hoje' | 'semana' | 'todos', jogos: Jogo[]) {
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

      const chave = dataLocal.toLocaleDateString('pt-BR').split('/').reverse().join('-');

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
  }

  ehHoje(jogo: Jogo) {
    return new Date(jogo.data_hora).toDateString() === new Date().toDateString();
  }

  estaAberto(jogo: Jogo): boolean {
    const agora = new Date().getTime();
    const inicio = new Date(jogo.data_hora).getTime();
    return agora < inicio;
  }

  abrirAposta(jogo: Jogo) {
    // Implementar modal de aposta
    console.log('Abrir aposta para jogo:', jogo.id);
  }

  fecharAviso() {
    // Implementar fechar aviso
  }
}
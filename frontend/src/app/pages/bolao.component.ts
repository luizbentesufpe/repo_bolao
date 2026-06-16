import { Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Jogo } from '../core/models';
import { BandeiraPipe } from '../core/bandeiras.pipe';
import { SincronizacaoService } from '../core/sincronizacao.service';
import { CacheService } from '../core/cache.service';
import { ConnectionService } from '../core/connection.service';
import { timeout, catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

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
  imports: [DatePipe, FormsModule, CommonModule, BandeiraPipe],
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

  <h1 class="titulo-pagina">Fazer bolão</h1>

  <p class="subtitulo">
    Dê seu palpite até a bola rolar. Placar exato vale 5 pontos,
    acertar o vencedor vale 2 e acertar um gol vale 1.
  </p>

  <!-- ✅ CARD DE CRITÉRIOS (RESPONSIVO) -->
  <div class="card-criterios">
    <h3 class="card-titulo">🏆 Critérios de pontuação</h3>
    <div class="grid-criterios">
      <div class="criterio">
        <div class="points">5</div>
        <div class="label">Placar exato</div>
        <div class="example">2×0 = 2×0 ✓</div>
      </div>
      <div class="criterio">
        <div class="points">2</div>
        <div class="label">Vencedor/Empate</div>
        <div class="example">3×1 = 2×1 ✓</div>
      </div>
      <div class="criterio">
        <div class="points">1</div>
        <div class="label">Gols de uma equipe</div>
        <div class="example">2×0 = 2×1 ✓</div>
      </div>
      <div class="criterio errou">
        <div class="points">0</div>
        <div class="label">Resultado incorreto</div>
        <div class="example">1×1 = 2×0 ✗</div>
      </div>
    </div>
  </div>

  <!-- ✅ CARD DO PÉ FRIO -->
  <div class="card-pe-frio">
    <h3 class="card-titulo">🥶 O que é Pé Frio?</h3>
    <p class="card-descricao">
      Pé frio mede quem acertou menos! Quanto <strong>MAIOR</strong> o número, pior foi o desempenho.
    </p>
    <div class="card-exemplo">
      <div class="exemplo-item">
        <strong>Você:</strong> 3 jogos, 3 acertos → <span class="bom">0 pé frio</span> (Melhor!)
      </div>
      <div class="exemplo-item">
        <strong>Amigo:</strong> 3 jogos, 1 acerto → <span class="ruim">9 pé frio</span> (Maior! 🥶)
      </div>
    </div>
  </div>

  @if (carregando && dias.length === 0) {
    <p class="vazio">⏳ Carregando jogos…</p>
  } @else if (dias.length === 0) {
    <p class="vazio">Nenhum jogo no momento.</p>
  }

  @for (dia of dias; track dia.chave) {
    <!-- JOGOS ABERTOS -->
    @if (dia.jogosAbertos.length > 0) {
      <div class="dia-grupo">
        <span class="rotulo">{{ dia.data | date:"EEEE, d 'de' MMMM" }}</span>
      </div>

      @for (jogo of dia.jogosAbertos; track jogo.id) {
        <article class="jogo-card">

          <!-- ✅ CONFRONTO: bandeira + nome acima dos inputs -->
          <div class="jogo-confronto">
            <div class="jogo-time">
              <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" class="bandeira-card">
              <span>{{ jogo.time1.nome }}</span>
            </div>

            <div class="palpite-container">
              <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite1"
                     [disabled]="!estaAberto(jogo)"
                     [attr.aria-label]="'Gols de ' + jogo.time1.nome"
                     class="input-palpite">
              <span class="x">×</span>
              <input type="number" min="0" max="99" [(ngModel)]="jogo.palpite2"
                     [disabled]="!estaAberto(jogo)"
                     [attr.aria-label]="'Gols de ' + jogo.time2.nome"
                     class="input-palpite">
            </div>

            <div class="jogo-time">
              <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" class="bandeira-card">
              <span>{{ jogo.time2.nome }}</span>
            </div>
          </div>

          <!-- INFORMAÇÕES DO JOGO -->
          <div class="jogo-info">
            <div class="info-row">
              <span class="info-label">⏰</span>
              <span>{{ jogo.data_hora | date:'HH:mm' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📍</span>
              <span class="info-texto">{{ jogo.estadio }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📌</span>
              <span class="info-texto">{{ jogo.cidade_estado }}</span>
            </div>
          </div>

          <!-- STATUS E BOTÃO -->
          <div class="jogo-rodape">
            @if (jogo.erro) {
              <span class="status-erro">{{ jogo.erro }}</span>
            }
            @if (jogo.salvo) {
              <span class="status-sucesso">✓ Salvo</span>
            }
            <button class="btn" (click)="salvar(jogo)"
                    [disabled]="!estaAberto(jogo) || jogo.salvando || jogo.palpite1 === null || jogo.palpite2 === null"
                    [class.salvando]="jogo.salvando">
              @if (jogo.salvando) {
                ⏳ Salvando...
              } @else {
                {{ jogo.minha_aposta ? '✏️ Atualizar' : '💾 Salvar' }}
              }
            </button>
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

                <!-- ✅ CONFRONTO: bandeira + nome acima do placar (encerrado) -->
                <div class="jogo-confronto">
                  <div class="jogo-time">
                    <img [src]="jogo.time1.nome | bandeira" [alt]="jogo.time1.nome" class="bandeira-card">
                    <span>{{ jogo.time1.nome }}</span>
                  </div>

                  <div class="placar-final">
                    <span class="digito">{{ jogo.gols_time1 }}</span>
                    <span class="x">×</span>
                    <span class="digito">{{ jogo.gols_time2 }}</span>
                  </div>

                  <div class="jogo-time">
                    <img [src]="jogo.time2.nome | bandeira" [alt]="jogo.time2.nome" class="bandeira-card">
                    <span>{{ jogo.time2.nome }}</span>
                  </div>
                </div>

                <div class="jogo-info">
                  <div class="info-row">
                    <span class="info-label">⏰</span>
                    <span>{{ jogo.data_hora | date:'HH:mm' }}</span>
                  </div>
                </div>

                @if (jogo.minha_aposta && jogo.minha_aposta.gols_time1 !== null && jogo.minha_aposta.gols_time2 !== null) {
                  <div class="pontos-chip" [class.cheio]="jogo.minha_aposta.pontos > 0">
                    {{ jogo.minha_aposta.gols_time1 }}×{{ jogo.minha_aposta.gols_time2 }}
                    · {{ jogo.minha_aposta.pontos }} pts
                  </div>
                }
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
    /* ✅ AVISO SEM INTERNET */
    .aviso-sem-internet {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 12px 16px;
      z-index: 9999;
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

    /* ✅ CARDS DE INFORMAÇÃO */
    .card-criterios,
    .card-pe-frio {
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      border: 2px solid;
    }

    .card-criterios {
      background: linear-gradient(135deg, rgba(255,199,44,0.1) 0%, rgba(14,122,60,0.1) 100%);
      border-color: var(--amarelo);
    }

    .card-pe-frio {
      background: linear-gradient(135deg, rgba(255,107,107,0.1) 0%, rgba(100,100,100,0.1) 100%);
      border-color: #ff6b6b;
    }

    .card-titulo {
      font-size: 14px;
      text-transform: uppercase;
      color: var(--tinta);
      letter-spacing: 1px;
      font-weight: 700;
      margin: 0 0 12px 0;
    }

    .card-descricao {
      font-size: 13px;
      color: var(--tinta-fraca);
      margin: 0 0 12px 0;
      line-height: 1.6;
    }

    /* ✅ GRID DE CRITÉRIOS */
    .grid-criterios {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .criterio {
      background: white;
      padding: 12px;
      border-radius: 8px;
      border-left: 4px solid;
      text-align: center;
    }

    .criterio:nth-child(1) { border-color: var(--campo); }
    .criterio:nth-child(2) { border-color: var(--amarelo); }
    .criterio:nth-child(3) { border-color: #666; }
    .criterio.errou { border-color: #ddd; }

    .criterio .points {
      font-weight: 700;
      font-size: 20px;
      margin-bottom: 4px;
      color: var(--tinta);
    }

    .criterio .label {
      font-size: 11px;
      color: var(--tinta-fraca);
      margin-bottom: 4px;
    }

    .criterio .example {
      font-size: 10px;
      color: #999;
    }

    /* ✅ CARD PÉ FRIO */
    .card-exemplo {
      background: white;
      padding: 12px;
      border-radius: 8px;
      border-left: 4px solid #ff6b6b;
    }

    .exemplo-item {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      line-height: 1.6;
    }

    .exemplo-item:last-child { margin-bottom: 0; }

    .bom { color: var(--campo); font-weight: 700; }
    .ruim { color: #ff6b6b; font-weight: 700; }

    /* ✅ JOGO CARD */
    .jogo-card {
      background: white;
      border: 1px solid var(--linha);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .jogo-card.encerrado {
      opacity: 0.7;
      background: #fafafa;
    }

    /* ✅ CONFRONTO: grid de 3 colunas — time1 | inputs/placar | time2 */
    .jogo-confronto {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 8px;
    }

    /* ✅ TIME: bandeira em cima, nome embaixo, centralizado */
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

    /* ✅ PALPITE */
    .palpite-container {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
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

    .input-palpite:disabled {
      background: #f0f0f0;
      color: #999;
      border-color: var(--linha);
    }

    .x {
      font-weight: 700;
      font-size: 20px;
      color: var(--tinta-fraca);
    }

    /* ✅ PLACAR FINAL (ENCERRADO) */
    .placar-final {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .digito {
      font-size: 28px;
      font-weight: 700;
      color: var(--amarelo);
      min-width: 36px;
      text-align: center;
    }

    /* ✅ INFORMAÇÕES DO JOGO */
    .jogo-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 6px;
      font-size: 12px;
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .info-label {
      font-size: 14px;
      flex-shrink: 0;
      width: 16px;
    }

    .info-texto {
      color: var(--tinta-fraca);
      word-break: break-word;
    }

    /* ✅ RODAPÉ DO CARD */
    .jogo-rodape {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: space-between;
    }

    .status-erro {
      color: var(--vermelho);
      font-size: 12px;
      font-weight: 600;
      flex: 1;
    }

    .status-sucesso {
      color: var(--campo);
      font-size: 12px;
      font-weight: 700;
      flex: 1;
    }

    .btn {
      background: var(--campo);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn:hover:not(:disabled) {
      opacity: 0.9;
      transform: scale(1.05);
    }

    .btn:disabled {
      background: #ddd;
      color: #999;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn.salvando { opacity: 0.8; }

    /* ✅ PONTOS CHIP */
    .pontos-chip {
      display: inline-block;
      background: #f0f0f0;
      color: var(--tinta);
      padding: 6px 12px;
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
      font-size: 13px;
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

    /* ✅ MOBILE */
    @media (max-width: 768px) {
      .grid-criterios { grid-template-columns: 1fr; }

      .jogo-card { padding: 12px; gap: 10px; }

      .input-palpite {
        width: 56px;
        height: 44px;
        font-size: 20px;
      }

      .jogo-info { padding: 8px; gap: 6px; font-size: 11px; }

      .btn { padding: 10px 12px; font-size: 11px; }

      .card-criterios, .card-pe-frio { padding: 12px; }
    }

    /* ✅ EXTRA SMALL */
    @media (max-width: 480px) {
      .jogo-time { font-size: 11px; }

      .bandeira-card { width: 32px; height: 22px; }

      .input-palpite {
        width: 48px;
        height: 40px;
        font-size: 18px;
      }

      .digito { font-size: 22px; min-width: 28px; }

      .jogo-rodape {
        flex-direction: column;
        align-items: stretch;
      }

      .status-erro, .status-sucesso { text-align: center; }

      .btn { width: 100%; }

      .criterio .points { font-size: 18px; }
    }
  `]
})
export class BolaoComponent implements OnInit, OnDestroy {
  dias: {
    chave: string;
    data: string;
    jogosAbertos: JogoComPalpite[];
    jogosEncerrados: JogoComPalpite[];
    expandido: boolean;
  }[] = [];
  carregando = false;
  sincronizando = false;
  online = true;

  private connectionSubscription: Subscription | null = null;
  private avisoDismissed = false;

  constructor(
    private api: ApiService,
    private sincronizacaoService: SincronizacaoService,
    private cache: CacheService,
    private connection: ConnectionService
  ) {}

  ngOnInit() {
    // 1️⃣ CARREGAR DO CACHE IMEDIATAMENTE
    this.carregarDoCache();

    // 2️⃣ SINCRONIZAR EM BACKGROUND
    this.sincronizarEmBackground();

    // 3️⃣ MONITORAR CONEXÃO
    this.connectionSubscription = this.connection.getStatus().subscribe((status: boolean) => {
      this.online = status;
      this.avisoDismissed = false;
    });
  }

  ngOnDestroy() {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

  // ✅ FASE 1: CARREGAR DO CACHE (INSTANTÂNEO)
  private carregarDoCache() {
    console.log('📦 Carregando bolão do cache...');
    
    const jogosCached = this.cache.obterJogos();
    
    if (jogosCached && jogosCached.length > 0) {
      console.log('✅ Cache encontrado!');
      this.processarJogos(jogosCached);
    } else {
      console.log('⚠️ Cache vazio');
    }
  }

  // ✅ SINCRONIZAR EM BACKGROUND
  private sincronizarEmBackground() {
    console.log('🔄 Iniciando sincronização em background...');
    this.sincronizando = true;

    // Sincronizar (não retorna promise)
    this.sincronizacaoService.sincronizar();
    
    // Carregar dados imediatamente em background
    this.carregarJogosEmBackground();
    
    // Marcar como completo após timeout
    setTimeout(() => {
      this.sincronizando = false;
      console.log('✅ Sincronização concluída!');
    }, 2000);
  }

  // ✅ CARREGA JOGOS EM BACKGROUND
  private carregarJogosEmBackground() {
    this.api.jogos('todos').pipe(
      timeout(15000),
      catchError((error: any) => {
        console.error('Erro ao carregar jogos:', error);
        return of([]);
      })
    ).subscribe((jogos: Jogo[]) => {
      if (jogos && jogos.length > 0) {
        this.cache.salvarJogos(jogos);
        this.processarJogos(jogos);
        console.log('✅ Dados do bolão atualizados!');
      }
    });
  }

  // ✅ PROCESSA JOGOS
  private processarJogos(jogos: Jogo[]) {
    const jogosFiltrados = jogos.map(j => ({
      ...j,
      data_hora: new Date(j.data_hora),
      palpite1: j.minha_aposta?.gols_time1 ?? null,
      palpite2: j.minha_aposta?.gols_time2 ?? null,
      salvando: false,
      salvo: false,
      erro: '',
    })) as unknown as JogoComPalpite[];

    const mapa = new Map<string, { abertos: JogoComPalpite[], encerrados: JogoComPalpite[] }>();

    for (const j of jogosFiltrados) {
      const dataLocal = new Date(j.data_hora);
      const chave = dataLocal.toLocaleDateString('pt-BR')
        .split('/').reverse().join('-');

      if (!mapa.has(chave)) mapa.set(chave, { abertos: [], encerrados: [] });

      if (j.encerrado) {
        mapa.get(chave)!.encerrados.push(j);
      } else {
        mapa.get(chave)!.abertos.push(j);
      }
    }

    this.dias = [...mapa.entries()].map(([chave, { abertos, encerrados }]) => ({
      chave,
      data: [...abertos, ...encerrados][0].data_hora,
      jogosAbertos: abertos,
      jogosEncerrados: encerrados,
      expandido: false
    }));
  }

  estaAberto(jogo: JogoComPalpite): boolean {
    const agora = new Date().getTime();
    const inicio = new Date(jogo.data_hora).getTime();
    return agora < inicio;
  }

  salvar(jogo: JogoComPalpite) {
    if (!this.estaAberto(jogo)) {
      jogo.erro = 'Apostas encerradas: o jogo já começou.';
      return;
    }

    jogo.salvando = true;
    jogo.salvo = false;
    jogo.erro = '';

    this.api.salvarAposta(jogo.id, jogo.palpite1!, jogo.palpite2!).subscribe({
      next: (aposta: any) => {
        jogo.minha_aposta = aposta;
        jogo.salvando = false;
        jogo.salvo = true;
        setTimeout(() => (jogo.salvo = false), 3000);
      },
      error: (e: any) => {
        jogo.erro = e.error?.erro || 'Falha ao salvar.';
        jogo.salvando = false;
      },
    });
  }

  fecharAviso() {
    this.avisoDismissed = true;
  }
}
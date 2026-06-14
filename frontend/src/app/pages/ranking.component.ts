import { Component, OnInit } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { RankingItem, Jogo } from '../core/models';
import { AuthService } from '../core/auth.service';
import { SincronizacaoService } from '../core/sincronizacao.service';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [DatePipe, CommonModule],
  template: `
    <main class="conteudo">
      <h1 class="titulo-pagina">Mais acertos</h1>
      <p class="subtitulo">Classificação geral do bolão: pontos, placares exatos e apostas que pontuaram.</p>
      
      @if (peFreio && jogoConcluido > 0) {
        <div class="card-pe-frio">
          <p>
            🥶 <strong>{{ peFreio }}</strong> é o MAIOR PÉ FRIO! 🥶
          </p>
        </div>
      }
      
      @if (carregando) { 
        <p class="vazio">Calculando o ranking…</p> 
      } @else if (itens.length === 0) {
        <p class="vazio">Ainda não há jogos com resultado lançado. O ranking aparece depois da primeira rodada.</p>
      } @else {
        <!-- ✅ DESKTOP: TABELA -->
        <div class="tabela-container">
          <table class="tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Participante</th>
                <th>Pontos</th>
                <th class="hide-mobile">Exatos</th>
                <th class="hide-mobile">Certas</th>
                <th class="hide-mobile">Pontuadas</th>
                <th class="hide-mobile">Totais</th>
                <th>Jogos</th>
                @if (jogoConcluido > 0) {
                  <th class="hide-mobile">Pé frio 🥶</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (item of itens; track item.nome) {
                <tr [class.eu]="item.nome === meuNome" [class.pos-1]="item.posicao === 1">
                  <td class="num">{{ item.posicao === 1 ? '🏆' : item.posicao }}</td>
                  <td class="nome-cell">
                    {{ item.nome }}
                    @if (item.nome === meuNome) { <span class="voce">(você)</span> }
                  </td>
                  <td class="num pts">{{ item.pontos }}</td>
                  <td class="num hide-mobile">{{ item.exatos }}</td>
                  <td class="num hide-mobile">{{ item.acertos }}</td>
                  <td class="num hide-mobile">{{ item.apostas_pontuadas }}</td>
                  <td class="num hide-mobile">{{ item.apostas }}</td>
                  <td class="num">
                    <button class="btn-jogos" (click)="abrirJogos(item)">
                      {{ item.apostas_pontuadas }}
                    </button>
                  </td>
                  @if (jogoConcluido > 0) {
                    <td class="num hide-mobile">{{ peFreioCount(item) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- ✅ MOBILE: CARDS -->
        <div class="ranking-cards">
          @for (item of itens; track item.nome) {
            <div class="ranking-card" [class.destaque]="item.nome === meuNome">
              <div class="card-header">
                <div class="posicao">
                  {{ item.posicao === 1 ? '🏆' : '#' + item.posicao }}
                </div>
                <div class="info-principal">
                  <div class="nome">
                    {{ item.nome }}
                    @if (item.nome === meuNome) { <span class="voce">(você)</span> }
                  </div>
                  <div class="pontos">{{ item.pontos }} pts</div>
                </div>
              </div>

              <div class="card-body">
                <div class="stat">
                  <span class="label">Acertos</span>
                  <span class="valor">{{ item.acertos }}</span>
                </div>
                <div class="stat">
                  <span class="label">Exatos</span>
                  <span class="valor">{{ item.exatos }}</span>
                </div>
                <div class="stat">
                  <span class="label">Apostas</span>
                  <span class="valor">{{ item.apostas_pontuadas }}/{{ item.apostas }}</span>
                </div>
                @if (jogoConcluido > 0) {
                  <div class="stat">
                    <span class="label">Pé frio</span>
                    <span class="valor">🥶 {{ peFreioCount(item) }}</span>
                  </div>
                }
              </div>

              <button class="btn-card-jogos" (click)="abrirJogos(item)">
                Ver jogos em que pontuou
              </button>
            </div>
          }
        </div>
      }

      <!-- ✅ MODAL COM JOGOS -->
      @if (participanteComFoco) {
        <div class="modal-overlay" (click)="participanteComFoco = null">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Jogos em que {{ participanteComFoco.nome }} pontuou ✅</h3>
              <button class="btn-fechar" (click)="participanteComFoco = null">✕</button>
            </div>

            @if (jogosComPontos.length === 0) {
              <p class="vazio-modal">Nenhum jogo com pontuação.</p>
            } @else {
              <div class="jogos-list">
                @for (jogo of jogosComPontos; track jogo.id) {
                  <div class="jogo-item">
                    <div class="jogo-header">
                      <strong>{{ jogo.time1.nome }} × {{ jogo.time2.nome }}</strong>
                      <span class="data">{{ jogo.data_hora | date:'dd/MM HH:mm' }}</span>
                    </div>
                    
                    <div class="jogo-body">
                      <div class="placar-real">
                        <span class="label">Resultado</span>
                        <span class="valor">{{ jogo.gols_time1 }} × {{ jogo.gols_time2 }}</span>
                      </div>
                      
                      @if (jogo.minha_aposta && jogo.minha_aposta.gols_time1 !== null) {
                        <div class="palpite">
                          <span class="label">Palpite</span>
                          <span class="valor">{{ jogo.minha_aposta.gols_time1 }}×{{ jogo.minha_aposta.gols_time2 }}</span>
                        </div>
                        <div class="pts-badge">
                          {{ jogo.minha_aposta.pontos }} pts
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <button class="btn-fechar-modal" (click)="participanteComFoco = null">
              Fechar
            </button>
          </div>
        </div>
      }
    </main>
  `,
  styles: [`
    :host {
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --spacing-xl: 20px;
    }

    /* ✅ TABELA - Desktop */
    .tabela-container {
      display: none;
      overflow-x: auto;
      margin: var(--spacing-lg) 0;
    }

    @media (min-width: 768px) {
      .tabela-container {
        display: block;
      }
    }

    .tabela {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .tabela thead {
      background: var(--campo);
      color: white;
      font-weight: 700;
    }

    .tabela th {
      padding: var(--spacing-md);
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
    }

    .tabela td {
      padding: var(--spacing-md);
      border-bottom: 1px solid #eee;
    }

    .tabela tbody tr {
      transition: background 0.2s;
    }

    .tabela tbody tr:hover {
      background: #f9f9f9;
    }

    .tabela tbody tr.eu {
      background: #fff8e1;
      font-weight: 600;
    }

    .tabela tbody tr.pos-1 {
      background: #e8f5e9;
      font-weight: 700;
    }

    .tabela .num {
      text-align: center;
      font-weight: 600;
    }

    .tabela .pts {
      font-size: 16px;
      color: var(--campo);
    }

    .tabela .nome-cell {
      font-weight: 600;
    }

    .btn-jogos {
      background: var(--campo);
      color: white;
      border: none;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: 4px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      transition: background 0.2s;
    }

    .btn-jogos:hover {
      background: var(--campo-escuro);
    }

    .hide-mobile {
      display: none;
    }

    @media (min-width: 768px) {
      .hide-mobile {
        display: table-cell;
      }
    }

    /* ✅ CARDS - Mobile */
    .ranking-cards {
      display: grid;
      gap: var(--spacing-md);
      margin: var(--spacing-lg) 0;
    }

    @media (min-width: 768px) {
      .ranking-cards {
        display: none;
      }
    }

    .ranking-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: var(--spacing-md);
      transition: all 0.2s;
    }

    .ranking-card.destaque {
      background: #fff8e1;
      border-color: var(--amarelo);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
      align-items: center;
    }

    .posicao {
      font-size: 24px;
      font-weight: 700;
      min-width: 40px;
      text-align: center;
    }

    .info-principal {
      flex: 1;
    }

    .info-principal .nome {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: var(--spacing-xs);
    }

    .info-principal .pontos {
      font-size: 18px;
      font-weight: 700;
      color: var(--campo);
    }

    .voce {
      font-size: 12px;
      color: #666;
      font-weight: normal;
    }

    .card-body {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
      padding: var(--spacing-md);
      background: #f9f9f9;
      border-radius: 6px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .stat .label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat .valor {
      font-size: 16px;
      font-weight: 700;
      color: var(--tinta);
    }

    .btn-card-jogos {
      width: 100%;
      background: var(--campo);
      color: white;
      border: none;
      padding: var(--spacing-md);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      transition: background 0.2s;
    }

    .btn-card-jogos:active {
      background: var(--campo-escuro);
    }

    /* ✅ PÉ FRIO */
    .card-pe-frio {
      background: #fff3cd;
      border: 2px solid #ffc107;
      padding: var(--spacing-md);
      margin: var(--spacing-lg) 0;
      border-radius: 8px;
      text-align: center;
    }

    .card-pe-frio p {
      font-size: 16px;
      font-weight: 700;
      color: #856404;
      margin: 0;
    }

    /* ✅ MODAL */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 1000;
      padding: var(--spacing-md);
    }

    @media (min-width: 768px) {
      .modal-overlay {
        align-items: center;
      }
    }

    .modal-content {
      background: white;
      border-radius: 12px 12px 0 0;
      width: 100%;
      max-width: 600px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    @media (min-width: 768px) {
      .modal-content {
        border-radius: 12px;
        max-height: 80vh;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid #eee;
      position: sticky;
      top: 0;
      background: white;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
    }

    .btn-fechar {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jogos-list {
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .jogo-item {
      padding: var(--spacing-md);
      background: #f9f9f9;
      border-radius: 8px;
      border-left: 4px solid var(--campo);
    }

    .jogo-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    .jogo-header strong {
      font-size: 13px;
      flex: 1;
    }

    .jogo-header .data {
      font-size: 11px;
      color: #999;
      white-space: nowrap;
    }

    .jogo-body {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: var(--spacing-md);
      align-items: center;
    }

    .placar-real,
    .palpite {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .placar-real .label,
    .palpite .label {
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      font-weight: 600;
    }

    .placar-real .valor,
    .palpite .valor {
      font-size: 14px;
      font-weight: 700;
    }

    .pts-badge {
      font-weight: 700;
      background: #fff8e1;
      color: #cc8800;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: 4px;
      font-size: 12px;
      text-align: center;
    }

    .btn-fechar-modal {
      width: calc(100% - var(--spacing-xl) * 2);
      margin: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--campo);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 14px;
    }

    .vazio-modal {
      text-align: center;
      color: var(--tinta-fraca);
      padding: var(--spacing-xl);
    }
  `]
})
export class RankingComponent implements OnInit {
  itens: RankingItem[] = [];
  carregando = true;
  meuNome = '';
  peFreio: string = '';
  jogoConcluido = 0;

  participanteComFoco: RankingItem | null = null;
  jogosComPontos: any[] = [];

  constructor(private api: ApiService, private sincronizacaoService: SincronizacaoService, auth: AuthService) {
    this.meuNome = auth.usuario()?.nome ?? '';
  }

  ngOnInit() {
  if (localStorage.getItem('DEBUG_RANKING') === 'true') {
    const fakeData = [
      { email: 'bruno@email.com', nome: 'Bruno', pontos: 45, exatos: 3, acertos: 12, apostas: 18, apostas_pontuadas: 12, apostas_em_jogos_concluidos: 12, apostas_pontuadas_em_jogos_concluidos: 12, posicao: 1 },
      { email: 'user@email.com', nome: 'Seu Nome', pontos: 38, exatos: 1, acertos: 10, apostas: 18, apostas_pontuadas: 10, apostas_em_jogos_concluidos: 10, apostas_pontuadas_em_jogos_concluidos: 10, posicao: 2 },
      { email: 'ana@email.com', nome: 'Ana Silva', pontos: 32, exatos: 2, acertos: 8, apostas: 18, apostas_pontuadas: 8, apostas_em_jogos_concluidos: 8, apostas_pontuadas_em_jogos_concluidos: 8, posicao: 3 },
    ];
    this.itens = fakeData;
    this.jogoConcluido = 5;
    this.carregando = false;
    return; // ← Pula o resto
  }

    this.sincronizacaoService.sincronizar();
    this.api.ranking().subscribe(itens => {
      this.itens = itens;

      this.api.jogos('todos').subscribe(jogos => {
        this.jogoConcluido = jogos.filter(j => j.encerrado).length;
        
        if (this.jogoConcluido > 0) {
          const piorAcerto = itens.reduce((pior, atual) => {
            const peFreioAtual = this.peFreioCount(atual);
            const peFreioPior = this.peFreioCount(pior);
            return peFreioAtual > peFreioPior ? atual : pior;
          });
          this.peFreio = piorAcerto.nome;
        }
        
        this.carregando = false;
      });
    });
  }

  peFreioCount(item: RankingItem): number {
    const falhas = this.jogoConcluido - item.apostas_pontuadas;
    const maxPontos = Math.max(...this.itens.map(i => i.pontos));
    const diferencaPontos = maxPontos - item.pontos;
    
    return falhas + diferencaPontos;
  }

  abrirJogos(item: RankingItem) {
    this.participanteComFoco = item;
    this.jogosComPontos = [];

    this.api.jogos('todos').subscribe(jogos => {
      const jogosEncerrados = jogos.filter(j => j.encerrado);
      const jogosFinais: any[] = [];

      jogosEncerrados.forEach(jogo => {
        this.api.apostasDoJogo(jogo.id).subscribe(detalhe => {
          const apostaDoParticipante = detalhe.apostas.find(
            aposta => aposta.email === item.email
          );

          if (apostaDoParticipante && apostaDoParticipante.pontos > 0) {
            jogosFinais.push({
              ...jogo,
              minha_aposta: apostaDoParticipante
            });
            
            this.jogosComPontos = jogosFinais.sort((a, b) => 
              new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
            );
          }
        });
      });
    });
  }
}
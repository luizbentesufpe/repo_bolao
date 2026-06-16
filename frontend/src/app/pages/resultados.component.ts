import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ApostasDoJogo, Jogo } from '../core/models';
import { AuthService } from '../core/auth.service';
import { SincronizacaoService } from '../core/sincronizacao.service';
import { CacheService } from '../core/cache.service';
import { ConnectionService } from '../core/connection.service';
import { timeout, catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [DatePipe, FormsModule, CommonModule],
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

      <h1 class="titulo-pagina">Resultados do bolão</h1>
      <p class="subtitulo">Escolha um jogo e veja quanto cada participante marcou nele.</p>

      <div class="campo-form" style="max-width:480px">
        <label for="jogo">Jogo</label>
        <select id="jogo" [(ngModel)]="jogoSelecionado" (ngModelChange)="buscar()"
                style="width:100%; padding:11px 12px; border:1px solid var(--linha); border-radius:6px; font-family:inherit; font-size:14px;">
          <option [ngValue]="null">Selecione um jogo…</option>
          @for (jogo of jogos; track jogo.id) {
            <option [ngValue]="jogo.id">
              {{ jogo.data_hora | date:'dd/MM' }} — {{ jogo.time1.nome }} × {{ jogo.time2.nome }}
            </option>
          }
        </select>
      </div>

      @if (detalhe) {
        <article class="jogo-card" style="margin-top:18px">
          <div class="jogo-time">{{ detalhe.jogo.time1.nome }}</div>
          <div class="placar">
            <span class="digito" [class.vazio]="detalhe.jogo.gols_time1 === null">{{ detalhe.jogo.gols_time1 ?? '–' }}</span>
            <span class="x">×</span>
            <span class="digito" [class.vazio]="detalhe.jogo.gols_time2 === null">{{ detalhe.jogo.gols_time2 ?? '–' }}</span>
          </div>
          <div class="jogo-time dir">{{ detalhe.jogo.time2.nome }}</div>
          <div class="jogo-meta">
            <span>{{ detalhe.jogo.data_hora | date:'dd/MM HH:mm' }}</span>
            <span>{{ detalhe.jogo.estadio }} — {{ detalhe.jogo.cidade_estado }}</span>
            @if (!detalhe.jogo.encerrado && detalhe.liberado) { <span class="tag-hoje">Aguardando placar final</span> }
          </div>
        </article>

        @if (!detalhe.liberado) {
          <p class="vazio">As apostas dos participantes aparecem aqui quando a bola rolar. 🤫</p>
        } @else if (detalhe.apostas.length === 0) {
          <p class="vazio">Ninguém apostou neste jogo.</p>
        } @else {
          <table class="tabela" style="margin-top:14px">
            <thead>
              <tr><th>Participante</th><th>Palpite</th><th>Pontos</th></tr>
            </thead>
            <tbody>
              @for (aposta of detalhe.apostas; track aposta.id) {
                <tr [class.eu]="aposta.email === meuEmail">
                  <td>{{ aposta.nome }} @if (aposta.email === meuEmail) {(você) }</td>
                  <td class="num">{{ aposta.gols_time1 }} × {{ aposta.gols_time2 }}</td>
                  <td class="num">{{ detalhe.jogo.encerrado ? aposta.pontos : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
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

    .jogo-card {
      background: white;
      border: 1px solid var(--linha);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .jogo-time {
      display: flex;
      align-items: center;
      font-weight: 700;
      font-size: 13px;
      color: var(--tinta);
    }

    .jogo-time.dir {
      justify-content: flex-end;
    }

    .placar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
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

    .jogo-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
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
      display: inline-block;
      width: fit-content;
    }

    .tabela {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .tabela thead {
      background: var(--campo);
      color: white;
      font-weight: 700;
    }

    .tabela th {
      padding: 10px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
    }

    .tabela td {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }

    .tabela .num {
      text-align: center;
      font-weight: 600;
    }

    .tabela tr.eu {
      background: #fff8e1;
      font-weight: 600;
    }

    .campo-form {
      margin-bottom: 20px;
    }

    .campo-form label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: var(--tinta-fraca);
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .vazio {
      text-align: center;
      color: #999;
      padding: 20px;
    }
  `]
})
export class ResultadosComponent implements OnInit, OnDestroy {
  jogos: Jogo[] = [];
  jogoSelecionado: number | null = null;
  detalhe: ApostasDoJogo | null = null;
  meuEmail = '';
  online = true;
  sincronizando = false;

  private connectionSubscription: Subscription | null = null;
  private avisoDismissed = false;

  constructor(
    private api: ApiService,
    auth: AuthService,
    private sincronizacaoService: SincronizacaoService,
    private cache: CacheService,
    private connection: ConnectionService
  ) {
    this.meuEmail = auth.usuario()?.email ?? '';
  }

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
    console.log('📦 Carregando resultados do cache...');
    
    const jogosCached = this.cache.obterJogos();
    
    if (jogosCached && jogosCached.length > 0) {
      console.log('✅ Cache encontrado!');
      this.jogos = jogosCached;
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
        this.jogos = jogos;
        console.log('✅ Dados dos resultados atualizados!');
      }
    });
  }

  buscar() {
    this.detalhe = null;
    if (this.jogoSelecionado == null) return;
    
    this.api.apostasDoJogo(this.jogoSelecionado)
      .pipe(
        timeout(15000),
        catchError((error: any) => {
          console.error('Erro ao buscar detalhes:', error);
          return of(null);
        })
      )
      .subscribe((detalhe: ApostasDoJogo | null) => {
        this.detalhe = detalhe;
      });
  }

  fecharAviso() {
    this.avisoDismissed = true;
  }
}
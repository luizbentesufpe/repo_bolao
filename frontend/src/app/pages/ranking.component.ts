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
      <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 12px; margin: 16px 0; border-radius: 8px; text-align: center;">
        <p style="font-size: 18px; font-weight: bold; color: #856404;">
          🥶 <strong>{{ peFreio }}</strong> é o MAIOR PÉ FRIO! 🥶
        </p>
      </div>
    }
    
    @if (carregando) { 
      <p class="vazio">Calculando o ranking…</p> 
    } @else if (itens.length === 0) {
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
            <th>Jogos ✅</th>
            @if (jogoConcluido > 0) {
              <th>Pé frio 🥶</th>
            }
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
              <td class="num">
                <button (click)="abrirJogos(item)" 
                        style="background: var(--campo); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 12px;">
                  {{ item.apostas_pontuadas }}
                </button>
              </td>
              @if (jogoConcluido > 0) {
                <td class="num">🥶 {{ peFreioCount(item) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    }

    <!-- MODAL COM JOGOS EM QUE PONTUOU -->
    @if (participanteComFoco) {
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;" 
           (click)="participanteComFoco = null">
        <div style="background: white; border-radius: 12px; padding: 20px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);" 
             (click)="$event.stopPropagation()">
          
          <h3 style="font-family: var(--fonte-display); margin-bottom: 16px; text-align: center;">
            Jogos em que {{ participanteComFoco.nome }} pontuou ✅
          </h3>

          @if (jogosComPontos.length === 0) {
            <p style="text-align: center; color: var(--tinta-fraca);">Nenhum jogo com pontuação.</p>
          } @else {
            <div style="display: flex; flex-direction: column; gap: 12px;">
              @for (jogo of jogosComPontos; track jogo.id) {
                <div style="padding: 12px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid var(--campo);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>{{ jogo.time1.nome }} × {{ jogo.time2.nome }}</strong>
                    <span style="font-size: 12px; color: var(--tinta-fraca);">{{ jogo.data_hora | date:'dd/MM HH:mm' }}</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-family: var(--fonte-placar); font-weight: 700; font-size: 18px;">
                      {{ jogo.gols_time1 }} × {{ jogo.gols_time2 }}
                    </div>
                    
                    @if (jogo.minha_aposta && jogo.minha_aposta.gols_time1 !== null && jogo.minha_aposta.gols_time2 !== null) {
                      <div style="text-align: right;">
                        <div style="font-weight: 700; font-size: 14px;">
                          Palpite: {{ jogo.minha_aposta.gols_time1 }}×{{ jogo.minha_aposta.gols_time2 }}
                        </div>
                        <div style="font-weight: 700; color: var(--campo); background: #fff8e1; padding: 4px 8px; border-radius: 4px; margin-top: 4px;">
                          {{ jogo.minha_aposta.pontos }} pts
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <button (click)="participanteComFoco = null" 
                  style="width: 100%; margin-top: 16px; padding: 12px; background: var(--campo); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
            Fechar
          </button>
        </div>
      </div>
    }
    </main>
  `,
})
export class RankingComponent implements OnInit {
  itens: RankingItem[] = [];
  carregando = true;
  meuNome = '';
  peFreio: string = '';
  jogoConcluido = 0;

  // ✅ NOVO: Para modal de jogos
  participanteComFoco: RankingItem | null = null;
  jogosComPontos: any[] = [];

  constructor(private api: ApiService, private sincronizacaoService: SincronizacaoService, auth: AuthService) {
    this.meuNome = auth.usuario()?.nome ?? '';
  }

  ngOnInit() {
    this.sincronizacaoService.sincronizar();
    this.api.ranking().subscribe(itens => {
      this.itens = itens;

      // ✅ Buscar jogos para contar quantos foram concluídos
      this.api.jogos('todos').subscribe(jogos => {
        this.jogoConcluido = jogos.filter(j => j.encerrado).length;
        
        // ✅ Calcula pé frio APENAS para jogos concluídos
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

  // ✅ Método para calcular pé frio de forma consistente
  peFreioCount(item: RankingItem): number {
    const falhas = this.jogoConcluido - item.apostas_pontuadas;
    const maxPontos = Math.max(...this.itens.map(i => i.pontos));
    const diferencaPontos = maxPontos - item.pontos;
    
    return falhas + diferencaPontos;
  }
  // ✅ NOVO: Abre modal com jogos em que pontuou
  abrirJogos(item: RankingItem) {
    this.participanteComFoco = item;
    this.jogosComPontos = [];

    // ✅ Busca todos os jogos encerrados
    this.api.jogos('todos').subscribe(jogos => {
      const jogosEncerrados = jogos.filter(j => j.encerrado);
      const jogosFinais: any[] = [];

      // ✅ Para cada jogo, busca os detalhes e encontra a aposta do participante (por EMAIL)
      jogosEncerrados.forEach(jogo => {
        this.api.apostasDoJogo(jogo.id).subscribe(detalhe => {
          // ✅ Encontra a aposta do participante comparando por EMAIL
          const apostaDoParticipante = detalhe.apostas.find(
            aposta => aposta.email === item.email // ✅ COMPARAÇÃO POR EMAIL!
          );

          // ✅ Se encontrou aposta e tem pontos, adiciona à lista
          if (apostaDoParticipante && apostaDoParticipante.pontos > 0) {
            jogosFinais.push({
              ...jogo,
              minha_aposta: apostaDoParticipante
            });
            
            // ✅ Atualiza a lista (ordenada por data)
            this.jogosComPontos = jogosFinais.sort((a, b) => 
              new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
            );
          }
        });
      });
    });
  }
}
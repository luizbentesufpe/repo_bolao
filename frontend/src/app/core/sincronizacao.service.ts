import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment.prod';

/**
 * 🚀 SERVIÇO DE SINCRONIZAÇÃO OTIMIZADO
 * 
 * 1 método único que faz tudo:
 * sincronizar() → Pega dados + sincroniza placares (background)
 */
@Injectable({
  providedIn: 'root'
})
export class SincronizacaoService {
  
  private ultimaSincronizacao: number = 0;
  private INTERVALO_CACHE = 5 * 60 * 1000;  // 5 minutos em ms

  constructor(private http: HttpClient) {}

  /**
   * ✅ FUNÇÃO ÚNICA - Faz tudo!
   * 1. Pega dados do banco (< 500ms)
   * 2. Sincroniza placares em background (não bloqueia)
   */
  sincronizar(onDados?: (jogos: any[]) => void) {
    // ✅ 1. PEGA DADOS (RÁPIDO)
    const urlJogos = `${environment.apiUrl}/api/jogos`;
    this.http.get<any>(urlJogos).subscribe(
      (response) => {
        console.log(`✅ ${response.length} jogos carregados em < 500ms`);
        // Executa callback com os dados
        if (onDados) {
          onDados(response);
        }
      },
      (erro) => {
        console.error('⚠️ Erro ao carregar jogos:', erro);
      }
    );

    // ✅ 2. SINCRONIZA PLACARES (BACKGROUND - não bloqueia)
    this.sincronizarPlacares();
  }

  /**
   * ✅ SINCRONIZA PLACARES (BACKGROUND)
   * Respeta cache de 5 minutos
   */
  private sincronizarPlacares(): void {
    const agora = Date.now();
    const tempoDesdeUltimo = agora - this.ultimaSincronizacao;

    // ✅ Verifica cache ANTES de fazer requisição
    if (this.ultimaSincronizacao > 0 && tempoDesdeUltimo < this.INTERVALO_CACHE) {
      const tempoRestante = Math.ceil((this.INTERVALO_CACHE - tempoDesdeUltimo) / 1000);
      console.log(`⏳ Cache ativo (próxima sync em ${tempoRestante}s)`);
      return;  // PULA a requisição
    }

    console.log('🔄 Sincronizando placares (background)...');
    
    const urlSync = `${environment.apiUrl}/api/sincronizar`;
    
    // ✅ Fire and forget - não espera resposta, não bloqueia
    this.http.post<any>(urlSync, {}).subscribe(
      (response) => {
        if (response.ok) {
          this.ultimaSincronizacao = agora;
          console.log(`✅ Placares sincronizados!`);
        } else {
          console.log(`⏳ ${response.msg}`);
        }
      },
      (erro) => {
        console.error('⚠️ Erro ao sincronizar placares:', erro);
      }
    );
  }
}
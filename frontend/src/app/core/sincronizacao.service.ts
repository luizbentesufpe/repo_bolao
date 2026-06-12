import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment.prod';  // ✅ CORRIGIDO

@Injectable({
  providedIn: 'root'
})
export class SincronizacaoService {
  
  private ultimaSincronizacao: number = 0;  // ✅ NOVO: Cache em memória
  private INTERVALO_CACHE = 5 * 60 * 1000;  // ✅ NOVO: 5 minutos

  constructor(private http: HttpClient) {}

  sincronizar(): void {
    const agora = Date.now();
    const tempoDesdeUltimo = agora - this.ultimaSincronizacao;

    // ✅ NOVO: Verifica cache ANTES de fazer requisição
    if (this.ultimaSincronizacao > 0 && tempoDesdeUltimo < this.INTERVALO_CACHE) {
      const tempoRestante = Math.ceil((this.INTERVALO_CACHE - tempoDesdeUltimo) / 1000);
      console.log(`⏳ Cache ativo (próxima sync em ${tempoRestante}s)`);
      return;  // PULA a requisição
    }

    console.log('🔄 Sincronizando com backend...');
    
    // ✅ CORRIGIDO: Usa environment.apiUrl direto (sem adicionar /api extra)
    const url = `${environment.apiUrl}/api/jogos`;
    
    this.http.get<any>(url).subscribe(
      (response) => {  // ✅ NOVO: Recebe objeto com jogos e ultimaSincronizacao
        // ✅ NOVO: Sincronizar cache com timestamp do backend
        const ultimaSincBackend = response.ultimaSincronizacao;
        
        if (ultimaSincBackend) {
          this.ultimaSincronizacao = new Date(ultimaSincBackend).getTime();
          console.log(`✅ Sincronização concluída! ${response.jogos.length} jogos`);
        } else {
          this.ultimaSincronizacao = agora;
          console.log(`✅ Dados em cache! ${response.jogos.length} jogos`);
        }
      },
      (erro) => {
        console.error('⚠️ Erro ao sincronizar:', erro);
      }
    );
  }
}
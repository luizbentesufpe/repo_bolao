import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class SincronizacaoService {
  
  private ultimaSincronizacao: number = 0;
  private INTERVALO_CACHE = 5 * 60 * 1000;

  constructor(private http: HttpClient) {}

  sincronizar(): void {
    const agora = Date.now();
    const tempoDesdeUltimo = agora - this.ultimaSincronizacao;

    // Verifica cache
    if (this.ultimaSincronizacao > 0 && tempoDesdeUltimo < this.INTERVALO_CACHE) {
      const tempoRestante = Math.ceil((this.INTERVALO_CACHE - tempoDesdeUltimo) / 1000);
      console.log(`⏳ Cache ativo (próxima sync em ${tempoRestante}s)`);
      return;
    }

    console.log('🔄 Sincronizando com backend...');
    
    const url = `${environment.apiUrl}/api/jogos`;
    
    // ✅ Ler resposta COM headers
    this.http.get<any>(url, { observe: 'response' }).subscribe(
      (fullResponse) => {
        // ✅ Ler timestamp do header
        const lastSync = fullResponse.headers.get('X-Last-Sync');
        
        if (lastSync) {
          this.ultimaSincronizacao = new Date(lastSync).getTime();
        } else {
          this.ultimaSincronizacao = agora;
        }
        
        console.log(`✅ Sincronização concluída! ${fullResponse.body.length} jogos`);
      },
      (erro) => {
        console.error('⚠️ Erro ao sincronizar:', erro);
      }
    );
  }
}
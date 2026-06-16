import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly CACHE_KEY = 'jogos_cache';
  private readonly TIMESTAMP_KEY = 'jogos_cache_timestamp';
  private readonly TTL_MINUTOS = 30; // ✅ Cache expira após 30 minutos

  /**
   * ✅ SALVAR jogos no cache com timestamp
   */
  salvarJogos(jogos: any[]): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(jogos));
      localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
      console.log('💾 Jogos salvos em cache');
    } catch (e) {
      console.error('❌ Erro ao salvar cache:', e);
    }
  }

  /**
   * ✅ OBTER jogos do cache
   */
  obterJogos(): any[] | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error('❌ Erro ao obter cache:', e);
      return null;
    }
  }

  /**
   * ✅ VERIFICAR se cache ainda é válido (TTL)
   * @returns true se cache < 30min, false se > 30min
   */
  isCacheValido(): boolean {
    try {
      const timestamp = localStorage.getItem(this.TIMESTAMP_KEY);
      
      if (!timestamp) {
        console.log('⚠️ Cache não tem timestamp');
        return false;
      }

      const agora = Date.now();
      const tempoDecorrido = agora - parseInt(timestamp);
      const minutosDecorridos = tempoDecorrido / (1000 * 60);
      const ehValido = minutosDecorridos < this.TTL_MINUTOS;

      console.log(`⏱️ Cache tem ${Math.round(minutosDecorridos)}min (TTL: ${this.TTL_MINUTOS}min) - ${ehValido ? '✅ Válido' : '❌ Expirado'}`);
      
      return ehValido;
    } catch (e) {
      console.error('❌ Erro ao verificar TTL:', e);
      return false;
    }
  }

  /**
   * ✅ OBTER idade do cache em minutos
   */
  obterIdadeCache(): number {
    try {
      const timestamp = localStorage.getItem(this.TIMESTAMP_KEY);
      
      if (!timestamp) return -1;

      const agora = Date.now();
      const tempoDecorrido = agora - parseInt(timestamp);
      const minutosDecorridos = Math.round(tempoDecorrido / (1000 * 60));

      return minutosDecorridos;
    } catch (e) {
      console.error('❌ Erro ao obter idade do cache:', e);
      return -1;
    }
  }

  /**
   * ✅ LIMPAR cache manualmente
   */
  limparCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.TIMESTAMP_KEY);
      console.log('🗑️ Cache limpo');
    } catch (e) {
      console.error('❌ Erro ao limpar cache:', e);
    }
  }

  /**
   * ✅ VERIFICAR se deve sincronizar em background
   * @returns true se cache expirou e deve sincronizar
   */
  deveSincronizarEmBackground(): boolean {
    const cacheValido = this.isCacheValido();
    const temCache = this.obterJogos() !== null;

    // Se tem cache MAS expirou → sincroniza em background
    if (temCache && !cacheValido) {
      console.log('🔄 Cache expirado → sincronizando em background');
      return true;
    }

    return false;
  }
}
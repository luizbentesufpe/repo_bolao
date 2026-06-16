import { Injectable } from '@angular/core';
import { Jogo } from './models';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = localStorage;
  private TTL_CACHE = 30 * 60 * 1000; // 30 minutos

  /**
   * ✅ SALVAR JOGOS COM TIMESTAMP
   */
  salvarJogos(jogos: Jogo[]) {
    try {
      this.cache.setItem('jogos', JSON.stringify({
        jogos,
        timestamp: Date.now()
      }));
      console.log(`✅ Cache salvo: ${jogos.length} jogos`);
    } catch (e) {
      console.error('❌ Erro ao salvar cache:', e);
    }
  }

  /**
   * ✅ OBTER JOGOS VÁLIDOS (< 30min)
   */
  obterJogos(): Jogo[] {
    if (!this.isCacheValido()) return [];
    return this.obterJogosComFallback();
  }

  /**
   * ✅ NOVO: OBTER JOGOS MESMO QUE EXPIRADOS
   * (Para Cache Fallback - mostrar dados antigos enquanto sincroniza)
   */
  obterJogosComFallback(): Jogo[] {
    const cached = this.cache.getItem('jogos');
    
    if (!cached) {
      console.log('⚠️ Nenhum cache disponível');
      return [];
    }
    
    try {
      const data = JSON.parse(cached);
      const jogos = data.jogos || [];
      console.log(`📦 Obtendo cache: ${jogos.length} jogos (${this.obterIdadeCache()}min atrás)`);
      return jogos;
    } catch (e) {
      console.error('❌ Erro ao parsear cache:', e);
      return [];
    }
  }

  /**
   * ✅ VERIFICAR SE CACHE É VÁLIDO (< 30min)
   */
  isCacheValido(): boolean {
    const cached = this.cache.getItem('jogos');
    
    if (!cached) {
      console.log('⚠️ Cache não existe');
      return false;
    }

    try {
      const data = JSON.parse(cached);
      const idade = Date.now() - (data.timestamp || 0);
      const valido = idade < this.TTL_CACHE;
      
      if (valido) {
        console.log(`✅ Cache válido (${Math.round(idade / 60000)}min atrás)`);
      } else {
        console.log(`⚠️ Cache expirado (${Math.round(idade / 60000)}min atrás)`);
      }
      
      return valido;
    } catch (e) {
      console.error('❌ Erro ao verificar validade:', e);
      return false;
    }
  }

  /**
   * ✅ OBTER IDADE DO CACHE EM MINUTOS
   */
  obterIdadeCache(): number {
    const cached = this.cache.getItem('jogos');
    
    if (!cached) return -1;

    try {
      const data = JSON.parse(cached);
      const idade = Date.now() - (data.timestamp || 0);
      return Math.round(idade / 60000); // em minutos
    } catch {
      return -1;
    }
  }

  /**
   * ✅ LIMPAR CACHE
   */
  limparCache() {
    try {
      this.cache.removeItem('jogos');
      console.log('🗑️ Cache limpo');
    } catch (e) {
      console.error('❌ Erro ao limpar cache:', e);
    }
  }

  /**
   * ✅ VERIFICAR SE DEVE SINCRONIZAR EM BACKGROUND
   * (Se tem cache MAS expirou)
   */
  deveSincronizarEmBackground(): boolean {
    const temCache = this.cache.getItem('jogos') !== null;
    const valido = this.isCacheValido();
    return temCache && !valido;
  }
}
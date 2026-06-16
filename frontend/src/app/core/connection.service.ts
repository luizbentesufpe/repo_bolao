import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public online$ = this.onlineSubject.asObservable();

  constructor() {
    this.monitorarConexao();
  }

  /**
   * ✅ Monitora mudanças de conexão
   */
  private monitorarConexao() {
    window.addEventListener('online', () => {
      console.log('✅ INTERNET RETORNOU');
      this.onlineSubject.next(true);
    });

    window.addEventListener('offline', () => {
      console.warn('❌ SEM INTERNET');
      this.onlineSubject.next(false);
    });
  }

  /**
   * ✅ Retorna se está online agora
   */
  estaOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * ✅ Retorna observable do status
   */
  getStatus(): Observable<boolean> {
    return this.online$;
  }
}
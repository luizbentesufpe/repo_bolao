import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class SincronizacaoService {
  
  constructor(private http: HttpClient) {}

  sincronizar(): void {
    // Fetch silencioso (não bloqueia)
    this.http.get<any>(`${environment.apiUrl}/jogos`).subscribe(
      (jogos) => {
        console.log('✅ Sincronização concluída!', jogos.length, 'jogos');
      },
      (erro) => {
        console.error('⚠️ Erro ao sincronizar:', erro);
      }
    );
  }
}
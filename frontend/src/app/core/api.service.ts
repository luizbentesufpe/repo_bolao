import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Aposta, ApostasDoJogo, Jogo, RankingItem } from './models';
import { environment } from '../../environment/environment.prod';
import { Observable } from 'rxjs';

const API = `${environment.apiUrl}/api`;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  jogos(periodo: 'hoje' | 'semana' | 'todos' = 'todos') {
    return this.http.get<Jogo[]>(`${API}/jogos`, { params: { periodo } });
  }

  salvarAposta(jogoId: number, g1: number, g2: number) {
    return this.http.post<Aposta>(`${API}/apostas`, {
      jogo_id: jogoId,
      gols_time1: g1,
      gols_time2: g2
    });
  }

  // ✅ CORRIGIDO
  apostasDoJogo(jogoId: number): Observable<ApostasDoJogo> {
    return this.http.get<ApostasDoJogo>(`${API}/apostas-do-jogo/${jogoId}`);
  }

  ranking() {
    return this.http.get<RankingItem[]>(`${API}/ranking`);
  }
}
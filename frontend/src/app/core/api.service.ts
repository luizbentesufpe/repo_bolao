import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Aposta, ApostasDoJogo, Jogo, RankingItem } from './models';

const API = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  jogos(periodo: 'hoje' | 'semana' | 'todos' = 'todos') {
    return this.http.get<Jogo[]>(`${API}/jogos`, { params: { periodo } });
  }

  salvarAposta(jogoId: number, g1: number, g2: number) {
    return this.http.post<Aposta>(`${API}/apostas`,
      { jogo_id: jogoId, gols_time1: g1, gols_time2: g2 });
  }

  apostasDoJogo(jogoId: number) {
    return this.http.get<ApostasDoJogo>(`${API}/jogos/${jogoId}/apostas`);
  }

  ranking() {
    return this.http.get<RankingItem[]>(`${API}/ranking`);
  }
}

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Usuario } from './models';
import { environment } from '../../environment/environment.prod';

const API = `${environment.apiUrl}/api`;

interface AuthResposta { token: string; user: Usuario; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuario = signal<Usuario | null>(this.carregarUsuario());

  constructor(private http: HttpClient) {}

  private carregarUsuario(): Usuario | null {
    const raw = localStorage.getItem('bolao_user');
    return raw ? JSON.parse(raw) : null;
  }

  get token(): string | null { return localStorage.getItem('bolao_token'); }
  get logado(): boolean { return !!this.token; }

  login(username: string, senha: string) {
    return this.http.post<AuthResposta>(`${API}/auth/login`, { email: username, senha })
      .pipe(tap(r => this.guardar(r)));
  }

  register(username: string, email: string, senha: string) {
    return this.http.post<AuthResposta>(`${API}/auth/register`, { nome: username, email, senha })
      .pipe(tap(r => this.guardar(r)));
  }

  solicitarReset(email: string) {
    return this.http.post<{ ok: boolean; msg: string }>(`${API}/auth/solicitar-reset`, { email });
  }

  resetarSenha(novaSenha: string) {
    return this.http.post<{ ok: boolean; msg: string }>(`${API}/auth/resetar-senha`, { nova_senha: novaSenha });
  }


  private guardar(r: AuthResposta) {
    localStorage.setItem('bolao_token', r.token);
    localStorage.setItem('bolao_user', JSON.stringify(r.user));
    this.usuario.set(r.user);
  }

  logout() {
    localStorage.removeItem('bolao_token');
    localStorage.removeItem('bolao_user');
    this.usuario.set(null);
  }
}

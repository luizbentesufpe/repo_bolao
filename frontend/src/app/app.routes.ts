import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { AuthComponent } from './pages/auth.component';
import { JogosComponent } from './pages/jogos.component';
import { BolaoComponent } from './pages/bolao.component';
import { ResultadosComponent } from './pages/resultados.component';
import { RankingComponent } from './pages/ranking.component';
import { ResetSenhaComponent } from './pages/reset-senha.component';
import { RankingJogoComponent } from './pages/ranking-jogo.component';
import { PerfilComponent } from './pages/perfil.component';
import { AdminPlacaresComponent } from './pages/admin_placar.component';


export const routes: Routes = [
  { 
    path: '', 
    canActivate: [authGuard],
    redirectTo: 'jogos',
    pathMatch: 'full'
  },
  { path: 'entrar', component: AuthComponent },
  { path: 'resetar-senha', component: ResetSenhaComponent },
  { path: 'jogos', component: JogosComponent, canActivate: [authGuard] },
  { path: 'bolao', component: BolaoComponent, canActivate: [authGuard] },
  { path: 'resultados', component: ResultadosComponent, canActivate: [authGuard] },
  { path: 'ranking', component: RankingComponent, canActivate: [authGuard] },
  { path: 'ranking-jogo', component: RankingJogoComponent, canActivate: [authGuard] },
  {path: 'perfil',  component: PerfilComponent,  canActivate: [authGuard]},
  { path: 'admin-placares', component: AdminPlacaresComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'jogos' },
  { path: '**', redirectTo: 'jogos' },
];

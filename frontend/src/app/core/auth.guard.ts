import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // ✅ Verificar token OU logado
  const temToken = !!localStorage.getItem('auth_token');
  
  return (auth.logado || temToken) ? true : router.createUrlTree(['/entrar']);
};
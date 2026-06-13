import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // ✅ SIMPLES: apenas verificar logado
  // logado já checa localStorage automaticamente!
  return auth.logado ? true : router.createUrlTree(['/entrar']);
};
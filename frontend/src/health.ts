import { inject } from '@angular/core';
import { ApiService } from './app/core/api.service';

export function initHealth() {
  return () => {
    const api = inject(ApiService);

    const check = () => {
      api.sincronizar().subscribe({
        next: (res) => console.log('🔄 Sync:', res),
        error: () => console.log('⚠️ Sync falhou'),
      });
    };

    check();
    setInterval(check, 90000);
  };
}
import { ApiService } from './app/core/api.service';

export function initHealth(api: ApiService) {
  return () => {
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
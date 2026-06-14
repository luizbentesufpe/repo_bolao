import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from './environment/environment';

export function initHealth() {
  return () => {
    const http = inject(HttpClient);

    const check = () => {
      http.get(`${environment.apiUrl}/api/health`).subscribe({
        next: () => console.log('✅ Health check ok'),
        error: () => console.log('⚠️ Health check falhou'),
      });
    };

    check();
    setInterval(check, 90000);
  };
}
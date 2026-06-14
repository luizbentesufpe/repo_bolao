import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from './environment/environment';

export function initHealth() {
  return () => {
    const http = inject(HttpClient);
    const API_BASE = environment.apiUrl + 'api';
    // Chamar /api/health a cada 90 segundos
    setInterval(() => {
      http.get(`https://${API_BASE}/health`).subscribe(
        () => console.log('✅ Health check'),
        () => console.log('Health check falhou')
      );
    }, 90000);
  };
}
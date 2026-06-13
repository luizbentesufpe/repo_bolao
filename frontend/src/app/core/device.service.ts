import { Injectable } from '@angular/core';

/**
 * ✅ Serviço para detectar se é mobile/celular
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private isMobileCache: boolean | null = null;

  constructor() {}

  /**
   * ✅ Verifica se é um dispositivo mobile
   */
  isMobile(): boolean {
    if (this.isMobileCache !== null) return this.isMobileCache;

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    // ✅ Detecta Android
    const isAndroid = /android/i.test(userAgent);

    // ✅ Detecta iOS
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);

    // ✅ Detecta dispositivos com tela pequena
    const isSmallScreen = window.innerWidth <= 768;

    this.isMobileCache = isAndroid || isIOS || isSmallScreen;
    return this.isMobileCache;
  }

  /**
   * ✅ Verifica se o PWA já foi instalado
   */
  isPWAInstalled(): boolean {
    // ✅ Verifica se está em modo standalone (app instalado)
    return (window.navigator as any).standalone === true 
      || window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * ✅ Verifica se o navegador suporta PWA
   */
  supportsPWA(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  }
}
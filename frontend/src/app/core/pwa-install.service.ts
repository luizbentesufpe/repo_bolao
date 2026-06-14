import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  canInstall$ = new BehaviorSubject(false);
  private deferredPrompt: any;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall$.next(true);
    });

    window.addEventListener('appinstalled', () => {
      this.canInstall$.next(false);
      this.deferredPrompt = null;
    });
  }

  async instalar() {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    console.log(`Usuário respondeu: ${outcome}`);
    
    this.deferredPrompt = null;
    this.canInstall$.next(false);
  }
}
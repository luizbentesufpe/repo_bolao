import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { DeviceService } from './device.service';

@Injectable({ providedIn: 'root' })
export class BackButtonService {
  doubleTapSair$ = new Subject<void>();
  private ultimoBackPress = 0;
  private contadorBack = 0;

  constructor(private device: DeviceService) {
    this.detectBackButton();
  }

  private detectBackButton() {
    // ✅ APENAS mobile: detecta popstate (botão voltar do celular)
    if (!this.device.isMobile()) {
      console.log('💻 Desktop: back button desativado');
      return;
    }

    window.addEventListener('popstate', () => {
      this.handleBackPress();
    });

    console.log('📱 Mobile: back button ativado');
  }

  private handleBackPress() {
    const agora = Date.now();
    
    // Reset se passou mais de 2 segundos
    if (agora - this.ultimoBackPress > 2000) {
      this.contadorBack = 1;
      console.log('👈 Primeiro voltar detectado');
    } else {
      this.contadorBack++;
      console.log(`👈 Voltar #${this.contadorBack}`);
    }

    this.ultimoBackPress = agora;

    // ✅ 2 VEZES = PERGUNTA SAIR DO APP
    if (this.contadorBack >= 2) {
      console.log('⚠️ Double tap detectado! Perguntando sair do app...');
      this.doubleTapSair$.next();
      this.contadorBack = 0;
      return;
    }

    // 1 VEZ = NAVEGA PARA TRÁS NORMAL
    history.back();
  }
}
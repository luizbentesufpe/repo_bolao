import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bandeira',
  standalone: true,
})
export class BandeiraPipe implements PipeTransform {
  // Mapa: nome do time → arquivo da bandeira
  private mapa: { [key: string]: string } = {
    // Grupo A
    'México': 'México.png',
    'África do Sul': 'África_do_Sul.png',
    'Coreia do Sul': 'Coreia_do_Sul.png',
    'República Tcheca': 'República_Tcheca.png',
    
    // Grupo B
    'Canadá': 'Canadá.png',
    'Bósnia e Herzegovina': 'Bósnia_e_Herzegovina.png',
    'Catar': 'Catar.png',
    'Suíça': 'Suíça.png',
    
    // Grupo C
    'Brasil': 'Brasil.png',
    'Marrocos': 'Marrocos.png',
    'Haiti': 'Haiti.png',
    'Escócia': 'Escócia.png',
    
    // Grupo D
    'Estados Unidos': 'Estados_Unidos.png',
    'Paraguai': 'Paraguai.png',
    'Austrália': 'Austrália.png',
    'Turquia': 'Turquia.png',
    
    // Grupo E
    'Alemanha': 'Alemanha.png',
    'Curaçau': 'Curaçau.png',
    'Costa do Marfim': 'Costa_do_Marfim.png',
    'Equador': 'Equador.png',
    
    // Grupo F
    'Holanda': 'Holanda.png',
    'Japão': 'Japão.png',
    'Suécia': 'Suécia.png',
    'Tunísia': 'Tunísia.png',
    
    // Grupo G
    'Bélgica': 'Bélgica.png',
    'Egito': 'Egito.png',
    'Irã': 'Irã.png',
    'Nova Zelândia': 'Nova_Zelândia.png',
    
    // Grupo H
    'Espanha': 'Espanha.png',
    'Cabo Verde': 'Cabo_Verde.png',
    'Arábia Saudita': 'Arábia_Saudita.png',
    'Uruguai': 'Uruguai.png',
    
    // Grupo I
    'França': 'França.png',
    'Senegal': 'Senegal.png',
    'Iraque': 'Iraque.png',
    'Noruega': 'Noruega.png',
    
    // Grupo J
    'Argentina': 'Argentina.png',
    'Argélia': 'Argélia.png',
    'Áustria': 'Áustria.png',
    'Jordânia': 'Jordânia.png',
    
    // Grupo K
    'Portugal': 'Portugal.png',
    'RD Congo': 'RD_Congo.png',
    'Uzbequistão': 'Uzbequistão.png',
    'Colômbia': 'Colômbia.png',
    
    // Grupo L
    'Inglaterra': 'Inglaterra.png',
    'Croácia': 'Croácia.png',
    'Gana': 'Gana.png',
    'Panamá': 'Panamá.png',
  };

  transform(nomeTime: string): string {
    const arquivo = this.mapa[nomeTime];
    if (!arquivo) {
      console.warn(`Bandeira não encontrada para: ${nomeTime}`);
      return 'assets/bandeiras/default.png';
    }
    return `assets/bandeiras/${arquivo}`;
  }
}
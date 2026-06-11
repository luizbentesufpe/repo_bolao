export interface Usuario { id: number; nome: string; email: string; }

export interface TimeDto { id: number; nome: string; cidade: string; simbolo: string; }

export interface Jogo {
  id: number;
  campeonato: { id: number; nome: string };
  time1: TimeDto;
  time2: TimeDto;
  data_hora: string;
  gols_time1: number | null;
  gols_time2: number | null;
  estadio: string;
  cidade_estado: string;
  encerrado: boolean;
  comecou: boolean;
  minha_aposta: Aposta | null;
}

export interface Aposta {
  id: number;
  jogo_id: number;
  gols_time1: number | null;
  gols_time2: number | null;
  pontos: number;
  email?: string;
  nome?: string;
}

export interface ApostasDoJogo { jogo: Jogo; liberado: boolean; apostas: Aposta[]; }

export interface RankingItem {
  posicao: number; nome: string; pontos: number;
  exatos: number; acertos: number; apostas: number;
  apostas_pontuadas: number;
}

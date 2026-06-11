# Bolão da Copa 2026 — Angular + Flask

Bolão de placares da fase de grupos da Copa do Mundo 2026.

## Estrutura

```
bolao/
├── backend/    API Flask + SQLAlchemy (models no estilo do Django original)
│   ├── app.py        rotas (auth, jogos, apostas, ranking)
│   ├── models.py     User, Time, Campeonato, Jogo, Aposta
│   ├── seed.py       popula os 72 jogos da fase de grupos
│   └── requirements.txt
└── frontend/   Angular 17 (standalone components)
    └── src/app/
        ├── core/     AuthService, ApiService, interceptor JWT, guard
        └── pages/    entrar | jogos | bolao | resultados | ranking
```

## Rodando o backend (http://localhost:5000)

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed.py            # cria bolao.db com os 72 jogos
flask --app app run --debug
```

## Rodando o frontend (http://localhost:4200)

```bash
cd frontend
npm install
npm start
```

## Telas

| Rota          | O que faz                                                                  |
|---------------|----------------------------------------------------------------------------|
| `/entrar`     | Login e cadastro (username, email, senha) com JWT                          |
| `/jogos`      | Jogos de hoje / da semana / todos, com placar e sua aposta                  |
| `/bolao`      | Palpites nos jogos que ainda não começaram (salva/atualiza)                 |
| `/resultados` | Apostas de todos os participantes em um jogo, com pontos (após a bola rolar)|
| `/ranking`    | Mais acertos: pontos, placares exatos e apostas pontuadas                   |

## Pontuação

- Placar exato: **10 pts**
- Acertou o resultado (vencedor/empate): **5 pts**
- Bônus por acertar os gols de um dos times: **+2 pts** cada

## Lançar resultado de um jogo (admin simples)

```bash
curl -X POST http://localhost:5000/api/jogos/7/resultado \
  -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"gols_time1": 3, "gols_time2": 1}'
```

> Em produção: troque `JWT_SECRET_KEY`, restrinja o CORS e proteja o endpoint de resultado.

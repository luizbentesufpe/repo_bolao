# -*- coding: utf-8 -*-
"""
API do Bolao da Copa 2026 (Flask).

Rodar:
    pip install -r requirements.txt
    python seed.py        # cria o banco e popula os 72 jogos da fase de grupos
    flask --app app run --debug   # http://localhost:5000
"""

import os
from datetime import datetime, timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from models import Aposta, Jogo, User, db
from sync_knockout import seed_knockout_matches

app = Flask(__name__)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL",
    "sqlite:///bolao.db",  # fallback local para desenvolvimento
)

app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY", "chave-desenvolvimento-insegura"
)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

db.init_app(app)
jwt = JWTManager(app)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["https://bolao-web-0s5h.onrender.com"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)

# ✅ Cache para sincronização on-demand
ultimo_sync = None
INTERVALO_SYNC = 5  # minutos


def erro(msg, status=400):
    return jsonify({"erro": msg}), status


# ✅ FUNÇÃO PARA CALCULAR PONTOS
def calcular_pontos(aposta, jogo):
    """
    Calcula pontos da aposta baseado na nova regra:
    - Placar exato: 5 pts
    - Vencedor/Empate: 2 pts
    - Gols de uma equipe: 1 pt
    - Errou: 0 pts
    """
    if aposta.gols_time1 is None or aposta.gols_time2 is None:
        return 0

    if jogo.gols_time1 is None or jogo.gols_time2 is None:
        return 0

    # Placar exato
    if aposta.gols_time1 == jogo.gols_time1 and aposta.gols_time2 == jogo.gols_time2:
        return 5

    # Vencedor ou empate
    meu_resultado = (
        "empate"
        if aposta.gols_time1 == aposta.gols_time2
        else ("time1" if aposta.gols_time1 > aposta.gols_time2 else "time2")
    )
    real_resultado = (
        "empate"
        if jogo.gols_time1 == jogo.gols_time2
        else ("time1" if jogo.gols_time1 > jogo.gols_time2 else "time2")
    )

    if meu_resultado == real_resultado:
        return 2

    # Gols de uma equipe
    if aposta.gols_time1 == jogo.gols_time1 or aposta.gols_time2 == jogo.gols_time2:
        return 1

    return 0


# ========================================== FUNÇÃO PARA RECALCULAR PONTOS
def recalcular_pontos_jogo(jogo):
    """Recalcula pontos quando jogo termina (status = FINISHED)"""

    if not jogo.encerrado:
        return

    apostas = Aposta.query.filter_by(jogo_id=jogo.id).all()

    for aposta in apostas:
        # EXATO
        if (
            aposta.gols_time1 == jogo.gols_time1
            and aposta.gols_time2 == jogo.gols_time2
        ):
            aposta.pontos = 5
        else:
            # VENCEDOR/EMPATE
            aposta_resultado = (
                "time1"
                if aposta.gols_time1 > aposta.gols_time2
                else "time2"
                if aposta.gols_time1 < aposta.gols_time2
                else "empate"
            )

            jogo_resultado = (
                "time1"
                if jogo.gols_time1 > jogo.gols_time2
                else "time2"
                if jogo.gols_time1 < jogo.gols_time2
                else "empate"
            )

            if aposta_resultado == jogo_resultado:
                aposta.pontos = 2
            # 1 GOL CORRETO
            elif (
                aposta.gols_time1 == jogo.gols_time1
                or aposta.gols_time2 == jogo.gols_time2
            ):
                aposta.pontos = 1
            else:
                aposta.pontos = 0


# ---------------------------------------------------------------- AUTENTICACAO
@app.post("/api/auth/register")
def register():
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    if not nome or not email or not senha:
        return erro("Informe nome, email e senha.")
    if len(senha) < 4:
        return erro("A senha precisa de pelo menos 4 caracteres.")
    if User.query.filter_by(email=email).first():
        return erro("Esse email ja esta cadastrado.")

    user = User(nome=nome, email=email)
    user.set_senha(senha)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify(
        {
            "token": token,
            "user": {"id": user.id, "nome": user.nome, "email": user.email},
        }
    ), 201


@app.post("/api/auth/login")
def login():
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.checa_senha(senha):
        return erro("Email ou senha invalidos.", 401)

    token = create_access_token(identity=str(user.id))
    return jsonify(
        {
            "token": token,
            "user": {"id": user.id, "nome": user.nome, "email": user.email},
        }
    )


# -------------------------------------------------------------------- JOGOS
@app.get("/api/jogos")
@jwt_required(optional=True)
def listar_jogos():
    global ultimo_sync
    from sync_resultados import sincronizar_resultados

    agora = datetime.now()

    # ✅ Sincroniza apenas se passou INTERVALO_SYNC minutos desde o último sync
    if (
        ultimo_sync is None
        or (agora - ultimo_sync).total_seconds() > INTERVALO_SYNC * 60
    ):
        print(
            f"[{agora.strftime('%H:%M:%S')}] 🔄 Sincronizando placares...", flush=True
        )
        sincronizar_resultados(app=app, verbose=False, status_filter=None)
        print(f"[{agora.strftime('%H:%M:%S')}] 🎯 Populando mata-mata...", flush=True)
        seed_knockout_matches(app=app, verbose=False)
        ultimo_sync = agora
        print(f"[{agora.strftime('%H:%M:%S')}] ✅ Sincronização concluída!", flush=True)
    else:
        tempo_restante = INTERVALO_SYNC * 60 - (agora - ultimo_sync).total_seconds()
        print(
            f"[{agora.strftime('%H:%M:%S')}] ⏳ Cache ativo (próximo sync em {int(tempo_restante)}s)",
            flush=True,
        )

    query = Jogo.query.order_by(Jogo.data_hora)

    user_id = get_jwt_identity()
    minhas = {}
    if user_id:
        minhas = {
            a.jogo_id: a for a in Aposta.query.filter_by(user_id=int(user_id)).all()
        }

    saida = []

    # ✅ RECALCULAR PONTOS PARA JOGOS FINALIZADOS
    for jogo in query.all():
        if jogo.encerrado:
            recalcular_pontos_jogo(jogo)

        d = jogo.to_dict()
        aposta = minhas.get(jogo.id)
        d["minha_aposta"] = aposta.to_dict() if aposta else None
        saida.append(d)

    db.session.commit()
    return jsonify(saida)


@app.get("/api/apostas-do-jogo/<int:jogo_id>")
@jwt_required(optional=True)
def apostas_do_jogo(jogo_id):
    """Resultado do bolao por jogo: todas as apostas + pontos de cada um."""
    jogo = Jogo.query.get_or_404(jogo_id)

    # ✅ ORDENA POR COLUNA PONTOS (não calcula dinamicamente)
    apostas = Aposta.query.filter_by(jogo_id=jogo_id).all()
    apostas_sorted = sorted(apostas, key=lambda a: a.pontos or 0, reverse=True)

    return jsonify(
        {
            "jogo": jogo.to_dict(),
            "liberado": not jogo.comecou,
            "apostas": [a.to_dict(com_user=True) for a in apostas_sorted],
        }
    )


# ------------------------------------------------------------------- APOSTAS
@app.post("/api/apostas")
@jwt_required()
def salvar_aposta():
    """Cria/atualiza a aposta do usuario logado em um jogo (upsert)."""
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}

    jogo = Jogo.query.get(dados.get("jogo_id"))
    if jogo is None:
        return erro("Jogo nao encontrado.", 404)
    if jogo.comecou:
        return erro("Apostas encerradas: o jogo ja comecou.", 422)

    try:
        g1 = int(dados.get("gols_time1"))
        g2 = int(dados.get("gols_time2"))
        if g1 < 0 or g2 < 0 or g1 > 99 or g2 > 99:
            raise ValueError
    except (TypeError, ValueError):
        return erro("Informe um placar valido (0 a 99).")

    aposta = Aposta.query.filter_by(jogo_id=jogo.id, user_id=user_id).first()
    if aposta is None:
        aposta = Aposta(jogo_id=jogo.id, user_id=user_id)
        db.session.add(aposta)

    aposta.gols_time1 = g1
    aposta.gols_time2 = g2

    # ✅ CALCULA E ARMAZENA PONTOS NA COLUNA
    aposta.pontos = calcular_pontos(aposta, jogo)

    db.session.commit()
    return jsonify(aposta.to_dict()), 200


# ------------------------------------------------------------------- RANKING
@app.get("/api/ranking")
@jwt_required()
def ranking():
    """Mais acertos: pontos totais, placares exatos e apostas pontuadas."""

    # ✅ NOVO: Buscar IDs dos jogos concluídos UMA VEZ (performance)
    jogos_concluidos_ids = set(
        j.id
        for j in Jogo.query.filter(
            Jogo.gols_time1.isnot(None), Jogo.gols_time2.isnot(None)
        ).all()
    )

    tabela = {}
    for aposta in Aposta.query.all():
        jogo = aposta.jogo
        item = tabela.setdefault(
            aposta.user_id,
            {
                "nome": aposta.user.nome,
                "pontos": 0,
                "exatos": 0,
                "acertos": 0,
                "apostas": 0,
                "apostas_pontuadas": 0,
                "apostas_em_jogos_concluidos": 0,  # ✅ NOVO
                "apostas_pontuadas_em_jogos_concluidos": 0,  # ✅ NOVO
            },
        )
        item["apostas"] += 1

        # ✅ NOVO: Se jogo foi concluído, contar também
        if aposta.jogo_id in jogos_concluidos_ids:
            item["apostas_em_jogos_concluidos"] += 1

        if aposta.pontos is not None and aposta.pontos > 0:
            item["pontos"] += aposta.pontos
            item["acertos"] += 1
            item["apostas_pontuadas"] += 1

            # ✅ NOVO: Se pontuou em jogo concluído, contar também
            if aposta.jogo_id in jogos_concluidos_ids:
                item["apostas_pontuadas_em_jogos_concluidos"] += 1

        # ✅ MELHORADO: Só contar exatos em jogos concluídos
        if (
            aposta.jogo_id in jogos_concluidos_ids
            and aposta.gols_time1 == jogo.gols_time1
            and aposta.gols_time2 == jogo.gols_time2
        ):
            item["exatos"] += 1

    saida = sorted(
        tabela.values(), key=lambda i: (i["pontos"], i["exatos"]), reverse=True
    )
    for pos, item in enumerate(saida, start=1):
        item["posicao"] = pos
    return jsonify(saida)


# ------------------------------------------------- RESULTADO (admin simples)
@app.post("/api/jogos/<int:jogo_id>/resultado")
@jwt_required()
def lancar_resultado(jogo_id):
    """Endpoint simples para lancar o placar final de um jogo."""
    jogo = Jogo.query.get_or_404(jogo_id)
    dados = request.get_json(silent=True) or {}
    try:
        jogo.gols_time1 = int(dados.get("gols_time1"))
        jogo.gols_time2 = int(dados.get("gols_time2"))
    except (TypeError, ValueError):
        return erro("Placar invalido.")
    db.session.commit()
    return jsonify(jogo.to_dict())


@app.post("/api/auth/solicitar-reset")
def solicitar_reset():
    """Gera um token de reset e 'envia' por email (simula aqui)."""
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()

    user = User.query.filter_by(email=email).first()
    if not user:
        # Nao revela se email existe ou nao (seguranca)
        return jsonify(
            {"ok": True, "msg": "Se o email existe, recebera um link de reset."}
        ), 200

    # Token válido por 1 hora
    reset_token = create_access_token(
        identity=str(user.id), expires_delta=timedelta(hours=1)
    )
    # Em producao: enviar email com link
    # https://seu-app.com/resetar-senha?token=TOKEN
    print(f"[DEBUG] Reset token para {email}: {reset_token}")

    return jsonify(
        {"ok": True, "msg": "Link de reset enviado (verifique o terminal para teste)."}
    ), 200


@app.post("/api/auth/resetar-senha")
@jwt_required()
def resetar_senha():
    """Reseta a senha do usuario logado (com token de reset valido)."""
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}
    nova_senha = dados.get("nova_senha") or ""

    if len(nova_senha) < 4:
        return erro("A senha precisa de pelo menos 4 caracteres.")

    user = User.query.get(user_id)
    user.set_senha(nova_senha)
    db.session.commit()
    return jsonify({"ok": True, "msg": "Senha alterada com sucesso!"}), 200


@app.post("/api/admin/sync-resultados")
@jwt_required()
def sync_resultados():
    """Sincroniza resultados com a API football-data.org"""
    from sync_resultados import sincronizar_resultados

    sucesso = sincronizar_resultados(app=app, verbose=True, status_filter=None)

    if sucesso:
        return jsonify(
            {"ok": True, "msg": "Resultados sincronizados com sucesso!"}
        ), 200
    else:
        return jsonify({"ok": False, "erro": "Falha ao sincronizar"}), 500


@app.post("/api/auth/atualizar-perfil")
@jwt_required()
def atualizar_perfil():
    """Atualiza o perfil do usuario logado (nome)."""
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()

    if not nome:
        return erro("Nome não pode estar vazio.")

    user = User.query.get(user_id)
    user.nome = nome
    db.session.commit()

    return jsonify(
        {"ok": True, "user": {"id": user.id, "nome": user.nome, "email": user.email}}
    ), 200


if __name__ == "__main__":
    app.run(debug=True)

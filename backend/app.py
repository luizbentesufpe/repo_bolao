# -*- coding: utf-8 -*-
"""
API do Bolao da Copa 2026 (Flask).

Rodar:
    pip install -r requirements.txt
    python seed.py        # cria o banco e popula os 72 jogos da fase de grupos
    flask --app app run --debug   # http://localhost:5000
"""

from datetime import timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from models import Aposta, Jogo, User, db
from functools import wraps
from flask import request, jsonify
 
import os

app = Flask(__name__)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app.config["SQLALCHEMY_DATABASE_URI"] = \
    f"sqlite:///{os.path.join(BASE_DIR, 'bolao.db')}"
app.config["JWT_SECRET_KEY"] = "bolao_da_familia_martins"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

db.init_app(app)
jwt = JWTManager(app)
CORS(app)


def erro(msg, status=400):
    return jsonify({"erro": msg}), status


# ---------------------------------------------------------------- AUTENTICACAO
@app.post("/api/auth/register")
def register():
    dados = request.get_json(silent=True) or {}
    username = (dados.get("username") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    if not username or not email or not senha:
        return erro("Informe username, email e senha.")
    if len(senha) < 4:
        return erro("A senha precisa de pelo menos 4 caracteres.")
    if User.query.filter_by(username=username).first():
        return erro("Esse username ja esta em uso.")
    if User.query.filter_by(email=email).first():
        return erro("Esse email ja esta cadastrado.")

    user = User(username=username, email=email)
    user.set_senha(senha)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify(
        {
            "token": token,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        }
    ), 201


@app.post("/api/auth/login")
def login():
    dados = request.get_json(silent=True) or {}
    username = (dados.get("username") or "").strip()
    senha = dados.get("senha") or ""

    user = User.query.filter_by(username=username).first()
    if not user or not user.checa_senha(senha):
        return erro("Username ou senha invalidos.", 401)

    token = create_access_token(identity=str(user.id))
    return jsonify(
        {
            "token": token,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        }
    )


# -------------------------------------------------------------------- JOGOS
@app.get("/api/jogos")
@jwt_required(optional=True)
def listar_jogos():
    query = Jogo.query.order_by(Jogo.data_hora)

    user_id = get_jwt_identity()
    minhas = {}
    if user_id:
        minhas = {
            a.jogo_id: a for a in Aposta.query.filter_by(user_id=int(user_id)).all()
        }

    saida = []
    for jogo in query.all():
        d = jogo.to_dict()
        aposta = minhas.get(jogo.id)
        d["minha_aposta"] = aposta.to_dict() if aposta else None
        saida.append(d)
    return jsonify(saida)


@app.get("/api/jogos/<int:jogo_id>/apostas")
@jwt_required()
def apostas_do_jogo(jogo_id):
    """Resultado do bolao por jogo: todas as apostas + pontos de cada um."""
    jogo = Jogo.query.get_or_404(jogo_id)
    if not jogo.comecou:
        # apostas dos outros so ficam visiveis depois que a bola rola
        return jsonify({"jogo": jogo.to_dict(), "apostas": [], "liberado": False})

    apostas = sorted(jogo.apostas, key=lambda a: a.pontos(), reverse=True)
    return jsonify(
        {
            "jogo": jogo.to_dict(),
            "liberado": True,
            "apostas": [a.to_dict(com_user=True) for a in apostas],
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
    db.session.commit()
    return jsonify(aposta.to_dict()), 200


# ------------------------------------------------------------------- RANKING
@app.get("/api/ranking")
@jwt_required()
def ranking():
    """Mais acertos: pontos totais, placares exatos e apostas pontuadas."""
    tabela = {}
    for aposta in (
        Aposta.query.join(Jogo)
        .filter(Jogo.gols_time1.isnot(None), Jogo.gols_time2.isnot(None))
        .all()
    ):
        item = tabela.setdefault(
            aposta.user_id,
            {
                "username": aposta.user.username,
                "pontos": 0,
                "exatos": 0,
                "acertos": 0,
                "apostas": 0,
            },
        )
        pts = aposta.pontos()
        item["apostas"] += 1
        item["pontos"] += pts
        if aposta.exato:
            item["exatos"] += 1
        if pts > 0:
            item["acertos"] += 1

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


@app.post('/api/auth/solicitar-reset')
def solicitar_reset():
    """Gera um token de reset e 'envia' por email (simula aqui)."""
    dados = request.get_json(silent=True) or {}
    email = (dados.get('email') or '').strip().lower()

    user = User.query.filter_by(email=email).first()
    if not user:
        # Nao revela se email existe ou nao (seguranca)
        return jsonify({'ok': True,
                       'msg': 'Se o email existe, recebera um link de reset.'}), 200

    # Token válido por 1 hora
    reset_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=1)
    )
    # Em producao: enviar email com link
    # https://seu-app.com/resetar-senha?token=TOKEN
    print(f"[DEBUG] Reset token para {email}: {reset_token}")

    return jsonify({'ok': True,
                   'msg': 'Link de reset enviado (verifique o terminal para teste).'}), 200


@app.post('/api/auth/resetar-senha')
@jwt_required()
def resetar_senha():
    """Reseta a senha do usuario logado (com token de reset valido)."""
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}
    nova_senha = dados.get('nova_senha') or ''

    if len(nova_senha) < 4:
        return erro('A senha precisa de pelo menos 4 caracteres.')

    user = User.query.get(user_id)
    user.set_senha(nova_senha)
    db.session.commit()
    return jsonify({'ok': True, 'msg': 'Senha alterada com sucesso!'}), 200


if __name__ == "__main__":
    app.run(debug=True)

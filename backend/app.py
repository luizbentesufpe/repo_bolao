# -*- coding: utf-8 -*-
"""
API do Bolao da Copa 2026 (Flask com APScheduler).
🚀 FINAL: 2 ENDPOINTS SEPARADOS + SCHEDULER AUTOMÁTICO
1. GET /api/jogos → Dados do banco (< 500ms, SEM cache)
2. POST /api/sincronizar → Sincroniza com API (background, COM cache 5 min)
3. SCHEDULER → Notificações automáticas 30min e 10min antes dos jogos
✅ CACHE CORRETO:
- Dados do BANCO: Sem cache (sempre fresco)
- Chamadas EXTERNAS (API football-data): Com cache 5 min
Rodar:
    pip install -r requirements.txt
    python seed.py        # cria o banco e popula os 72 jogos da fase de grupos
    flask --app app run --debug   # http://localhost:5000
"""

import json
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
from apscheduler.schedulers.background import BackgroundScheduler
from models import Aposta, Jogo, User, db, NotificationSubscription
from pywebpush import WebPushException, webpush
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

ultimo_sync_timestamp = None

db.init_app(app)
jwt = JWTManager(app)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://bolao-web-0s5h.onrender.com",
                "https://repo-bolao-1.onrender.com",
                "https://pwa-test-m02z.onrender.com",
                "http://localhost:4200",
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)

# ✅ SCHEDULER PARA NOTIFICAÇÕES AUTOMÁTICAS
scheduler = BackgroundScheduler()

# ✅ Cache para sincronização on-demand
ultimo_sync = None
INTERVALO_SYNC = 5  # minutos


def erro(msg, status=400):
    return jsonify({"erro": msg}), status


def resposta_sem_cache(data):
    """Retorna resposta JSON SEM cache (para dados do banco)"""
    response = jsonify(data)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# ✅ FUNÇÃO PARA ENVIAR NOTIFICAÇÕES (PUSH)
def enviar_push(subscription, titulo, mensagem, opcoes=None):
    """
    ✅ Envia push notification para um usuário
    """
    vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
    frontend_url = os.getenv("FRONTEND_URL", "")
    vapid_claims = {"sub": "mailto:seu-email@example.com"}
    
    payload = {
        "title": titulo,
        "body": mensagem,
        "icon": f"{frontend_url}/assets/icon-192.png",
        "badge": f"{frontend_url}/assets/icon-192.png",
        "tag": opcoes.get("tag", "notificacao") if opcoes else "notificacao",
        "requireInteraction": opcoes.get("requireInteraction", False) if opcoes else False,
        **(opcoes or {}),
    }

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"auth": subscription.auth, "p256dh": subscription.p256dh},
            },
            data=json.dumps(payload),
            vapid_private_key=vapid_private_key,
            vapid_claims=vapid_claims,
        )
        return True
    except WebPushException as e:
        print(f"❌ Erro ao enviar push: {e}")
        try:
            db.session.delete(subscription)
            db.session.commit()
        except:
            pass
        return False


# ✅ FUNÇÃO DO SCHEDULER - VERIFICA JOGOS PRÓXIMOS
def verificar_jogos_proximos():
    """
    ⏰ Verifica jogos que começam em 30 min e 10 min
    Envia notificações para usuários inscritos
    Roda a cada 5 minutos em background
    """
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔔 Verificando jogos próximos...")
        
        with app.app_context():
            agora = datetime.now()
            
            # Jogos que começam em ~30 minutos
            jogo_30min = Jogo.query.filter(
                Jogo.data_hora > agora + timedelta(minutes=25),
                Jogo.data_hora < agora + timedelta(minutes=35),
                Jogo.status_api == "TIMED",
                Jogo.gols_time1.is_(None), 
            ).first()
            
            # Jogos que começam em ~10 minutos
            jogo_10min = Jogo.query.filter(
                Jogo.data_hora > agora + timedelta(minutes=5),
                Jogo.data_hora < agora + timedelta(minutes=15),
                Jogo.status_api == "TIMED",
                Jogo.gols_time1.is_(None), 
            ).first()
            
            # Obter todas as subscriptions
            subs = NotificationSubscription.query.all()
            
            # Enviar notificações para jogo em 30 minutos
            if jogo_30min and subs:
                print(f"⏰ Enviando lembretes (30min): {jogo_30min.time1.nome} vs {jogo_30min.time2.nome}")
                for sub in subs:
                    enviar_push(
                        sub,
                        f"⏰ {jogo_30min.time1.nome} vs {jogo_30min.time2.nome}",
                        "Faltam 30 minutos! Não esqueça sua aposta!",
                        {"tag": "lembrete-30min", "requireInteraction": True}
                    )
            
            # Enviar notificações para jogo em 10 minutos
            if jogo_10min and subs:
                print(f"⚽ Enviando lembretes (10min): {jogo_10min.time1.nome} vs {jogo_10min.time2.nome}")
                for sub in subs:
                    enviar_push(
                        sub,
                        f"⚽ {jogo_10min.time1.nome} vs {jogo_10min.time2.nome}",
                        "COMEÇANDO EM 10 MINUTOS! Confira sua aposta!",
                        {"tag": "lembrete-10min", "requireInteraction": True}
                    )
    except Exception as e:
        print(f"❌ Erro ao verificar jogos próximos: {e}")


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


# ✅ FUNÇÃO PARA RECALCULAR PONTOS
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


# ================================================================ AUTENTICACAO
@app.post("/api/auth/register")
def register():
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    if not nome or not email or not senha:
        return resposta_sem_cache({"erro": "Informe nome, email e senha."}), 400
    if len(senha) < 4:
        return resposta_sem_cache(
            {"erro": "A senha precisa de pelo menos 4 caracteres."}
        ), 400
    if User.query.filter_by(email=email).first():
        return resposta_sem_cache({"erro": "Esse email ja esta cadastrado."}), 400

    user = User(nome=nome, email=email)
    user.set_senha(senha)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return resposta_sem_cache(
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
        return resposta_sem_cache({"erro": "Email ou senha invalidos."}), 401

    token = create_access_token(identity=str(user.id))
    return resposta_sem_cache(
        {
            "token": token,
            "user": {"id": user.id, "nome": user.nome, "email": user.email},
        }
    )


# ================================================================ JOGOS - ENDPOINT 1: DADOS (RÁPIDO)
@app.get("/api/jogos")
@jwt_required(optional=True)
def listar_jogos():
    """
    ✅ ENDPOINT 1: Apenas retorna dados do banco (SEM sincronizar)
    Tempo: < 500ms
    Cache: ❌ SEM cache (dados sempre frescos)
    """
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

    # ✅ Retornar SEM cache
    return resposta_sem_cache(saida)


# ================================================================ JOGOS - ENDPOINT 2: SINCRONIZAR (BACKGROUND)
@app.post("/api/sincronizar")
@jwt_required(optional=True)
def sincronizar():
    """
    ✅ ENDPOINT 2: Sincroniza com API football-data.org (BACKGROUND)
    Tempo: 5-10s (mas não bloqueia frontend)
    Cache: ✅ COM cache 5 minutos (não sobrecarrega API externa)
    """
    global ultimo_sync
    global ultimo_sync_timestamp
    from sync_resultados import sincronizar_resultados

    agora = datetime.now()

    # ✅ Sincroniza APENAS se passou 5 minutos
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
        ultimo_sync_timestamp = agora.isoformat()
        print(f"[{agora.strftime('%H:%M:%S')}] ✅ Sincronização concluída!", flush=True)

        return jsonify(
            {
                "ok": True,
                "msg": "Sincronização concluída",
                "ultimaSincronizacao": ultimo_sync_timestamp,
            }
        ), 200
    else:
        tempo_restante = INTERVALO_SYNC * 60 - (agora - ultimo_sync).total_seconds()
        print(
            f"[{agora.strftime('%H:%M:%S')}] ⏳ Cache ativo (próximo sync em {int(tempo_restante)}s)",
            flush=True,
        )

        return jsonify(
            {
                "ok": False,
                "msg": f"Cache ativo, próximo sync em {int(tempo_restante)}s",
                "proximaSincronizacao": int(tempo_restante),
            }
        ), 200


# ================================================================ APOSTAS DO JOGO
@app.get("/api/apostas-do-jogo/<int:jogo_id>")
@jwt_required(optional=True)
def apostas_do_jogo(jogo_id):
    """
    Resultado do bolao por jogo: todas as apostas + pontos de cada um.
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """
    jogo = Jogo.query.get_or_404(jogo_id)

    # ✅ ORDENA POR COLUNA PONTOS (não calcula dinamicamente)
    apostas = Aposta.query.filter_by(jogo_id=jogo_id).all()
    apostas_sorted = sorted(apostas, key=lambda a: a.pontos or 0, reverse=True)

    saida = {
        "jogo": jogo.to_dict(),
        "liberado": not jogo.comecou,
        "apostas": [a.to_dict(com_user=True) for a in apostas_sorted],
    }

    return resposta_sem_cache(saida)


# ================================================================ APOSTAS
@app.post("/api/apostas")
@jwt_required()
def salvar_aposta():
    """
    Cria/atualiza a aposta do usuario logado em um jogo (upsert).
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}

    jogo = Jogo.query.get(dados.get("jogo_id"))
    if jogo is None:
        return resposta_sem_cache({"erro": "Jogo nao encontrado."}), 404
    if jogo.comecou:
        return resposta_sem_cache(
            {"erro": "Apostas encerradas: o jogo ja comecou."}
        ), 422

    try:
        g1 = int(dados.get("gols_time1"))
        g2 = int(dados.get("gols_time2"))
        if g1 < 0 or g2 < 0 or g1 > 99 or g2 > 99:
            raise ValueError
    except (TypeError, ValueError):
        return resposta_sem_cache({"erro": "Informe um placar valido (0 a 99)."}), 400

    aposta = Aposta.query.filter_by(jogo_id=jogo.id, user_id=user_id).first()
    if aposta is None:
        aposta = Aposta(jogo_id=jogo.id, user_id=user_id)
        db.session.add(aposta)

    aposta.gols_time1 = g1
    aposta.gols_time2 = g2

    # ✅ CALCULA E ARMAZENA PONTOS NA COLUNA
    aposta.pontos = calcular_pontos(aposta, jogo)

    db.session.commit()
    return resposta_sem_cache(aposta.to_dict()), 200


# ================================================================ RANKING
@app.get("/api/ranking")
@jwt_required()
def ranking():
    """
    Mais acertos: pontos totais, placares exatos e apostas pontuadas.
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """

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
                "email": aposta.user.email,
                "nome": aposta.user.nome,
                "pontos": 0,
                "exatos": 0,
                "acertos": 0,
                "apostas": 0,
                "apostas_pontuadas": 0,
                "apostas_em_jogos_concluidos": 0,
                "apostas_pontuadas_em_jogos_concluidos": 0,
            },
        )
        item["apostas"] += 1

        # ✅ Se jogo foi concluído, contar também
        if aposta.jogo_id in jogos_concluidos_ids:
            item["apostas_em_jogos_concluidos"] += 1

        if aposta.pontos is not None and aposta.pontos > 0:
            item["pontos"] += aposta.pontos
            item["acertos"] += 1
            item["apostas_pontuadas"] += 1

            # ✅ Se pontuou em jogo concluído, contar também
            if aposta.jogo_id in jogos_concluidos_ids:
                item["apostas_pontuadas_em_jogos_concluidos"] += 1

        # ✅ Só contar exatos em jogos concluídos
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

    return resposta_sem_cache(saida)


# ================================================================ RESULTADO
@app.post("/api/jogos/<int:jogo_id>/resultado")
@jwt_required()
def lancar_resultado(jogo_id):
    """
    Endpoint simples para lancar o placar final de um jogo.
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """
    jogo = Jogo.query.get_or_404(jogo_id)
    dados = request.get_json(silent=True) or {}
    try:
        jogo.gols_time1 = int(dados.get("gols_time1"))
        jogo.gols_time2 = int(dados.get("gols_time2"))
    except (TypeError, ValueError):
        return resposta_sem_cache({"erro": "Placar invalido."}), 400
    db.session.commit()
    return resposta_sem_cache(jogo.to_dict())


@app.post("/api/auth/solicitar-reset")
def solicitar_reset():
    """
    Gera um token de reset e 'envia' por email (simula aqui).
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()

    user = User.query.filter_by(email=email).first()
    if not user:
        # Nao revela se email existe ou nao (seguranca)
        return resposta_sem_cache(
            {"ok": True, "msg": "Se o email existe, recebera um link de reset."}
        ), 200

    # Token válido por 1 hora
    reset_token = create_access_token(
        identity=str(user.id), expires_delta=timedelta(hours=1)
    )
    # Em producao: enviar email com link
    # https://seu-app.com/resetar-senha?token=TOKEN
    print(f"[DEBUG] Reset token para {email}: {reset_token}")

    return resposta_sem_cache(
        {"ok": True, "msg": "Link de reset enviado (verifique o terminal para teste)."}
    ), 200


@app.post("/api/auth/resetar-senha")
@jwt_required()
def resetar_senha():
    """
    Reseta a senha do usuario logado (com token de reset valido).
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}
    nova_senha = dados.get("nova_senha") or ""

    if len(nova_senha) < 4:
        return resposta_sem_cache(
            {"erro": "A senha precisa de pelo menos 4 caracteres."}
        ), 400

    user = User.query.get(user_id)
    user.set_senha(nova_senha)
    db.session.commit()
    return resposta_sem_cache({"ok": True, "msg": "Senha alterada com sucesso!"}), 200


@app.post("/api/admin/sync-resultados")
@jwt_required()
def sync_resultados():
    """
    Sincroniza resultados com a API football-data.org
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """
    from sync_resultados import sincronizar_resultados

    sucesso = sincronizar_resultados(app=app, verbose=True, status_filter=None)

    if sucesso:
        return resposta_sem_cache(
            {"ok": True, "msg": "Resultados sincronizados com sucesso!"}
        ), 200
    else:
        return resposta_sem_cache({"ok": False, "erro": "Falha ao sincronizar"}), 500


@app.post("/api/auth/atualizar-perfil")
@jwt_required()
def atualizar_perfil():
    """
    Atualiza o perfil do usuario logado (nome).
    Cache: ❌ SEM cache (dados do banco sempre frescos)
    """
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()

    if not nome:
        return resposta_sem_cache({"erro": "Nome não pode estar vazio."}), 400

    user = User.query.get(user_id)
    user.nome = nome
    db.session.commit()

    return resposta_sem_cache(
        {"ok": True, "user": {"id": user.id, "nome": user.nome, "email": user.email}}
    ), 200


@app.get("/health")
def health():
    """Endpoint para manter service acordado"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}, 200


# ================================================================ NOTIFICAÇÕES - ENDPOINTS
@app.get("/api/notifications/status")
@jwt_required()
def notificacoes_status():
    """Verificar se usuário tem subscription de notificações no banco"""
    user_id = int(get_jwt_identity())
    tem_subscription = (
        NotificationSubscription.query.filter_by(user_id=user_id).first() is not None
    )

    return resposta_sem_cache({"ativadas": tem_subscription, "user_id": user_id}), 200


@app.post("/api/notifications/subscribe")
@jwt_required()
def subscribe_notifications():
    """
    ✅ Cliente envia sua subscription do Service Worker
    O servidor armazena para enviar push depois
    Aceita ambos os formatos:
    1. {endpoint, auth, p256dh}
    2. {endpoint, keys: {auth, p256dh}}
    """
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}

    endpoint = dados.get("endpoint")

    # ✅ NOVO: Aceita ambos os formatos
    auth = dados.get("auth") or dados.get("keys", {}).get("auth")
    p256dh = dados.get("p256dh") or dados.get("keys", {}).get("p256dh")

    if not endpoint or not auth or not p256dh:
        return resposta_sem_cache({"erro": "Dados de subscription incompletos."}), 400

    # Verifica se já existe
    sub = NotificationSubscription.query.filter_by(endpoint=endpoint).first()
    if sub:
        sub.user_id = user_id
        sub.auth = auth
        sub.p256dh = p256dh
    else:
        sub = NotificationSubscription(
            user_id=user_id, endpoint=endpoint, auth=auth, p256dh=p256dh
        )
        db.session.add(sub)

    db.session.commit()

    return resposta_sem_cache(
        {"ok": True, "msg": "Subscription registrada com sucesso!"}
    ), 201


@app.delete("/api/notifications/unsubscribe")
@jwt_required()
def unsubscribe_notifications():
    """
    ✅ Remove subscription quando usuário desativa notificações
    """
    user_id = int(get_jwt_identity())
    dados = request.get_json(silent=True) or {}
    endpoint = dados.get("endpoint")

    if not endpoint:
        return resposta_sem_cache({"erro": "Endpoint não fornecido."}), 400

    sub = NotificationSubscription.query.filter_by(
        user_id=user_id, endpoint=endpoint
    ).first()

    if sub:
        db.session.delete(sub)
        db.session.commit()

    return resposta_sem_cache({"ok": True, "msg": "Unsubscribed"}), 200


# ================================================================ ENDPOINTS DE TESTE
@app.post("/api/test-notification")
@jwt_required()
def test_notification():
    """Envia notificação de teste para todos"""
    subs = NotificationSubscription.query.all()

    if not subs:
        return resposta_sem_cache({"ok": False, "msg": "Nenhuma subscription"}), 400

    enviadas = 0
    for sub in subs:
        result = enviar_push(
            sub,
            "🧪 Notificação de Teste!",
            "Push notifications funcionando!",
            {"tag": "test-notification"},
        )
        if result:
            enviadas += 1

    return resposta_sem_cache(
        {"ok": True, "enviadas": enviadas, "total": len(subs)}
    ), 200


@app.post("/api/test-notification-all")
@jwt_required()
def test_notification_all():
    """
    ✅ Envia notificação de teste para TODOS os usuários inscritos
    ⚠️ APENAS PARA TESTE/DEBUG
    """
    user_id = int(get_jwt_identity())

    subs = NotificationSubscription.query.all()

    if not subs:
        return resposta_sem_cache(
            {"ok": False, "msg": "Nenhuma subscription no banco"}
        ), 400

    enviadas = 0
    for sub in subs:
        result = enviar_push(
            sub,
            "🧪 Notificação de Teste para Todos!",
            "Esta é uma notificação de teste enviada para todos os usuários.",
            {"tag": "test-notification-all"},
        )
        if result:
            enviadas += 1

    return resposta_sem_cache(
        {
            "ok": True,
            "msg": "Notificação de teste enviada para todos",
            "enviadas": enviadas,
            "total": len(subs),
        }
    ), 200


# ================================================================ INICIAR SCHEDULER NA PRIMEIRA REQUISIÇÃO
def init_scheduler():
    """
    ✅ Inicia o scheduler quando a primeira requisição chega
    Não bloqueia o app, roda em background thread
    """
    try:
        if not scheduler.running:
            # Verifica jogos próximos a cada 5 minutos
            scheduler.add_job(
                verificar_jogos_proximos,
                "interval",
                minutes=5,
                id="verificar_jogos",
                replace_existing=True,
            )
            scheduler.start()
            print("✅ [APScheduler] Iniciado! Verificando jogos a cada 5 min")
    except Exception as e:
        print(f"❌ Erro ao iniciar scheduler: {e}")


# ================================================================ TESTE DO SCHEDULER
@app.post("/api/scheduler/test-simulate")
@jwt_required()
def scheduler_test_simulate():
    """
    🧪 Simula um jogo começando em 30min para testar o scheduler
    - Cria jogo fake
    - Executa verificar_jogos_proximos()
    - Deleta jogo fake
    - Retorna resultado
    """
    try:
        print("\n" + "="*60)
        print("🧪 INICIANDO TESTE DO SCHEDULER")
        print("="*60)
        
        from models import Time
        
        # Criar tempos fake se não existirem
        time1 = Time.query.first()
        time2 = Time.query.filter(Time.id != time1.id).first()
        
        if not time1 or not time2:
            return resposta_sem_cache({
                "ok": False,
                "msg": "Erro: precisa ter pelo menos 2 times no banco"
            }), 400
        
        # Criar jogo que começa em 30 minutos
        agora = datetime.now()
        data_jogo_30min = agora + timedelta(minutes=28)
        
        jogo_fake = Jogo(
            time1_id=time1.id,
            time2_id=time2.id,
            data_hora=data_jogo_30min,
            estadio="🧪 SIMULADO",
            status_api="TIMED" 
        )
        db.session.add(jogo_fake)
        db.session.commit()
        
        print(f"✅ Jogo simulado criado: ID {jogo_fake.id}")
        print(f"   Time 1: {time1.nome}")
        print(f"   Time 2: {time2.nome}")
        print(f"   Começa em: {jogo_fake.data_hora.strftime('%H:%M:%S')}")
        print(f"   Diferença: 28 minutos (vai disparar notificação de 30min)")
        
        # Executar a função do scheduler manualmente
        print("\n🔔 Executando verificar_jogos_proximos()...")
        verificar_jogos_proximos()
        
        # Deletar jogo fake
        db.session.delete(jogo_fake)
        db.session.commit()
        
        print(f"✅ Jogo simulado deletado")
        print("="*60)
        
        return resposta_sem_cache({
            "ok": True,
            "msg": "✅ Teste do scheduler executado com sucesso!",
            "detalhes": {
                "jogo_criado": f"{time1.nome} vs {time2.nome}",
                "horario": data_jogo_30min.strftime('%H:%M:%S'),
                "scheduler_status": "running" if scheduler.running else "stopped"
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        import traceback
        traceback.print_exc()
        return resposta_sem_cache({
            "ok": False,
            "msg": f"Erro ao simular: {str(e)}"
        }), 500


@app.get("/api/scheduler/status")
def scheduler_status():
    """
    🔍 Verificar status do APScheduler
    """
    jobs = scheduler.get_jobs()
    
    return resposta_sem_cache({
        "ok": True,
        "scheduler_running": scheduler.running,
        "total_jobs": len(jobs),
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "trigger": str(job.trigger),
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            }
            for job in jobs
        ]
    }), 200
@app.before_request
def antes_requisicao():
    """Inicializa scheduler na primeira requisição"""
    init_scheduler()


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        init_scheduler()
    app.run(debug=False, threaded=True)
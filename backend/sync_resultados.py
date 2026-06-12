# -*- coding: utf-8 -*-
"""
Sincroniza resultados com a API football-data.org
"""

import os
from datetime import datetime

import requests

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
TOURNAMENT_CODE = "WC"


def traduzir_time(nome_ingles):
    """Traduz nomes de times do inglês para português"""
    traducoes = {
        "Mexico": "México",
        "South Africa": "África do Sul",
        "South Korea": "Coreia do Sul",
        "Czechia": "República Tcheca",
        "Canada": "Canadá",
        "Bosnia-Herzegovina": "Bósnia e Herzegovina",
        "Qatar": "Catar",
        "Switzerland": "Suíça",
        "Brazil": "Brasil",
        "Morocco": "Marrocos",
        "Haiti": "Haiti",
        "Scotland": "Escócia",
        "United States": "Estados Unidos",
        "Paraguay": "Paraguai",
        "Australia": "Austrália",
        "Turkey": "Turquia",
        "Germany": "Alemanha",
        "Curaçao": "Curaçau",
        "Ivory Coast": "Costa do Marfim",
        "Ecuador": "Equador",
        "Netherlands": "Holanda",
        "Japan": "Japão",
        "Sweden": "Suécia",
        "Tunisia": "Tunísia",
        "Belgium": "Bélgica",
        "Egypt": "Egito",
        "Iran": "Irã",
        "New Zealand": "Nova Zelândia",
        "Spain": "Espanha",
        "Cape Verde Islands": "Cabo Verde",
        "Saudi Arabia": "Arábia Saudita",
        "Uruguay": "Uruguai",
        "France": "França",
        "Senegal": "Senegal",
        "Iraq": "Iraque",
        "Norway": "Noruega",
        "Argentina": "Argentina",
        "Algeria": "Argélia",
        "Austria": "Áustria",
        "Jordan": "Jordânia",
        "Portugal": "Portugal",
        "Congo DR": "RD Congo",
        "Uzbekistan": "Uzbequistão",
        "Colombia": "Colômbia",
        "England": "Inglaterra",
        "Croatia": "Croácia",
        "Ghana": "Gana",
        "Panama": "Panamá",
    }
    return traducoes.get(nome_ingles, nome_ingles)


def sincronizar_resultados(app=None, verbose=True, status_filter=None):
    """Sincroniza resultados com a API football-data.org"""
    if app is None:
        from app import app as flask_app

        app = flask_app

    with app.app_context():
        from models import Jogo, Time, db

        if verbose:
            print("🔄 Sincronizando resultados...", flush=True)

        try:
            headers = {"X-Auth-Token": API_KEY}
            url = f"{BASE_URL}/competitions/{TOURNAMENT_CODE}/matches"
            if status_filter:
                url += f"?status={status_filter}"

            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                print(f"❌ Erro API: {response.status_code}", flush=True)
                return False

            dados = response.json()
            atualizados = 0
            nao_encontrados = []

            for match in dados.get("matches", []):
                # Traduzir nomes dos times de inglês para português
                time1_nome = traduzir_time(match["homeTeam"]["name"])
                time2_nome = traduzir_time(match["awayTeam"]["name"])

                # Buscar os times no banco
                time1_obj = Time.query.filter_by(nome=time1_nome).first()
                time2_obj = Time.query.filter_by(nome=time2_nome).first()

                if not time1_obj or not time2_obj:
                    nao_encontrados.append(f"{time1_nome} vs {time2_nome}")
                    continue

                # Buscar o jogo no banco pelos IDs dos times
                jogo = Jogo.query.filter_by(
                    time1_id=time1_obj.id,
                    time2_id=time2_obj.id,
                ).first()

                if not jogo:
                    nao_encontrados.append(f"{time1_nome} vs {time2_nome}")
                    continue

                # ✅ SEMPRE atualiza o status_api
                status_antigo = jogo.status_api
                jogo.status_api = match["status"]

                # ✅ Se tem resultado, atualiza os gols
                if match["status"] in [
                    "FINISHED",
                    "LIVE",
                    "IN_PLAY",
                    "PAUSED",
                    "SUSPENDED",
                ]:
                    score = match.get("score", {})

                    # Tenta fullTime, depois halfTime (para LIVE matches)
                    gols_time1 = score.get("fullTime", {}).get("home")
                    gols_time2 = score.get("fullTime", {}).get("away")

                    # Se não tem fullTime (jogo ao vivo), usa o score atual
                    if gols_time1 is None or gols_time2 is None:
                        gols_time1 = score.get("halfTime", {}).get("home") or gols_time1
                        gols_time2 = score.get("halfTime", {}).get("away") or gols_time2

                    if gols_time1 is not None and gols_time2 is not None:
                        if (
                            jogo.gols_time1 != gols_time1
                            or jogo.gols_time2 != gols_time2
                            or status_antigo
                            != jogo.status_api  # ✅ NOVO: detecta mudança de status
                        ):
                            jogo.gols_time1 = gols_time1
                            jogo.gols_time2 = gols_time2
                            atualizados += 1
                            if verbose:
                                print(
                                    f"✅ {time1_nome} {gols_time1}×{gols_time2} {time2_nome} [{status_antigo} → {match['status']}]",
                                    flush=True,
                                )

            db.session.commit()

            if verbose:
                print(f"🎉 {atualizados} jogos atualizados", flush=True)
                if nao_encontrados:
                    print(
                        f"⚠️  Não encontrados: {', '.join(nao_encontrados)}",
                        flush=True,
                    )
            else:
                if atualizados > 0:
                    print(
                        f"[{datetime.now().strftime('%H:%M:%S')}] ✅ {atualizados} jogo(s) atualizado(s)",
                        flush=True,
                    )

            return True

        except Exception as e:
            print(f"❌ Erro na sincronização: {e}", flush=True)
            import traceback

            traceback.print_exc()
            return False


if __name__ == "__main__":
    from app import app as flask_app

    sincronizar_resultados(
        app=flask_app,
        verbose=True,
    )

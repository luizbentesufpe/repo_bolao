# -*- coding: utf-8 -*-
"""
Sincroniza resultados com a API football-data.org
Backup: ESPN API (não oficial, gratuita)
"""

import os
from datetime import datetime

import requests

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
TOURNAMENT_CODE = "WC"
ESPN_URL = "http://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"


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


# Mapeamento ESPN → português (ESPN usa nomes ligeiramente diferentes)
ESPN_TRADUCOES = {
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
    "Türkiye": "Turquia",   # ESPN usa Türkiye
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


def buscar_placar_espn(verbose=False):
    """
    Busca placares da ESPN como backup.
    Retorna dict: { (home_pt, away_pt): (gols_home, gols_away) }
    """
    try:
        response = requests.get(ESPN_URL, timeout=8)
        if response.status_code != 200:
            if verbose:
                print(f"⚠️  ESPN API erro: {response.status_code}", flush=True)
            return {}

        dados = response.json()
        placares = {}

        for event in dados.get("events", []):
            competition = event.get("competitions", [{}])[0]
            state = competition.get("status", {}).get("type", {}).get("state", "")

            if state not in ["in", "post"]:
                continue

            competitors = competition.get("competitors", [])
            home = next((c for c in competitors if c.get("homeAway") == "home"), None)
            away = next((c for c in competitors if c.get("homeAway") == "away"), None)

            if not home or not away:
                continue

            home_en = home.get("team", {}).get("displayName", "")
            away_en = away.get("team", {}).get("displayName", "")
            home_pt = ESPN_TRADUCOES.get(home_en, home_en)
            away_pt = ESPN_TRADUCOES.get(away_en, away_en)

            try:
                gols_home = int(home.get("score", 0))
                gols_away = int(away.get("score", 0))
            except (ValueError, TypeError):
                continue

            placares[(home_pt, away_pt)] = (gols_home, gols_away)

            if verbose:
                print(f"📡 ESPN: {home_pt} {gols_home}×{gols_away} {away_pt} [{state}]", flush=True)

        return placares

    except Exception as e:
        if verbose:
            print(f"⚠️  ESPN fallback falhou: {e}", flush=True)
        return {}


def sincronizar_resultados(app=None, verbose=True, status_filter="IN_PLAY"):
    """Sincroniza resultados com a API football-data.org + fallback ESPN"""
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

            # ✅ Busca placares ESPN uma vez antes do loop
            placares_espn = buscar_placar_espn(verbose=verbose)

            for match in dados.get("matches", []):
                time1_nome = traduzir_time(match["homeTeam"]["name"])
                time2_nome = traduzir_time(match["awayTeam"]["name"])

                time1_obj = Time.query.filter_by(nome=time1_nome).first()
                time2_obj = Time.query.filter_by(nome=time2_nome).first()

                if not time1_obj or not time2_obj:
                    nao_encontrados.append(f"{time1_nome} vs {time2_nome}")
                    continue

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

                if match["status"] in ["FINISHED", "LIVE", "IN_PLAY", "PAUSED", "SUSPENDED"]:
                    score = match.get("score", {})

                    gols_time1 = score.get("fullTime", {}).get("home")
                    gols_time2 = score.get("fullTime", {}).get("away")

                    if gols_time1 is None or gols_time2 is None:
                        gols_time1 = score.get("halfTime", {}).get("home") or gols_time1
                        gols_time2 = score.get("halfTime", {}).get("away") or gols_time2

                    # ✅ FALLBACK ESPN: se ainda null, tenta placar da ESPN
                    if gols_time1 is None or gols_time2 is None:
                        espn = placares_espn.get((time1_nome, time2_nome))
                        if espn:
                            gols_time1, gols_time2 = espn
                            if verbose:
                                print(f"📡 ESPN fallback usado: {time1_nome} {gols_time1}×{gols_time2} {time2_nome}", flush=True)

                    if gols_time1 is not None and gols_time2 is not None:
                        # ✅ FIX: só atualiza se o novo placar for >= ao salvo (nunca regride)
                        gols_time1_atual = jogo.gols_time1 or 0
                        gols_time2_atual = jogo.gols_time2 or 0

                        if (
                            jogo.gols_time1 is None
                            or gols_time1 >= gols_time1_atual
                            or gols_time2 >= gols_time2_atual
                        ):
                            if (
                                jogo.gols_time1 != gols_time1
                                or jogo.gols_time2 != gols_time2
                                or status_antigo != jogo.status_api
                            ):
                                jogo.gols_time1 = gols_time1
                                jogo.gols_time2 = gols_time2
                                atualizados += 1
                                if verbose:
                                    print(
                                        f"✅ {time1_nome} {gols_time1}×{gols_time2} {time2_nome} [{status_antigo} → {match['status']}]",
                                        flush=True,
                                    )
                    else:
                        # ✅ FIX: API retornou null mas já temos placar salvo — mantém
                        if status_antigo != jogo.status_api:
                            atualizados += 1
                            if verbose:
                                print(
                                    f"🔄 {time1_nome} vs {time2_nome} [{status_antigo} → {match['status']}] (placar mantido)",
                                    flush=True,
                                )

            db.session.commit()

            if verbose:
                print(f"🎉 {atualizados} jogos atualizados", flush=True)
                if nao_encontrados:
                    print(f"⚠️  Não encontrados: {', '.join(nao_encontrados)}", flush=True)
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

    sincronizar_resultados(app=flask_app, verbose=True, status_filter=None)
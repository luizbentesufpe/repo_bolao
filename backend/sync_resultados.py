# -*- coding: utf-8 -*-
"""
Sincroniza resultados da Copa 2026 da API football-data.org
Uso: python sync_resultados.py
"""

import os
from datetime import datetime

import requests
from app import app
from models import Jogo, Time, db

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
TOURNAMENT_CODE = "WC"

# Mapa: nome em inglês (da API) -> nome em português (seu banco)
TIMES_TRANSLATE = {
    "Mexico": "México",
    "South Africa": "África do Sul",
    "South Korea": "Coreia do Sul",
    "Czech Republic": "República Tcheca",
    "Canada": "Canadá",
    "Bosnia and Herzegovina": "Bósnia e Herzegovina",
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
    "Curaçao": "Curaçao",
    "Curacao": "Curaçao",
    "Ivory Coast": "Costa do Marfim",
    "Ecuador": "Equador",
    "Netherlands": "Holanda",
    "Japan": "Japão",
    "Sweden": "Suécia",
    "Tunisia": "Tunísia",
    "Belgium": "Bélgica",
    "Egypt": "Egito",
    "Saudi Arabia": "Arábia Saudita",
    "Uruguay": "Uruguai",
    "Iran": "Irã",
    "New Zealand": "Nova Zelândia",
    "Spain": "Espanha",
    "Cape Verde": "Cabo Verde",
    "France": "França",
    "Senegal": "Senegal",
    "Iraq": "Iraque",
    "Norway": "Noruega",
    "Argentina": "Argentina",
    "Algeria": "Argélia",
    "Austria": "Áustria",
    "Jordan": "Jordânia",
    "Portugal": "Portugal",
    "DR Congo": "RD Congo",
    "Democratic Republic of the Congo": "RD Congo",
    "Uzbekistan": "Uzbequistão",
    "Colombia": "Colômbia",
    "England": "Inglaterra",
    "Croatia": "Croácia",
    "Ghana": "Gana",
    "Panama": "Panamá",
}


def traduzir_time(nome_ingles):
    """Converte nome do time de inglês para português."""
    return TIMES_TRANSLATE.get(nome_ingles, nome_ingles)


def sincronizar_resultados(verbose=False):
    """Busca resultados da Copa 2026 e atualiza no banco."""

    if verbose:
        print("🔄 Sincronizando resultados...")

    try:
        headers = {"X-Auth-Token": API_KEY}
        url = f"{BASE_URL}/competitions/{TOURNAMENT_CODE}/matches"
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code != 200:
            print(f"❌ Erro API: {response.status_code}")
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

            # Se o jogo tem resultado
            if match["status"] in ["FINISHED", "LIVE"]:
                score = match.get("score", {})
                gols_time1 = score.get("fullTime", {}).get("home")
                gols_time2 = score.get("fullTime", {}).get("away")

                if gols_time1 is not None and gols_time2 is not None:
                    if jogo.gols_time1 != gols_time1 or jogo.gols_time2 != gols_time2:
                        jogo.gols_time1 = gols_time1
                        jogo.gols_time2 = gols_time2
                        atualizados += 1
                        if verbose:
                            print(
                                f"✅ {time1_nome} {gols_time1}×{gols_time2} {time2_nome}"
                            )

        db.session.commit()

        if verbose:
            print(f"🎉 {atualizados} jogos atualizados")
            if nao_encontrados:
                print(f"⚠️  Não encontrados: {', '.join(nao_encontrados)}")
        else:
            if atualizados > 0:
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] ✅ {atualizados} jogo(s) atualizado(s)"
                )

        return True

    except Exception as e:
        print(f"❌ Erro na sincronização: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    with app.app_context():
        sincronizar_resultados(verbose=True)

# -*- coding: utf-8 -*-
"""
Seed script para popular todos os jogos de mata-mata (knockout stage)
da Copa do Mundo 2026 no banco de dados
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


def seed_knockout_matches(app=None, verbose=True):
    """Popula todos os jogos de mata-mata no banco de dados"""
    if app is None:
        from app import app as flask_app
        app = flask_app

    with app.app_context():
        from models import Campeonato, Jogo, Time, db

        if verbose:
            print("🔄 Buscando jogos de mata-mata da API...", flush=True)

        try:
            headers = {"X-Auth-Token": API_KEY}
            url = f"{BASE_URL}/competitions/{TOURNAMENT_CODE}/matches"

            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                print(f"❌ Erro API: {response.status_code}", flush=True)
                return False

            dados = response.json()

            # Estágios de mata-mata
            knockout_stages = [
                "LAST_32",
                "LAST_16",
                "QUARTER_FINALS",
                "SEMI_FINALS",
                "THIRD_PLACE",
                "FINAL",
            ]

            # Encontrar campeonato Copa do Mundo
            campeonato = Campeonato.query.filter_by(
                nome="Copa do Mundo FIFA 2026"
            ).first()
            if not campeonato:
                print("❌ Campeonato 'Copa do Mundo' não encontrado!", flush=True)
                return False

            criados = 0
            atualizados = 0
            erros = 0
            nao_encontrados = []

            for match in dados.get("matches", []):
                # Filtrar apenas jogos de mata-mata
                if match.get("stage") not in knockout_stages:
                    continue

                # Pular se times não estão definidos ainda
                if not match["homeTeam"]["name"] or not match["awayTeam"]["name"]:
                    if verbose:
                        print(
                            f"⏭️  Pulando: Times ainda não definidos (Stage: {match.get('stage')})",
                            flush=True,
                        )
                    continue

                # Traduzir nomes dos times
                time1_nome = traduzir_time(match["homeTeam"]["name"])
                time2_nome = traduzir_time(match["awayTeam"]["name"])

                # Buscar os times no banco
                time1_obj = Time.query.filter_by(nome=time1_nome).first()
                time2_obj = Time.query.filter_by(nome=time2_nome).first()

                if not time1_obj or not time2_obj:
                    nao_encontrados.append(
                        f"{time1_nome} vs {time2_nome} ({match.get('stage')})"
                    )
                    if verbose:
                        print(
                            f"⚠️  Times não encontrados: {time1_nome} vs {time2_nome}",
                            flush=True,
                        )
                    continue

                # Verificar se jogo já existe
                jogo_existente = Jogo.query.filter_by(
                    time1_id=time1_obj.id,
                    time2_id=time2_obj.id,
                    campeonato_id=campeonato.id,
                ).first()

                try:
                    # Data do jogo
                    data_hora = datetime.fromisoformat(
                        match["utcDate"].replace("Z", "+00:00")
                    )

                    if jogo_existente:
                        # Atualizar jogo existente
                        jogo_existente.status_api = match.get("status", "TIMED")
                        jogo_existente.data_hora = data_hora

                        # Atualizar gols se disponível
                        if match.get("score"):
                            score = match["score"]
                            if score.get("fullTime"):
                                jogo_existente.gols_time1 = score["fullTime"].get(
                                    "home"
                                )
                                jogo_existente.gols_time2 = score["fullTime"].get(
                                    "away"
                                )

                        atualizados += 1
                        if verbose:
                            print(
                                f"✏️  ATUALIZADO: {time1_nome} vs {time2_nome} ({match.get('stage')})",
                                flush=True,
                            )
                    else:
                        # Criar novo jogo
                        novo_jogo = Jogo(
                            campeonato_id=campeonato.id,
                            time1_id=time1_obj.id,
                            time2_id=time2_obj.id,
                            data_hora=data_hora,
                            status_api=match.get("status", "TIMED"),
                            estadio=match.get("venue", ""),
                            cidade_estado="",
                        )

                        # Adicionar gols se disponível
                        if match.get("score"):
                            score = match["score"]
                            if score.get("fullTime"):
                                novo_jogo.gols_time1 = score["fullTime"].get("home")
                                novo_jogo.gols_time2 = score["fullTime"].get("away")

                        db.session.add(novo_jogo)
                        criados += 1

                        if verbose:
                            stage_map = {
                                "LAST_32": "32 avos (16 avos)",
                                "LAST_16": "Oitavas",
                                "QUARTER_FINALS": "Quartas",
                                "SEMI_FINALS": "Semifinais",
                                "THIRD_PLACE": "3º lugar",
                                "FINAL": "Final",
                            }
                            stage_nome = stage_map.get(
                                match.get("stage"), match.get("stage")
                            )
                            print(
                                f"✅ CRIADO: {time1_nome} vs {time2_nome} [{stage_nome}]",
                                flush=True,
                            )

                except Exception as e:
                    erros += 1
                    print(
                        f"❌ Erro ao processar {time1_nome} vs {time2_nome}: {e}",
                        flush=True,
                    )
                    continue

            db.session.commit()

            print("\n" + "=" * 70, flush=True)
            print("🎉 RESUMO:", flush=True)
            print(f"   ✅ Criados: {criados}", flush=True)
            print(f"   ✏️  Atualizados: {atualizados}", flush=True)
            print(f"   ❌ Erros: {erros}", flush=True)

            if nao_encontrados:
                print(
                    f"\n⚠️  Times não encontrados ({len(nao_encontrados)}):", flush=True
                )
                for nao_encontrado in nao_encontrados[
                    :5
                ]:  # Mostrar apenas os 5 primeiros
                    print(f"   - {nao_encontrado}", flush=True)
                if len(nao_encontrados) > 5:
                    print(f"   ... e mais {len(nao_encontrados) - 5}", flush=True)

            print("=" * 70, flush=True)

            return True

        except Exception as e:
            print(f"❌ Erro na sincronização: {e}", flush=True)
            import traceback

            traceback.print_exc()
            return False


if __name__ == "__main__":
    from app import app as flask_app

    seed_knockout_matches(app=flask_app, verbose=True)

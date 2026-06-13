# -*- coding: utf-8 -*-
"""
Cria o banco e popula a Copa do Mundo 2026 (fase de grupos, 72 jogos).
Horarios convertidos de Brasilia (UTC-3) para UTC ao gravar.

Uso:  python seed.py
"""

from datetime import datetime, timedelta

from app import app
from models import Campeonato, Jogo, Time, db

ESTADIOS = {
    "MEX": ("Estádio Azteca", "Cidade do México, México"),
    "GDL": ("Estádio Akron", "Guadalajara, México"),
    "MTY": ("Estádio BBVA", "Monterrey, México"),
    "TOR": ("BMO Field", "Toronto, Canadá"),
    "VAN": ("BC Place", "Vancouver, Canadá"),
    "LA": ("SoFi Stadium", "Los Angeles, EUA"),
    "SF": ("Levi's Stadium", "San Francisco/Santa Clara, EUA"),
    "SEA": ("Lumen Field", "Seattle, EUA"),
    "HOU": ("NRG Stadium", "Houston, EUA"),
    "DAL": ("AT&T Stadium", "Dallas/Arlington, EUA"),
    "KC": ("Arrowhead Stadium", "Kansas City, EUA"),
    "ATL": ("Mercedes-Benz Stadium", "Atlanta, EUA"),
    "MIA": ("Hard Rock Stadium", "Miami, EUA"),
    "BOS": ("Gillette Stadium", "Boston/Foxborough, EUA"),
    "PHI": ("Lincoln Financial Field", "Filadélfia, EUA"),
    "NY": ("MetLife Stadium", "Nova York/Nova Jersey, EUA"),
}

# (data_hora em Brasilia, time1, time2, estadio)
JOGOS = [
    # 1a rodada
    ("2026-06-11 16:00", "México", "África do Sul", "MEX"),
    ("2026-06-11 23:00", "Coreia do Sul", "República Tcheca", "GDL"),
    ("2026-06-12 16:00", "Canadá", "Bósnia e Herzegovina", "TOR"),
    ("2026-06-12 22:00", "Estados Unidos", "Paraguai", "LA"),
    ("2026-06-14 01:00", "Austrália", "Turquia", "VAN"),
    ("2026-06-13 16:00", "Catar", "Suíça", "SF"),
    ("2026-06-13 19:00", "Brasil", "Marrocos", "NY"),
    ("2026-06-13 22:00", "Haiti", "Escócia", "BOS"),
    ("2026-06-14 14:00", "Alemanha", "Curaçao", "HOU"),
    ("2026-06-14 17:00", "Holanda", "Japão", "DAL"),
    ("2026-06-14 20:00", "Costa do Marfim", "Equador", "PHI"),
    ("2026-06-14 23:00", "Suécia", "Tunísia", "MTY"),
    ("2026-06-15 13:00", "Espanha", "Cabo Verde", "ATL"),
    ("2026-06-15 16:00", "Bélgica", "Egito", "SEA"),
    ("2026-06-15 19:00", "Arábia Saudita", "Uruguai", "MIA"),
    ("2026-06-15 22:00", "Irã", "Nova Zelândia", "LA"),
    ("2026-06-16 14:00", "Argentina", "Argélia", "KC"),
    ("2026-06-16 16:00", "França", "Senegal", "NY"),
    ("2026-06-16 19:00", "Iraque", "Noruega", "BOS"),
    ("2026-06-17 01:00", "Áustria", "Jordânia", "SF"),
    ("2026-06-17 14:00", "Portugal", "RD Congo", "HOU"),
    ("2026-06-17 17:00", "Inglaterra", "Croácia", "DAL"),
    ("2026-06-17 20:00", "Gana", "Panamá", "TOR"),
    ("2026-06-17 23:00", "Uzbequistão", "Colômbia", "MEX"),
    # 2a rodada
    ("2026-06-18 13:00", "República Tcheca", "África do Sul", "ATL"),
    ("2026-06-18 16:00", "Suíça", "Bósnia e Herzegovina", "LA"),
    ("2026-06-18 19:00", "Canadá", "Catar", "VAN"),
    ("2026-06-18 22:00", "México", "Coreia do Sul", "GDL"),
    ("2026-06-19 01:00", "Turquia", "Paraguai", "SF"),
    ("2026-06-19 16:00", "Estados Unidos", "Austrália", "SEA"),
    ("2026-06-19 19:00", "Escócia", "Marrocos", "BOS"),
    ("2026-06-19 22:00", "Brasil", "Haiti", "PHI"),
    ("2026-06-20 14:00", "Holanda", "Suécia", "HOU"),
    ("2026-06-20 17:00", "Alemanha", "Costa do Marfim", "TOR"),
    ("2026-06-20 21:00", "Equador", "Curaçao", "KC"),
    ("2026-06-21 01:00", "Tunísia", "Japão", "MTY"),
    ("2026-06-21 13:00", "Espanha", "Arábia Saudita", "ATL"),
    ("2026-06-21 16:00", "Bélgica", "Irã", "LA"),
    ("2026-06-21 19:00", "Uruguai", "Cabo Verde", "MIA"),
    ("2026-06-21 22:00", "Nova Zelândia", "Egito", "VAN"),
    ("2026-06-22 14:00", "Argentina", "Áustria", "DAL"),
    ("2026-06-22 18:00", "França", "Iraque", "PHI"),
    ("2026-06-22 21:00", "Noruega", "Senegal", "NY"),
    ("2026-06-23 00:00", "Jordânia", "Argélia", "SF"),
    ("2026-06-23 14:00", "Portugal", "Uzbequistão", "HOU"),
    ("2026-06-23 17:00", "Inglaterra", "Gana", "BOS"),
    ("2026-06-23 20:00", "Panamá", "Croácia", "TOR"),
    ("2026-06-23 23:00", "Colômbia", "RD Congo", "GDL"),
    # 3a rodada
    ("2026-06-24 16:00", "Suíça", "Canadá", "VAN"),
    ("2026-06-24 16:00", "Bósnia e Herzegovina", "Catar", "SEA"),
    ("2026-06-24 19:00", "Escócia", "Brasil", "MIA"),
    ("2026-06-24 19:00", "Marrocos", "Haiti", "ATL"),
    ("2026-06-24 22:00", "República Tcheca", "México", "MEX"),
    ("2026-06-24 22:00", "África do Sul", "Coreia do Sul", "MTY"),
    ("2026-06-25 17:00", "Equador", "Alemanha", "NY"),
    ("2026-06-25 17:00", "Curaçao", "Costa do Marfim", "PHI"),
    ("2026-06-25 20:00", "Japão", "Suécia", "DAL"),
    ("2026-06-25 20:00", "Tunísia", "Holanda", "KC"),
    ("2026-06-25 23:00", "Turquia", "Estados Unidos", "LA"),
    ("2026-06-25 23:00", "Paraguai", "Austrália", "SF"),
    ("2026-06-26 16:00", "Noruega", "França", "BOS"),
    ("2026-06-26 16:00", "Senegal", "Iraque", "TOR"),
    ("2026-06-26 21:00", "Cabo Verde", "Arábia Saudita", "HOU"),
    ("2026-06-26 21:00", "Uruguai", "Espanha", "GDL"),
    ("2026-06-27 00:00", "Egito", "Irã", "SEA"),
    ("2026-06-27 00:00", "Nova Zelândia", "Bélgica", "VAN"),
    ("2026-06-27 18:00", "Panamá", "Inglaterra", "NY"),
    ("2026-06-27 18:00", "Croácia", "Gana", "PHI"),
    ("2026-06-27 20:30", "Colômbia", "Portugal", "MIA"),
    ("2026-06-27 20:30", "RD Congo", "Uzbequistão", "ATL"),
    ("2026-06-27 23:00", "Argélia", "Áustria", "KC"),
    ("2026-06-27 23:00", "Jordânia", "Argentina", "DAL"),
]


def seed():
    with app.app_context():
        db.create_all()

        campeonato = Campeonato.query.filter_by(nome="Copa do Mundo FIFA 2026").first()
        if campeonato is None:
            campeonato = Campeonato(
                nome="Copa do Mundo FIFA 2026", local="Estados Unidos, Canadá e México"
            )
            db.session.add(campeonato)
            db.session.flush()

        times = {}

        def get_time(nome):
            if nome not in times:
                t = Time.query.filter_by(nome=nome).first()
                if t is None:
                    t = Time(nome=nome)
                    db.session.add(t)
                    db.session.flush()
                times[nome] = t
            return times[nome]

        criados = 0
        for data_str, n1, n2, cod in JOGOS:
            estadio, cidade = ESTADIOS[cod]
            t1, t2 = get_time(n1), get_time(n2)
            # Brasilia (UTC-3) -> UTC
            data_utc = datetime.strptime(data_str, "%Y-%m-%d %H:%M") + timedelta(
                hours=3
            )
            existe = Jogo.query.filter_by(
                campeonato_id=campeonato.id,
                time1_id=t1.id,
                time2_id=t2.id,
                data_hora=data_utc,
            ).first()
            if existe is None:
                db.session.add(
                    Jogo(
                        campeonato_id=campeonato.id,
                        time1_id=t1.id,
                        time2_id=t2.id,
                        data_hora=data_utc,
                        estadio=estadio,
                        cidade_estado=cidade,
                    )
                )
                criados += 1

        db.session.commit()
        print(
            "Times: %d | Jogos criados: %d (total: %d)"
            % (Time.query.count(), criados, Jogo.query.count())
        )


if __name__ == "__main__":
    seed()

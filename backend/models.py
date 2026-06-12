# -*- coding: utf-8 -*-
"""
Models do bolao em Flask/SQLAlchemy, espelhando o estilo do Django original:
Time, Campeonato, Jogo, Aposta (+ User para o login basico).
"""

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()

# ✅ NOVA PONTUACAO DO BOLAO (máximo 5 pontos)
PONTOS_PLACAR_EXATO = 5  # acertou o placar exato
PONTOS_VENCEDOR_EMPATE = 2  # acertou vencedor/empate
PONTOS_GOLS_PARCIAL = 1  # acertou gols de uma equipe


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)

    apostas = db.relationship("Aposta", backref="user", lazy=True)

    def set_senha(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def checa_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    def __repr__(self):
        return self.nome


class Time(db.Model):
    __tablename__ = "times"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    cidade = db.Column(db.String(255), default="")
    simbolo = db.Column(
        db.String(255), default=""
    )  # caminho da imagem (ex.: simbolos/brasil.png)

    def __repr__(self):
        return self.nome

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "cidade": self.cidade,
            "simbolo": self.simbolo,
        }


class Campeonato(db.Model):
    __tablename__ = "campeonatos"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    local = db.Column(db.String(255), default="")
    imagem = db.Column(db.String(255), default="")

    jogos = db.relationship("Jogo", backref="campeonato", lazy=True)

    def __repr__(self):
        return self.nome

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "local": self.local,
            "imagem": self.imagem,
        }


class Jogo(db.Model):
    __tablename__ = "jogos"
    id = db.Column(db.Integer, primary_key=True)
    campeonato_id = db.Column(
        db.Integer, db.ForeignKey("campeonatos.id"), nullable=False
    )
    time1_id = db.Column(db.Integer, db.ForeignKey("times.id"), nullable=False)
    time2_id = db.Column(db.Integer, db.ForeignKey("times.id"), nullable=False)
    data_hora = db.Column(db.DateTime, nullable=False)
    gols_time1 = db.Column(db.SmallInteger, nullable=True)
    gols_time2 = db.Column(db.SmallInteger, nullable=True)
    status_api = db.Column(db.String(50), default="TIMED")
    estadio = db.Column(db.String(255), default="")
    cidade_estado = db.Column(db.String(255), default="")

    time1 = db.relationship("Time", foreign_keys=[time1_id])
    time2 = db.relationship("Time", foreign_keys=[time2_id])
    apostas = db.relationship("Aposta", backref="jogo", lazy=True)

    def __repr__(self):
        return "%s x %s" % (self.time1.nome, self.time2.nome)

    @property
    def em_breve(self):
        """Jogo não começou ainda"""
        return self.status_api in ["TIMED"]
    
    @property
    def ao_vivo(self):
        """Jogo está em andamento"""
        return self.status_api in ["LIVE", "IN_PLAY", "PAUSED", "SUSPENDED"]


    @property
    def encerrado(self):
        return self.gols_time1 is not None and self.gols_time2 is not None

    @property
    def comecou(self):
        return self.status_api in ["LIVE", "IN_PLAY", "PAUSED", "SUSPENDED", "FINISHED"]

    def to_dict(self):
        return {
            "id": self.id,
            "campeonato": self.campeonato.to_dict(),
            "time1": self.time1.to_dict(),
            "time2": self.time2.to_dict(),
            "data_hora": self.data_hora.isoformat() + "Z",
            "gols_time1": self.gols_time1,
            "gols_time2": self.gols_time2,
            "estadio": self.estadio,
            "cidade_estado": self.cidade_estado,
            "status_api": self.status_api,      # ✅ ADICIONAR ESTA LINHA
            "em_breve": self.em_breve,
            "ao_vivo": self.ao_vivo,
            "encerrado": self.encerrado,
            "comecou": self.comecou,
        }


class Aposta(db.Model):
    __tablename__ = "apostas"
    __table_args__ = (db.UniqueConstraint("jogo_id", "user_id", name="uq_jogo_user"),)

    id = db.Column(db.Integer, primary_key=True)
    jogo_id = db.Column(db.Integer, db.ForeignKey("jogos.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    gols_time1 = db.Column(db.SmallInteger, nullable=True)
    gols_time2 = db.Column(db.SmallInteger, nullable=True)
    pontos = db.Column(db.Integer, default=0)  # ✅ COLUNA ADICIONADA

    def calcular_pontos(self):
        """
        ✅ NOVA REGRA (máximo 5 pontos):
        - Placar exato: 5 pts
        - Vencedor/Empate: 2 pts
        - Gols de uma equipe: 1 pt
        - Errou: 0 pts
        """
        j = self.jogo
        if self.gols_time1 is None or self.gols_time2 is None or not j.encerrado:
            return 0

        # Placar exato
        if self.gols_time1 == j.gols_time1 and self.gols_time2 == j.gols_time2:
            return PONTOS_PLACAR_EXATO

        # Vencedor ou empate
        saldo_aposta = self.gols_time1 - self.gols_time2
        saldo_jogo = j.gols_time1 - j.gols_time2

        if (
            (saldo_aposta > 0 and saldo_jogo > 0)
            or (saldo_aposta < 0 and saldo_jogo < 0)
            or (saldo_aposta == 0 and saldo_jogo == 0)
        ):
            return PONTOS_VENCEDOR_EMPATE

        # Gols de uma equipe
        if self.gols_time1 == j.gols_time1 or self.gols_time2 == j.gols_time2:
            return PONTOS_GOLS_PARCIAL

        return 0

    @property
    def exato(self):
        j = self.jogo
        return (
            j.encerrado
            and self.gols_time1 == j.gols_time1
            and self.gols_time2 == j.gols_time2
        )

    def to_dict(self, com_user=False):
        # ✅ USA A COLUNA PONTOS (não calcula dinamicamente)
        d = {
            "id": self.id,
            "jogo_id": self.jogo_id,
            "gols_time1": self.gols_time1,
            "gols_time2": self.gols_time2,
            "pontos": self.pontos or 0,  # Retorna o valor armazenado
        }
        if com_user:
            d["email"] = self.user.email
            d["nome"] = self.user.nome
        return d

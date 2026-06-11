# -*- coding: utf-8 -*-
"""
Scheduler que sincroniza resultados a cada 5 minutos
durante a Copa 2026 (11 de junho a 12 de julho de 2026).
"""
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()


def iniciar_scheduler():
    """Inicia o scheduler de sincronização."""
    from app import app
    from sync_resultados import sincronizar_resultados
    
    # Data de início e fim da Copa 2026
    DATA_INICIO = datetime(2026, 6, 11)
    DATA_FIM = datetime(2026, 7, 12)
    
    agora = datetime.now()
    
    # Só agenda se estiver dentro do período da Copa
    if DATA_INICIO <= agora <= DATA_FIM:
        print("📅 Copa 2026 em andamento. Iniciando sincronização a cada 5 minutos...")
        # Sincronizar a cada 5 minutos
        scheduler.add_job(
            lambda: sincronizar_resultados(app=app, verbose=False),
            'interval',
            minutes=5,
            id='sync_resultados',
            name='Sincronização de resultados da Copa 2026',
            replace_existing=True,
            max_instances=1  # Apenas 1 execução por vez
        )
        scheduler.start()
        print("✅ Scheduler iniciado com sucesso!")
    else:
        print(f"⏸️  Copa 2026 não está em andamento. Próxima: 11 de junho de 2026")


def parar_scheduler():
    """Para o scheduler."""
    if scheduler.running:
        scheduler.shutdown()
    print("⛔ Scheduler parado")
# -*- coding: utf-8 -*-
"""
Scheduler que sincroniza APENAS jogos em andamento a cada 5 minutos
durante a Copa 2026 (11 de junho a 12 de julho de 2026).
"""
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler_iniciado = False  # Flag para rastrear


def iniciar_scheduler():
    """Inicia o scheduler de sincronização."""
    global scheduler_iniciado
    
    if scheduler_iniciado:
        print("⏳ Scheduler já foi iniciado")
        return
    
    from app import app
    from sync_resultados import sincronizar_resultados
    
    print("🔍 Checando condições para iniciar scheduler...", flush=True)
    
    DATA_INICIO = datetime(2026, 6, 11)
    DATA_FIM = datetime(2026, 7, 12)
    agora = datetime.now()
    
    if DATA_INICIO <= agora <= DATA_FIM:
        print("📅 Copa 2026 em andamento. Sincronizando apenas jogos em andamento...")
        
        # Função wrapper com logging
        def job_with_logging():
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔄 Executando sincronização...", flush=True)
            resultado = sincronizar_resultados(app=app, verbose=False, status_filter="IN_PLAY")
            if not resultado:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Falha na sincronização", flush=True)
        
        scheduler.add_job(
            job_with_logging,
            "interval",
            minutes=5,
            id="sync_resultados",
            name="Sincronização de jogos em andamento da Copa 2026",
            replace_existing=True,
            max_instances=1,
        )
        scheduler.start()
        scheduler_iniciado = True
        print("✅ Scheduler iniciado! Sincronizando apenas jogos IN_PLAY a cada 5 min", flush=True)
    else:
        print("⏸️  Copa não está em andamento")

def parar_scheduler():
    """Para o scheduler."""
    if scheduler.running:
        scheduler.shutdown()
    print("⛔ Scheduler parado")
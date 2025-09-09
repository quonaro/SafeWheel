import asyncio
import signal
import sys
from tortoise import Tortoise


class ProcessManager:
    def __init__(self):
        self.shutdown_event = asyncio.Event()
        self.setup_signal_handlers()

    def setup_signal_handlers(self):
        """Настройка обработчиков сигналов для корректного завершения"""
        def signal_handler(signum, frame):
            print(f"\n🛑 Получен сигнал {signum}, завершаем работу...")
            self.shutdown_event.set()

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

    async def wait_for_shutdown(self):
        """Ожидание сигнала завершения"""
        await self.shutdown_event.wait()
        print("🔄 Закрываем соединения с базой данных...")
        await Tortoise.close_connections()
        print("✅ Бэкенд корректно завершен")

    async def start_backend(self):
        """Запуск бэкенда с ожиданием завершения"""
        # Инициализируем Tortoise ORM
        await Tortoise.init(
            db_url="sqlite://./safewheel.db",
            modules={"models": ["models"]}
        )
        
        # Генерируем схемы базы данных
        await Tortoise.generate_schemas()
        
        print("✅ База данных SQLite инициализирована")
        print("📊 Схемы таблиц созданы")
        
        # Запускаем uvicorn в отдельном процессе
        import subprocess
        import os
        
        # Устанавливаем переменную окружения для отслеживания процесса
        env = os.environ.copy()
        env['BACKEND_PID'] = str(os.getpid())
        
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "main:app", "--reload", 
            "--host", "0.0.0.0", "--port", "8000"
        ], env=env)
        
        try:
            # Ждем завершения
            await self.wait_for_shutdown()
        finally:
            # Завершаем процесс uvicorn
            process.terminate()
            process.wait()


if __name__ == "__main__":
    manager = ProcessManager()
    asyncio.run(manager.start_backend())

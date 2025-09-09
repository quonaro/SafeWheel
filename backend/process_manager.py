import asyncio
import signal
import sys
import subprocess
import os
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

    async def ensure_dependencies(self):
        """Проверяет и устанавливает зависимости при необходимости"""
        try:
            # Пытаемся импортировать основные зависимости
            import fastapi
            import uvicorn
            import tortoise

            print("✅ Все зависимости уже установлены")
        except ImportError:
            print("📦 Устанавливаем зависимости...")
            try:
                # Устанавливаем зависимости
                subprocess.check_call(
                    [
                        sys.executable,
                        "-m",
                        "pip",
                        "install",
                        "-r",
                        "requirements.txt",
                        "--user",
                        "--quiet",
                    ]
                )
                print("✅ Зависимости установлены успешно")
            except subprocess.CalledProcessError as e:
                print(f"❌ Ошибка установки зависимостей: {e}")
                print("💡 Попробуйте запустить: pip install -r requirements.txt")
                sys.exit(1)

    async def start_backend(self):
        """Запуск бэкенда с ожиданием завершения"""
        # Проверяем и устанавливаем зависимости при необходимости
        await self.ensure_dependencies()

        # Инициализируем Tortoise ORM
        await Tortoise.init(
            db_url="sqlite://./safewheel.db", modules={"models": ["models"]}
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
        env["BACKEND_PID"] = str(os.getpid())

        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--reload",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
            ],
            env=env,
        )

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

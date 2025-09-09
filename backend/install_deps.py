#!/usr/bin/env python3
"""
Скрипт для установки зависимостей Python в продакшен версии
"""

import subprocess
import sys
import os


def install_dependencies():
    """Устанавливает зависимости Python"""
    try:
        print("📦 Установка зависимостей Python...")

        # Определяем путь к requirements.txt
        script_dir = os.path.dirname(os.path.abspath(__file__))
        requirements_path = os.path.join(script_dir, "requirements.txt")

        # Устанавливаем зависимости
        subprocess.check_call(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "-r",
                requirements_path,
                "--user",  # Устанавливаем в пользовательскую директорию
                "--quiet",  # Тихий режим
            ]
        )

        print("✅ Зависимости установлены успешно")
        return True

    except subprocess.CalledProcessError as e:
        print(f"❌ Ошибка установки зависимостей: {e}")
        return False
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False


if __name__ == "__main__":
    success = install_dependencies()
    sys.exit(0 if success else 1)

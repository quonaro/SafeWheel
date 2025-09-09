#!/bin/bash

echo "🚀 Сборка SafeWheel Desktop приложения..."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Пожалуйста, установите Node.js"
    exit 1
fi

# Проверяем наличие Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не найден. Пожалуйста, установите Python3"
    exit 1
fi

echo "📦 Устанавливаем зависимости..."

# Устанавливаем зависимости фронтенда
echo "📦 Устанавливаем зависимости фронтенда..."
cd frontend
npm install
npm run build
cd ..

# Устанавливаем зависимости Python (только основные)
echo "📦 Проверяем зависимости Python..."
cd backend
# Устанавливаем только основные зависимости без конфликтов
pip install fastapi uvicorn pydantic python-multipart tortoise-orm aiosqlite --user --quiet
cd ..

# Собираем Electron приложение
echo "🔨 Собираем Electron приложение..."
npm run build:electron

echo "✅ Сборка завершена!"
echo "📁 Готовое приложение находится в папке dist/"
echo ""
echo "🎉 SafeWheel готов к использованию!"

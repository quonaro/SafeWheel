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

# Устанавливаем зависимости Python
echo "📦 Устанавливаем зависимости Python..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Собираем Electron приложение
echo "🔨 Собираем Electron приложение..."
npm run build:electron

echo "✅ Сборка завершена!"
echo "📁 Готовое приложение находится в папке dist/"
echo ""
echo "🎉 SafeWheel готов к использованию!"

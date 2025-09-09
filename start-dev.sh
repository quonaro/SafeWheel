#!/bin/bash

# Скрипт для запуска приложения в режиме разработки

echo "🚀 Запуск SafeWheel в режиме разработки..."

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

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Устанавливаем зависимости фронтенда..."
    cd frontend && npm install && cd ..
fi

if [ ! -d "backend/venv" ]; then
    echo "📦 Создаем виртуальное окружение Python..."
    cd backend && python3 -m venv venv && cd ..
fi

# Активируем виртуальное окружение и устанавливаем зависимости
echo "📦 Устанавливаем зависимости Python..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo "✅ Все зависимости установлены!"
echo "🌐 Запускаем приложение..."

# Запускаем все компоненты
npm run dev

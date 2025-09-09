#!/bin/bash

echo "🚀 Простая сборка SafeWheel..."

# Очищаем предыдущую сборку
echo "🧹 Очищаем предыдущую сборку..."
rm -rf dist/
rm -rf frontend/dist/

# Собираем фронтенд
echo "📦 Собираем фронтенд..."
cd frontend
npm install
npm run build
cd ..

# Собираем Electron
echo "🔨 Собираем Electron приложение..."
npm run build:electron

echo "✅ Сборка завершена!"
echo "📁 Готовое приложение: dist/SafeWheel-1.0.0.AppImage"
echo ""
echo "🎉 SafeWheel готов к использованию!"

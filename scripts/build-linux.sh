#!/bin/bash

# Скрипт сборки SafeWheel для Linux (AppImage)
# Автор: SafeWheel Team
# Версия: 1.0.0

set -e  # Остановка при ошибке

echo "🚀 Начинаем сборку SafeWheel для Linux (AppImage)..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js не найден. Установите Node.js 16+ и попробуйте снова."
    exit 1
fi

# Проверка версии Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    log_error "Требуется Node.js версии 16 или выше. Текущая версия: $(node -v)"
    exit 1
fi

log_info "Node.js версия: $(node -v)"

# Проверка наличия npm
if ! command -v npm &> /dev/null; then
    log_error "npm не найден. Установите npm и попробуйте снова."
    exit 1
fi

log_info "npm версия: $(npm -v)"

# Переход в корневую директорию проекта
cd "$(dirname "$0")/.."

log_info "Рабочая директория: $(pwd)"

# Очистка предыдущих сборок
log_info "Очистка предыдущих сборок..."
npm run clean

# Установка зависимостей (если нужно)
if [ ! -d "node_modules" ]; then
    log_info "Установка основных зависимостей..."
    npm install
else
    log_info "Основные зависимости уже установлены"
fi

# Установка зависимостей фронтенда
if [ ! -d "frontend/node_modules" ]; then
    log_info "Установка зависимостей фронтенда..."
    cd frontend
    npm install
    cd ..
else
    log_info "Зависимости фронтенда уже установлены"
fi

# Сборка фронтенда
log_info "Сборка фронтенда..."
npm run build:frontend

# Проверка успешности сборки фронтенда
if [ ! -d "frontend/dist" ]; then
    log_error "Сборка фронтенда не удалась. Директория frontend/dist не найдена."
    exit 1
fi

log_success "Фронтенд успешно собран"

# Копирование зависимостей
log_info "Копирование зависимостей..."
npm run copy:deps

# Пересборка нативных модулей для Linux
log_info "Пересборка нативных модулей для Linux..."
npm run rebuild:linux

# Сборка Electron приложения для Linux
log_info "Сборка Electron приложения для Linux (AppImage)..."
npx --yes electron-builder --linux --publish=never

# Проверка результата сборки
APPIMAGE_FILE=$(ls dist/SafeWheel-*.AppImage 2>/dev/null | head -n 1)
if [ -n "$APPIMAGE_FILE" ] && [ -f "$APPIMAGE_FILE" ]; then
    log_success "Сборка завершена успешно!"
    log_success "AppImage файл: $APPIMAGE_FILE"
    
    # Получение размера файла
    FILE_SIZE=$(du -h "$APPIMAGE_FILE" | cut -f1)
    log_info "Размер файла: $FILE_SIZE"
    
    # Сделать файл исполняемым
    chmod +x "$APPIMAGE_FILE"
    log_info "Файл сделан исполняемым"
    
    echo ""
    log_success "🎉 SafeWheel для Linux готов к использованию!"
    log_info "Для запуска: ./$APPIMAGE_FILE"
    log_info "Файл находится в: $(pwd)/$APPIMAGE_FILE"
    
else
    log_error "Сборка не удалась. AppImage файл не найден в директории dist/"
    exit 1
fi

echo ""
log_info "Сборка завершена в $(date)"

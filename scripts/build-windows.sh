#!/bin/bash

# Скрипт сборки SafeWheel для Windows (unpacked)
# Автор: SafeWheel Team
# Версия: 1.0.0

set -e  # Остановка при ошибке

echo "🚀 Начинаем сборку SafeWheel для Windows (unpacked)..."

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

# Очистка build директорий
log_info "Очистка build директорий..."
rm -rf build-deps dist/

# Копирование зависимостей
log_info "Копирование зависимостей..."
npm run copy:deps

# Пересборка нативных модулей для Windows
log_info "Пересборка нативных модулей для Windows..."
npm run rebuild:win

# Сборка Electron приложения для Windows (unpacked)
log_info "Сборка Electron приложения для Windows (unpacked)..."
npx --yes electron-builder --win --config.win.target=dir

# Проверка результата сборки
if [ -d "dist/win-unpacked" ]; then
    log_success "Сборка завершена успешно!"
    log_success "Unpacked директория: dist/win-unpacked"
    
    # Получение размера директории
    DIR_SIZE=$(du -sh "dist/win-unpacked" | cut -f1)
    log_info "Размер директории: $DIR_SIZE"
    
    # Проверка наличия исполняемого файла
    if [ -f "dist/win-unpacked/SafeWheel.exe" ]; then
        log_success "Исполняемый файл найден: SafeWheel.exe"
        
        # Получение размера exe файла
        EXE_SIZE=$(du -h "dist/win-unpacked/SafeWheel.exe" | cut -f1)
        log_info "Размер exe файла: $EXE_SIZE"
        
    else
        log_warning "Исполняемый файл SafeWheel.exe не найден в dist/win-unpacked/"
    fi
    
    echo ""
    log_success "🎉 SafeWheel для Windows готов к использованию!"
    log_info "Для запуска: dist/win-unpacked/SafeWheel.exe"
    log_info "Директория находится в: $(pwd)/dist/win-unpacked"
    log_info ""
    log_info "📦 Содержимое unpacked сборки:"
    ls -la "dist/win-unpacked/" | head -10
    
    if [ $(ls -1 "dist/win-unpacked/" | wc -l) -gt 10 ]; then
        log_info "... и еще $(( $(ls -1 "dist/win-unpacked/" | wc -l) - 10 )) файлов/папок"
    fi
    
else
    log_error "Сборка не удалась. Директория dist/win-unpacked не найдена."
    exit 1
fi

echo ""
log_info "Сборка завершена в $(date)"



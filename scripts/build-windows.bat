@echo off
setlocal enabledelayedexpansion

REM Скрипт сборки SafeWheel для Windows (unpacked)
REM Автор: SafeWheel Team
REM Версия: 1.0.0

echo 🚀 Начинаем сборку SafeWheel для Windows (unpacked)...

REM Проверка наличия Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не найден. Установите Node.js 16+ и попробуйте снова.
    pause
    exit /b 1
)

echo ℹ️  Node.js версия: 
node --version

REM Проверка наличия npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm не найден. Установите npm и попробуйте снова.
    pause
    exit /b 1
)

echo ℹ️  npm версия: 
npm --version

REM Переход в корневую директорию проекта
cd /d "%~dp0.."

echo ℹ️  Рабочая директория: %CD%

REM Очистка предыдущих сборок
echo ℹ️  Очистка предыдущих сборок...
call npm run clean

REM Установка зависимостей (если нужно)
if not exist "node_modules" (
    echo ℹ️  Установка основных зависимостей...
    call npm install
) else (
    echo ℹ️  Основные зависимости уже установлены
)

REM Установка зависимостей фронтенда
if not exist "frontend\node_modules" (
    echo ℹ️  Установка зависимостей фронтенда...
    cd frontend
    call npm install
    cd ..
) else (
    echo ℹ️  Зависимости фронтенда уже установлены
)

REM Сборка фронтенда
echo ℹ️  Сборка фронтенда...
call npm run build:frontend

REM Проверка успешности сборки фронтенда
if not exist "frontend\dist" (
    echo ❌ Сборка фронтенда не удалась. Директория frontend\dist не найдена.
    pause
    exit /b 1
)

echo ✅ Фронтенд успешно собран

REM Копирование зависимостей
echo ℹ️  Копирование зависимостей...
call npm run copy:deps

REM Пересборка нативных модулей для Windows
echo ℹ️  Пересборка нативных модулей для Windows...
call npm run rebuild:win

REM Сборка Electron приложения для Windows (unpacked)
echo ℹ️  Сборка Electron приложения для Windows (unpacked)...
call npx --yes electron-builder --win --config.win.target=dir

REM Проверка результата сборки
if exist "dist\win-unpacked" (
    echo ✅ Сборка завершена успешно!
    echo ✅ Unpacked директория: dist\win-unpacked
    
    REM Проверка наличия исполняемого файла
    if exist "dist\win-unpacked\SafeWheel.exe" (
        echo ✅ Исполняемый файл найден: SafeWheel.exe
    ) else (
        echo ⚠️  Исполняемый файл SafeWheel.exe не найден в dist\win-unpacked\
    )
    
    echo.
    echo 🎉 SafeWheel для Windows готов к использованию!
    echo ℹ️  Для запуска: dist\win-unpacked\SafeWheel.exe
    echo ℹ️  Директория находится в: %CD%\dist\win-unpacked
    
) else (
    echo ❌ Сборка не удалась. Директория dist\win-unpacked не найдена.
    pause
    exit /b 1
)

echo.
echo ℹ️  Сборка завершена в %date% %time%

pause



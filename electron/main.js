const {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  shell,
  ipcMain,
} = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const BackendServer = require("./backend-server");
const isDev = process.env.NODE_ENV === "development";

let mainWindow;
let frontendProcess = null;
let backendServer = null;

// Функция для запуска встроенного бэкенда
async function startBackend() {
  if (backendServer) {
    console.log("🔄 Встроенный бэкенд уже запущен");
    return;
  }

  console.log("🚀 Запуск встроенного бэкенда...");

  try {
    backendServer = new BackendServer();
    await backendServer.start();
    console.log("✅ Встроенный бэкенд запущен успешно");
  } catch (error) {
    console.error("❌ Ошибка запуска встроенного бэкенда:", error);
  }
}

// Функция для остановки бэкенда
function stopBackend() {
  if (backendServer) {
    console.log("🛑 Остановка встроенного бэкенда...");
    backendServer.stop();
    backendServer = null;
  }
}

// Функция для запуска фронтенда
function startFrontend() {
  if (frontendProcess) {
    console.log("🔄 Фронтенд уже запущен");
    return;
  }

  console.log("🚀 Запуск фронтенда...");
  frontendProcess = spawn("npm", ["run", "dev"], {
    cwd: path.join(__dirname, "../frontend"),
    stdio: "inherit",
    shell: true,
  });

  frontendProcess.on("error", (err) => {
    console.error("❌ Ошибка запуска фронтенда:", err);
  });

  frontendProcess.on("exit", (code) => {
    console.log(`🛑 Фронтенд завершен с кодом ${code}`);
    frontendProcess = null;
  });
}

// Функция для остановки фронтенда
function stopFrontend() {
  if (frontendProcess) {
    console.log("🛑 Остановка фронтенда...");
    frontendProcess.kill("SIGTERM");
    frontendProcess = null;
  }
}

// Функция для остановки всех процессов
function stopAllProcesses() {
  console.log("🛑 Остановка всех процессов...");
  stopBackend();
  stopFrontend();
}

function createWindow() {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../assets/icon.png"),
    titleBarStyle: "default",
    show: false,
  });

  // Загружаем приложение
  const startUrl = isDev
    ? "http://localhost:3000" // Фронтенд запускается на порту 3000
    : `file://${path.join(__dirname, "../frontend/dist/index.html")}`;

  console.log("🔗 Загружаем URL:", startUrl);

  // Ждем пока фронтенд будет готов
  if (isDev) {
    // В режиме разработки ждем немного перед загрузкой
    setTimeout(() => {
      mainWindow.loadURL(startUrl);
    }, 2000);
  } else {
    // В продакшене загружаем сразу
    mainWindow.loadURL(startUrl);
  }

  // Обработка ошибок загрузки
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error(
        "❌ Ошибка загрузки:",
        errorCode,
        errorDescription,
        validatedURL
      );

      // Показываем страницу с ошибкой
      mainWindow.loadURL(`data:text/html,
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h1>🚫 Ошибка загрузки SafeWheel</h1>
          <p><strong>Код ошибки:</strong> ${errorCode}</p>
          <p><strong>Описание:</strong> ${errorDescription}</p>
          <p><strong>URL:</strong> ${validatedURL}</p>
          <hr>
          <p>Попробуйте:</p>
          <ul style="text-align: left; display: inline-block;">
            <li>Перезапустить приложение</li>
            <li>Проверить, что все файлы на месте</li>
            <li>Запустить в режиме разработки: <code>npm run dev</code></li>
          </ul>
        </body>
      </html>
    `);
    }
  );

  // Показываем окно когда оно готово
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // DevTools не открываем автоматически - только по горячим клавишам
    // if (isDev) {
    //   mainWindow.webContents.openDevTools();
    // }
  });

  // Обработка закрытия окна
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Обработка внешних ссылок
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Устанавливаем Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' 'unsafe-inline' data: http://localhost:* ws://localhost:*; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: http://localhost:*; " +
              "connect-src 'self' http://localhost:* ws://localhost:*;",
          ],
        },
      });
    }
  );

  // Добавляем горячие клавиши для разработки
  if (isDev) {
    mainWindow.webContents.on("before-input-event", (event, input) => {
      // F12 - открыть/закрыть DevTools
      if (input.key === "F12") {
        mainWindow.webContents.toggleDevTools();
      }
      // Ctrl+Shift+I - открыть/закрыть DevTools
      if (input.control && input.shift && input.key === "I") {
        mainWindow.webContents.toggleDevTools();
      }
      // Ctrl+R - перезагрузить
      if (input.control && input.key === "r") {
        mainWindow.reload();
      }
      // Ctrl+Shift+R - принудительная перезагрузка
      if (input.control && input.shift && input.key === "R") {
        mainWindow.webContents.reloadIgnoringCache();
      }
      // Alt - показать/скрыть меню
      if (input.alt && input.key === "Alt") {
        const menu = Menu.getApplicationMenu();
        if (menu) {
          Menu.setApplicationMenu(null);
        } else {
          createMenu();
        }
      }
    });
  }

  // Настраиваем контекстное меню
  mainWindow.webContents.on("context-menu", (event, params) => {
    const menu = new Menu();

    // Добавляем пункты контекстного меню
    menu.append(
      new MenuItem({
        label: "Копировать",
        role: "copy",
        accelerator: "CmdOrCtrl+C",
      })
    );

    menu.append(
      new MenuItem({
        label: "Вставить",
        role: "paste",
        accelerator: "CmdOrCtrl+V",
      })
    );

    menu.append(
      new MenuItem({
        type: "separator",
      })
    );

    if (isDev) {
      menu.append(
        new MenuItem({
          label: "Инструменты разработчика",
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
          accelerator: "F12",
        })
      );

      menu.append(
        new MenuItem({
          label: "Перезагрузить",
          click: () => {
            mainWindow.reload();
          },
          accelerator: "CmdOrCtrl+R",
        })
      );

      menu.append(
        new MenuItem({
          type: "separator",
        })
      );
    }

    menu.append(
      new MenuItem({
        label: "Показать меню приложения",
        click: () => {
          createMenu();
        },
        accelerator: "Alt",
      })
    );

    menu.popup();
  });
}

// Создаем меню приложения
function createMenu() {
  const template = [
    {
      label: "Файл",
      submenu: [
        {
          label: "Новое окно",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            createWindow();
          },
        },
        { type: "separator" },
        {
          label: "Выход",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Вид",
      submenu: [
        {
          label: "Перезагрузить",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            mainWindow.reload();
          },
        },
        {
          label: "Полноэкранный режим",
          accelerator: process.platform === "darwin" ? "Ctrl+Cmd+F" : "F11",
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          },
        },
        {
          label: "Инструменты разработчика",
          accelerator:
            process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: "Окно",
      submenu: [
        {
          label: "Свернуть",
          accelerator: "CmdOrCtrl+M",
          click: () => {
            mainWindow.minimize();
          },
        },
        {
          label: "Закрыть",
          accelerator: "CmdOrCtrl+W",
          click: () => {
            mainWindow.close();
          },
        },
      ],
    },
    {
      label: "Справка",
      submenu: [
        {
          label: "О SafeWheel",
          click: () => {
            // Здесь можно добавить диалог "О программе"
            console.log("SafeWheel v1.0.0");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Этот метод будет вызван когда Electron закончит инициализацию
app.whenReady().then(async () => {
  createWindow();

  // Полностью убираем меню для чистого интерфейса
  Menu.setApplicationMenu(null);

  // Запускаем бэкенд всегда (и в разработке, и в продакшене)
  await startBackend();

  // Фронтенд запускаем только в режиме разработки
  if (isDev) {
    startFrontend();
  }

  app.on("activate", () => {
    // На macOS пересоздаем окно когда иконка в доке нажата
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выходим когда все окна закрыты
app.on("window-all-closed", () => {
  // Останавливаем все процессы при закрытии всех окон
  stopAllProcesses();

  // На macOS приложения обычно остаются активными до Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Обработка завершения приложения
app.on("before-quit", () => {
  console.log("🛑 Завершение приложения...");
  stopAllProcesses();
});

// Обработка принудительного завершения
process.on("SIGINT", () => {
  console.log("🛑 Получен SIGINT, завершаем все процессы...");
  stopAllProcesses();
  app.quit();
});

process.on("SIGTERM", () => {
  console.log("🛑 Получен SIGTERM, завершаем все процессы...");
  stopAllProcesses();
  app.quit();
});

// Обработка сертификатов для HTTPS
app.on(
  "certificate-error",
  (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
      // В режиме разработки игнорируем ошибки сертификатов
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  }
);

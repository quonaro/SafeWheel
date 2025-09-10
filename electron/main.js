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
const DatabaseManager = require("./database");
const isDev = process.env.NODE_ENV === "development";

// Импортируем fetch для Node.js
const fetch = require("node-fetch");

let mainWindow;
let frontendProcess = null;
let database = null;

// Функция для инициализации базы данных
async function initDatabase() {
  if (database) {
    return;
  }


  try {
    database = new DatabaseManager();
    await database.init();
  } catch (error) {
    console.error("❌ Ошибка инициализации базы данных:", error);
  }
}

// Функция для закрытия базы данных
function closeDatabase() {
  if (database) {
    database.close();
    database = null;
  }
}

// Функция для проверки доступности сервера
async function waitForServer(url, maxAttempts = 30, delay = 1000) {
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Игнорируем ошибки соединения на ранних этапах
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  console.error(`❌ Сервер не отвечает после ${maxAttempts} попыток`);
  return false;
}

// Функция для запуска фронтенда
function startFrontend() {
  if (frontendProcess) {
    return;
  }

  frontendProcess = spawn("npm", ["run", "dev"], {
    cwd: path.join(__dirname, "../frontend"),
    stdio: "inherit",
    shell: true,
  });

  frontendProcess.on("error", (err) => {
    console.error("❌ Ошибка запуска фронтенда:", err);
  });

  frontendProcess.on("exit", (code) => {
    frontendProcess = null;
  });
}

// Функция для остановки фронтенда
function stopFrontend() {
  if (frontendProcess) {
    frontendProcess.kill("SIGTERM");
    frontendProcess = null;
  }
}

// Функция для остановки всех процессов
function stopAllProcesses() {
  closeDatabase();
  stopFrontend();
}

// Настройка IPC обработчиков для работы с базой данных
function setupIpcHandlers() {
  // ===== Competitions =====
  ipcMain.handle("db:listCompetitions", async () =>
    database.listCompetitions()
  );
  ipcMain.handle("db:getCompetitionById", async (e, id) =>
    database.getCompetitionById(id)
  );
  ipcMain.handle("db:createCompetition", async (e, data) =>
    database.createCompetition(data)
  );
  ipcMain.handle("db:updateCompetition", async (e, id, data) =>
    database.updateCompetition(id, data)
  );
  ipcMain.handle("db:deleteCompetition", async (e, id) =>
    database.deleteCompetition(id)
  );

  // ===== Teams =====
  ipcMain.handle("db:listTeams", async (e, competitionId) =>
    database.listTeams(competitionId)
  );
  ipcMain.handle("db:getTeamById", async (e, id) => database.getTeamById(id));
  ipcMain.handle("db:createTeam", async (e, competitionId, name) =>
    database.createTeam(competitionId, name)
  );
  ipcMain.handle("db:updateTeam", async (e, id, name) =>
    database.updateTeam(id, name)
  );
  ipcMain.handle("db:deleteTeam", async (e, id) => database.deleteTeam(id));

  // ===== Participants =====
  ipcMain.handle("db:listParticipants", async (e, teamId) =>
    database.listParticipants(teamId)
  );
  ipcMain.handle("db:getParticipantById", async (e, id) =>
    database.getParticipantById(id)
  );
  ipcMain.handle("db:createParticipant", async (e, teamId, payload) =>
    database.createParticipant(teamId, payload)
  );
  ipcMain.handle("db:updateParticipant", async (e, id, payload) =>
    database.updateParticipant(id, payload)
  );
  ipcMain.handle("db:deleteParticipant", async (e, id) =>
    database.deleteParticipant(id)
  );

  // ===== Stages =====
  ipcMain.handle("db:listStages", async (e, competitionId) =>
    database.listStages(competitionId)
  );
  ipcMain.handle("db:getStageById", async (e, id) => database.getStageById(id));
  ipcMain.handle("db:createStage", async (e, competitionId, payload) =>
    database.createStage(competitionId, payload)
  );
  ipcMain.handle("db:updateStage", async (e, id, payload) =>
    database.updateStage(id, payload)
  );
  ipcMain.handle("db:deleteStage", async (e, id) => database.deleteStage(id));

  // ===== Results =====
  ipcMain.handle(
    "db:upsertStageResult",
    async (e, stageId, participantId, payload) =>
      database.upsertStageResult(stageId, participantId, payload)
  );
  ipcMain.handle("db:getStageResults", async (e, stageId) =>
    database.getStageResults(stageId)
  );
  ipcMain.handle("db:computeStandings", async (e, competitionId) =>
    database.computeStandings(competitionId)
  );
  ipcMain.handle("db:getStageStandings", async (e, competitionId) =>
    database.getStageStandings(competitionId)
  );
  ipcMain.handle("db:getParticipantResults", async (e, competitionId, options) =>
    database.getParticipantResults(competitionId, options)
  );
  ipcMain.handle("db:getParticipantStageDetails", async (e, competitionId, participantId) =>
    database.getParticipantStageDetails(competitionId, participantId)
  );
  ipcMain.handle("db:getStageStandingsWithParticipants", async (e, competitionId) =>
    database.getStageStandingsWithParticipants(competitionId)
  );
  ipcMain.handle("db:getParticipantsWithResults", async (e, competitionId, stageId) =>
    database.getParticipantsWithResults(competitionId, stageId)
  );
  ipcMain.handle("db:getParticipantStageResults", async (e, competitionId, participantName) =>
    database.getParticipantStageResults(competitionId, participantName)
  );
}

function createWindow() {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: false,
      sandbox: false,
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


  // Ждем пока фронтенд будет готов
  if (isDev) {
    // В режиме разработки ждем готовности сервера
    waitForServer(startUrl).then((isReady) => {
      if (isReady) {
        mainWindow.loadURL(startUrl);
      } else {
        console.error("❌ Не удалось подключиться к серверу разработки");
        // Показываем страницу с ошибкой
        mainWindow.loadURL(`data:text/html,
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h1>🚫 Ошибка подключения к серверу разработки</h1>
            <p>Не удалось подключиться к Vite серверу на порту 3000</p>
            <p>Попробуйте:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Перезапустить приложение</li>
              <li>Проверить, что порт 3000 свободен</li>
              <li>Запустить фронтенд вручную: <code>cd frontend && npm run dev</code></li>
            </ul>
          </body>
        </html>
      `);
      }
    });
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

  // Инициализируем базу данных
  await initDatabase();

  // Настраиваем IPC обработчики для работы с базой данных
  setupIpcHandlers();

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
  stopAllProcesses();
});

// Обработка принудительного завершения
process.on("SIGINT", () => {
  stopAllProcesses();
  app.quit();
});

process.on("SIGTERM", () => {
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

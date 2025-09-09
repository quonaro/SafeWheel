const express = require("express");
const cors = require("cors");
const path = require("path");
const DatabaseManager = require("./database");

class BackendServer {
  constructor() {
    this.app = express();
    this.port = 8000;
    this.database = new DatabaseManager();

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS для работы с Electron
    this.app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:3003",
        ],
        credentials: true,
      })
    );

    this.app.use(express.json());
  }

  setupRoutes() {
    // Корневой путь
    this.app.get("/", (req, res) => {
      res.json({ message: "SafeWheel API работает!" });
    });

    // Получить все колеса
    this.app.get("/api/wheels", async (req, res) => {
      try {
        const wheels = await this.database.getAllWheels();
        res.json(wheels);
      } catch (error) {
        console.error("❌ Ошибка получения колес:", error);
        res.status(500).json({ detail: "Ошибка сервера при получении данных" });
      }
    });

    // Получить колесо по ID
    this.app.get("/api/wheels/:id", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const wheel = await this.database.getWheelById(id);

        if (!wheel) {
          return res.status(404).json({ detail: "Колесо не найдено" });
        }

        res.json(wheel);
      } catch (error) {
        console.error("❌ Ошибка получения колеса:", error);
        res.status(500).json({ detail: "Ошибка сервера при получении данных" });
      }
    });

    // Создать новое колесо
    this.app.post("/api/wheels", async (req, res) => {
      try {
        const wheel = await this.database.createWheel(req.body);

        res.json({
          success: true,
          message: "Колесо успешно создано",
          data: wheel,
        });
      } catch (error) {
        console.error("❌ Ошибка создания колеса:", error);
        res.status(500).json({ detail: "Ошибка сервера при создании колеса" });
      }
    });

    // Обновить колесо
    this.app.put("/api/wheels/:id", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const wheel = await this.database.updateWheel(id, req.body);

        res.json({
          success: true,
          message: "Колесо успешно обновлено",
          data: wheel,
        });
      } catch (error) {
        if (error.message === "Колесо не найдено") {
          res.status(404).json({ detail: "Колесо не найдено" });
        } else {
          console.error("❌ Ошибка обновления колеса:", error);
          res
            .status(500)
            .json({ detail: "Ошибка сервера при обновлении колеса" });
        }
      }
    });

    // Удалить колесо
    this.app.delete("/api/wheels/:id", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const deletedWheel = await this.database.deleteWheel(id);

        res.json({
          success: true,
          message: "Колесо успешно удалено",
          data: deletedWheel,
        });
      } catch (error) {
        if (error.message === "Колесо не найдено") {
          res.status(404).json({ detail: "Колесо не найдено" });
        } else {
          console.error("❌ Ошибка удаления колеса:", error);
          res
            .status(500)
            .json({ detail: "Ошибка сервера при удалении колеса" });
        }
      }
    });
  }

  async start() {
    try {
      // Инициализируем базу данных
      await this.database.init();

      // Выполняем миграцию данных из JSON (если есть)
      await this.database.migrateFromJson();

      this.server = this.app.listen(this.port, "0.0.0.0", () => {
        console.log(`🚀 Backend сервер запущен на http://0.0.0.0:${this.port}`);
      });

      this.server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.log(
            `⚠️  Порт ${this.port} занят, пробуем порт ${this.port + 1}`
          );
          this.port += 1;
          this.start();
        } else {
          console.error("❌ Ошибка сервера:", err);
        }
      });
    } catch (error) {
      console.error("❌ Ошибка инициализации сервера:", error);
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log("🛑 Backend сервер остановлен");
    }
    if (this.database) {
      this.database.close();
    }
  }
}

module.exports = BackendServer;

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;

class BackendServer {
  constructor() {
    this.app = express();
    this.port = 8000;
    this.dbPath = path.join(__dirname, "../data/safewheel.db");
    this.data = [];
    this.nextId = 1;

    this.setupMiddleware();
    this.setupRoutes();
    this.loadData();
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
    this.app.get("/api/wheels", (req, res) => {
      res.json(this.data);
    });

    // Получить колесо по ID
    this.app.get("/api/wheels/:id", (req, res) => {
      const id = parseInt(req.params.id);
      const wheel = this.data.find((w) => w.id === id);

      if (!wheel) {
        return res.status(404).json({ detail: "Колесо не найдено" });
      }

      res.json(wheel);
    });

    // Создать новое колесо
    this.app.post("/api/wheels", (req, res) => {
      const wheel = {
        id: this.nextId++,
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.data.push(wheel);
      this.saveData();

      res.json({
        success: true,
        message: "Колесо успешно создано",
        data: wheel,
      });
    });

    // Обновить колесо
    this.app.put("/api/wheels/:id", (req, res) => {
      const id = parseInt(req.params.id);
      const index = this.data.findIndex((w) => w.id === id);

      if (index === -1) {
        return res.status(404).json({ detail: "Колесо не найдено" });
      }

      this.data[index] = {
        ...this.data[index],
        ...req.body,
        id: id,
        updated_at: new Date().toISOString(),
      };

      this.saveData();

      res.json({
        success: true,
        message: "Колесо успешно обновлено",
        data: this.data[index],
      });
    });

    // Удалить колесо
    this.app.delete("/api/wheels/:id", (req, res) => {
      const id = parseInt(req.params.id);
      const index = this.data.findIndex((w) => w.id === id);

      if (index === -1) {
        return res.status(404).json({ detail: "Колесо не найдено" });
      }

      const deletedWheel = this.data.splice(index, 1)[0];
      this.saveData();

      res.json({
        success: true,
        message: "Колесо успешно удалено",
        data: deletedWheel,
      });
    });
  }

  async loadData() {
    try {
      // Создаем папку для данных если её нет
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      // Пытаемся загрузить данные из файла
      const data = await fs.readFile(this.dbPath, "utf8");
      this.data = JSON.parse(data);
      this.nextId = Math.max(...this.data.map((w) => w.id), 0) + 1;
      console.log("✅ Данные загружены из файла");
    } catch (error) {
      console.log("📝 Создаем новую базу данных");
      this.data = [];
      this.nextId = 1;
    }
  }

  async saveData() {
    try {
      await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("❌ Ошибка сохранения данных:", error);
    }
  }

  start() {
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
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log("🛑 Backend сервер остановлен");
    }
  }
}

module.exports = BackendServer;

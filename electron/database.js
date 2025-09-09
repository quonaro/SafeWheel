const Database = require("better-sqlite3");
const path = require("path");

class DatabaseManager {
  constructor() {
    const isPackaged = require("electron").app
      ? require("electron").app.isPackaged
      : false;

    if (isPackaged) {
      // В собранном приложении используем папку рядом с AppImage файлом
      const { app } = require("electron");
      const execPath = process.execPath;
      const execDir = path.dirname(execPath);

      // Попробуем найти оригинальный путь к AppImage
      let dbDir = execDir;
      if (execPath.includes("/tmp/.mount_")) {
        // Если мы в AppImage, попробуем найти оригинальный путь
        const originalPath = process.env.APPIMAGE || process.env.ARGV0;
        if (originalPath) {
          dbDir = path.dirname(originalPath);
        }
      }

      this.dbPath = path.join(dbDir, "safewheel.db");
    } else {
      // В режиме разработки используем локальную папку
      this.dbPath = path.join(__dirname, "../data/safewheel.db");
    }

    this.db = null;
  }

  // Инициализация базы данных
  async init() {
    try {
      // Создаем папку для данных если её нет
      const fs = require("fs");
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(this.dbPath);
      console.log("✅ Подключение к SQLite базе данных установлено");

      await this.createTables();
    } catch (error) {
      console.error("❌ Ошибка подключения к базе данных:", error.message);
      throw error;
    }
  }

  // Создание таблиц
  async createTables() {
    try {
      const createWheelsTable = `
        CREATE TABLE IF NOT EXISTS wheels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          diameter REAL NOT NULL,
          width REAL NOT NULL,
          material TEXT NOT NULL,
          condition TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.exec(createWheelsTable);
      console.log("✅ Таблица wheels создана/проверена");
    } catch (error) {
      console.error("❌ Ошибка создания таблицы wheels:", error.message);
      throw error;
    }
  }

  // Получить все колеса
  async getAllWheels() {
    try {
      const stmt = this.db.prepare(
        "SELECT * FROM wheels ORDER BY created_at DESC"
      );
      const rows = stmt.all();
      return rows;
    } catch (error) {
      console.error("❌ Ошибка получения колес:", error.message);
      throw error;
    }
  }

  // Получить колесо по ID
  async getWheelById(id) {
    try {
      const stmt = this.db.prepare("SELECT * FROM wheels WHERE id = ?");
      const row = stmt.get(id);
      return row;
    } catch (error) {
      console.error("❌ Ошибка получения колеса:", error.message);
      throw error;
    }
  }

  // Создать новое колесо
  async createWheel(wheelData) {
    try {
      const { name, diameter, width, material, condition } = wheelData;
      const stmt = this.db.prepare(`
        INSERT INTO wheels (name, diameter, width, material, condition, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(name, diameter, width, material, condition);
      const wheel = await this.getWheelById(result.lastInsertRowid);
      return wheel;
    } catch (error) {
      console.error("❌ Ошибка создания колеса:", error.message);
      throw error;
    }
  }

  // Обновить колесо
  async updateWheel(id, wheelData) {
    try {
      const { name, diameter, width, material, condition } = wheelData;
      const stmt = this.db.prepare(`
        UPDATE wheels 
        SET name = ?, diameter = ?, width = ?, material = ?, condition = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = stmt.run(name, diameter, width, material, condition, id);

      if (result.changes === 0) {
        throw new Error("Колесо не найдено");
      }

      const wheel = await this.getWheelById(id);
      return wheel;
    } catch (error) {
      console.error("❌ Ошибка обновления колеса:", error.message);
      throw error;
    }
  }

  // Удалить колесо
  async deleteWheel(id) {
    try {
      // Сначала получить колесо для возврата
      const wheel = await this.getWheelById(id);
      if (!wheel) {
        throw new Error("Колесо не найдено");
      }

      const stmt = this.db.prepare("DELETE FROM wheels WHERE id = ?");
      stmt.run(id);

      return wheel;
    } catch (error) {
      console.error("❌ Ошибка удаления колеса:", error.message);
      throw error;
    }
  }

  // Миграция данных из JSON файла (если существует)
  async migrateFromJson() {
    const fs = require("fs").promises;
    try {
      // Ищем JSON файл в разных местах
      const possiblePaths = [
        this.dbPath.replace(".db", ".json"), // Рядом с новой БД
        path.join(__dirname, "../data/safewheel.json"), // В папке data проекта
        path.join(path.dirname(this.dbPath), "safewheel.json"), // Рядом с исполняемым файлом
      ];

      let jsonData = null;
      for (const jsonPath of possiblePaths) {
        try {
          const data = await fs.readFile(jsonPath, "utf8");
          jsonData = JSON.parse(data);
          break;
        } catch (err) {
          // Продолжаем поиск
        }
      }

      if (!jsonData) {
        throw new Error("JSON файл не найден");
      }

      if (Array.isArray(jsonData) && jsonData.length > 0) {
        console.log("📦 Найдены данные для миграции из JSON файла");

        for (const wheel of jsonData) {
          try {
            await this.createWheel({
              name: wheel.name,
              diameter: wheel.diameter,
              width: wheel.width,
              material: wheel.material,
              condition: wheel.condition,
            });
          } catch (err) {
            console.warn("⚠️ Ошибка миграции колеса:", wheel.id, err.message);
          }
        }

        console.log("✅ Миграция данных завершена");

        // Переименовать старый JSON файл
        await fs.rename(
          this.dbPath.replace(".db", ".json"),
          this.dbPath.replace(".db", ".json.backup")
        );
        console.log("📁 Старый JSON файл переименован в .backup");
      }
    } catch (err) {
      // JSON файл не существует или пуст - это нормально
      console.log("📝 JSON файл не найден, создаем новую базу данных");
    }
  }

  // Закрытие соединения
  close() {
    if (this.db) {
      this.db.close();
      console.log("✅ Соединение с базой данных закрыто");
    }
  }
}

module.exports = DatabaseManager;

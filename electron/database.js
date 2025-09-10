const Database = require("better-sqlite3");
const path = require("path");

class DatabaseManager {
  constructor() {
    const { app } = require("electron");
    const fs = require("fs");

    // Предпочтительно сохраняем БД рядом с исполняемым файлом (AppImage/EXE),
    // но если каталог недоступен для записи (ROFS/Program Files), откатываемся в userData
    const resolveDataDir = () => {
      // 1) Явно заданный каталог через переменную окружения
      const envDir = process.env.SAFEWHEEL_DB_DIR;
      if (envDir) {
        return envDir;
      }

      // 2) Каталог рядом с исполняемым файлом
      try {
        let exeDir;

        // Для AppImage используем переменную окружения APPIMAGE
        if (process.env.APPIMAGE) {
          exeDir = path.dirname(process.env.APPIMAGE);
          console.log("🔍 Найден AppImage путь:", process.env.APPIMAGE);
        } else if (
          process.env.ARGV0 &&
          !process.env.ARGV0.includes("/tmp/.mount_")
        ) {
          // Fallback на ARGV0 если это не временный путь
          exeDir = path.dirname(process.env.ARGV0);
          console.log("🔍 Используем ARGV0 путь:", process.env.ARGV0);
        } else {
          // Обычный путь к исполняемому файлу
          exeDir = app
            ? path.dirname(app.getPath("exe"))
            : path.dirname(process.execPath);
          console.log("🔍 Используем стандартный путь:", exeDir);
        }

        return exeDir;
      } catch (_) {
        // Игнорируем и откатываемся ниже
      }

      // 3) Fallback: userData
      return app ? app.getPath("userData") : path.join(__dirname, "../data");
    };

    let dataDir = resolveDataDir();
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      // Пробуем создать временный файл для проверки прав на запись
      const testFile = path.join(dataDir, ".write_test");
      fs.writeFileSync(testFile, "ok");
      fs.unlinkSync(testFile);
    } catch (e) {
      // Если не удалось — используем userData
      const fallback = app
        ? app.getPath("userData")
        : path.join(__dirname, "../data");
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
      console.warn(
        "⚠️ Каталог рядом с исполняемым файлом недоступен для записи, используем userData:",
        fallback,
        "Причина:",
        e.message
      );
      dataDir = fallback;
    }

    this.dbPath = path.join(dataDir, "safewheel.db");

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
        console.log("📁 Создана папка для базы данных:", dataDir);
      }

      this.db = new Database(this.dbPath);
      console.log("✅ Подключение к SQLite базе данных установлено");
      console.log("📂 Путь к базе данных:", this.dbPath);

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
      console.log("🔄 Создание колеса с данными:", wheelData);
      const { name, diameter, width, material, condition } = wheelData;

      // Валидация данных (разрешаем 0 как валидное значение)
      const isEmptyString = (v) =>
        typeof v === "string" && v.trim().length === 0;
      const isNil = (v) => v === null || v === undefined;
      if (
        isEmptyString(name) ||
        isNil(name) ||
        isNil(diameter) ||
        isNil(width) ||
        isEmptyString(material) ||
        isNil(material) ||
        isEmptyString(condition) ||
        isNil(condition)
      ) {
        throw new Error("Не все обязательные поля заполнены");
      }

      // Приведение типов
      const numericDiameter = Number(diameter);
      const numericWidth = Number(width);
      if (Number.isNaN(numericDiameter) || Number.isNaN(numericWidth)) {
        throw new Error("Диаметр и ширина должны быть числами");
      }

      const stmt = this.db.prepare(`
        INSERT INTO wheels (name, diameter, width, material, condition, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(
        String(name).trim(),
        numericDiameter,
        numericWidth,
        String(material).trim(),
        String(condition).trim()
      );
      console.log("✅ Колесо создано с ID:", result.lastInsertRowid);

      const wheel = await this.getWheelById(result.lastInsertRowid);
      console.log("📋 Созданное колесо:", wheel);
      return wheel;
    } catch (error) {
      console.error("❌ Ошибка создания колеса:", error.message);
      console.error("❌ Стек ошибки:", error.stack);
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

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
      // Включаем внешние ключи
      this.db.pragma("foreign_keys = ON");

      const ddl = [
        // Конкурсы
        `CREATE TABLE IF NOT EXISTS competitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          emoji TEXT DEFAULT '🏆',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Команды
        `CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          competition_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
        )`,

        // Участники (max 4 на команду будет контролироваться на уровне приложений/триггеров)
        `CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_id INTEGER NOT NULL,
          full_name TEXT NOT NULL,
          gender TEXT CHECK (gender IN ('М','Ж')),
          age INTEGER NOT NULL CHECK(age >= 0),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )`,

        // Этапы соревнования
        `CREATE TABLE IF NOT EXISTS stages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          competition_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(competition_id, name),
          FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
        )`,

        // Результаты по участнику на этапе
        `CREATE TABLE IF NOT EXISTS stage_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stage_id INTEGER NOT NULL,
          participant_id INTEGER NOT NULL,
          time_seconds REAL NOT NULL DEFAULT 0,
          penalty_points INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(stage_id, participant_id),
          FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
        )`,

        // Индексы
        `CREATE INDEX IF NOT EXISTS idx_teams_competition ON teams(competition_id)`,
        `CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id)`,
        `CREATE INDEX IF NOT EXISTS idx_stages_competition ON stages(competition_id)`,
        `CREATE INDEX IF NOT EXISTS idx_results_stage ON stage_results(stage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_results_participant ON stage_results(participant_id)`,
      ];

      this.db.exec(ddl.join(";"));

      // Миграция: добавляем поле emoji если его нет
      try {
        this.db.exec(
          "ALTER TABLE competitions ADD COLUMN emoji TEXT DEFAULT '🏆'"
        );
        console.log("✅ Добавлено поле emoji в таблицу competitions");
      } catch (e) {
        // Поле уже существует, игнорируем ошибку
        if (!e.message.includes("duplicate column name")) {
          console.warn(
            "⚠️ Предупреждение при добавлении поля emoji:",
            e.message
          );
        }
      }

      // Миграция: добавляем поле description если его нет
      try {
        this.db.exec(
          "ALTER TABLE competitions ADD COLUMN description TEXT DEFAULT ''"
        );
        console.log("✅ Добавлено поле description в таблицу competitions");
      } catch (e) {
        // Поле уже существует, игнорируем ошибку
        if (!e.message.includes("duplicate column name")) {
          console.warn(
            "⚠️ Предупреждение при добавлении поля description:",
            e.message
          );
        }
      }

      console.log("✅ Таблицы конкурсов созданы/проверены");
    } catch (error) {
      console.error("❌ Ошибка создания таблиц:", error.message);
      throw error;
    }
  }

  // ===== CRUD: Competitions =====
  async listCompetitions() {
    const stmt = this.db.prepare(
      "SELECT * FROM competitions ORDER BY created_at DESC"
    );
    return stmt.all();
  }

  async getCompetitionById(id) {
    const stmt = this.db.prepare("SELECT * FROM competitions WHERE id = ?");
    return stmt.get(id);
  }

  async createCompetition(data) {
    const stmt = this.db.prepare(`
      INSERT INTO competitions (name, description, emoji, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(
      String(data.name || "").trim(),
      String(data.description || "").trim(),
      String(data.emoji || "🏆")
    );
    return this.getCompetitionById(result.lastInsertRowid);
  }

  async updateCompetition(id, data) {
    const stmt = this.db.prepare(`
      UPDATE competitions SET name = ?, description = ?, emoji = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(
      String(data.name || "").trim(),
      String(data.description || "").trim(),
      String(data.emoji || "🏆"),
      id
    );
    return this.getCompetitionById(id);
  }

  async deleteCompetition(id) {
    const comp = await this.getCompetitionById(id);
    if (!comp) return null;
    const stmt = this.db.prepare("DELETE FROM competitions WHERE id = ?");
    stmt.run(id);
    return comp;
  }

  // ===== CRUD: Teams =====
  async listTeams(competitionId) {
    const stmt = this.db.prepare(
      "SELECT * FROM teams WHERE competition_id = ? ORDER BY name ASC"
    );
    return stmt.all(competitionId);
  }

  async getTeamById(id) {
    const stmt = this.db.prepare("SELECT * FROM teams WHERE id = ?");
    return stmt.get(id);
  }

  async createTeam(competitionId, name) {
    const stmt = this.db.prepare(`
      INSERT INTO teams (competition_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const res = stmt.run(competitionId, String(name || "").trim());
    return this.getTeamById(res.lastInsertRowid);
  }

  async updateTeam(id, name) {
    const stmt = this.db.prepare(
      `UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    stmt.run(String(name || "").trim(), id);
    return this.getTeamById(id);
  }

  async deleteTeam(id) {
    const team = await this.getTeamById(id);
    if (!team) return null;
    const stmt = this.db.prepare("DELETE FROM teams WHERE id = ?");
    stmt.run(id);
    return team;
  }

  // ===== CRUD: Participants =====
  async listParticipants(teamId) {
    const stmt = this.db.prepare(
      "SELECT * FROM participants WHERE team_id = ? ORDER BY id ASC"
    );
    return stmt.all(teamId);
  }

  async getParticipantById(id) {
    return this.db.prepare("SELECT * FROM participants WHERE id = ?").get(id);
  }

  async createParticipant(teamId, payload) {
    // Контроль лимита 4 участника на команду
    const count = this.db
      .prepare("SELECT COUNT(1) AS cnt FROM participants WHERE team_id = ?")
      .get(teamId).cnt;
    if (count >= 4) {
      throw new Error("В команде не может быть больше 4 участников");
    }
    const stmt = this.db.prepare(`
      INSERT INTO participants (team_id, full_name, gender, age, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const res = stmt.run(
      teamId,
      String(payload.full_name || "").trim(),
      payload.gender || null,
      Number(payload.age || 0)
    );
    return this.getParticipantById(res.lastInsertRowid);
  }

  async updateParticipant(id, payload) {
    const stmt = this.db.prepare(`
      UPDATE participants SET full_name = ?, gender = ?, age = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(
      String(payload.full_name || "").trim(),
      payload.gender || null,
      Number(payload.age || 0),
      id
    );
    return this.getParticipantById(id);
  }

  async deleteParticipant(id) {
    const p = await this.getParticipantById(id);
    if (!p) return null;
    this.db.prepare("DELETE FROM participants WHERE id = ?").run(id);
    return p;
  }

  // ===== CRUD: Stages =====
  async listStages(competitionId) {
    return this.db
      .prepare("SELECT * FROM stages WHERE competition_id = ? ORDER BY id ASC")
      .all(competitionId);
  }

  async getStageById(id) {
    return this.db.prepare("SELECT * FROM stages WHERE id = ?").get(id);
  }

  async createStage(competitionId, payload) {
    const stmt = this.db.prepare(`
      INSERT INTO stages (competition_id, name, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const res = stmt.run(competitionId, String(payload.name || "").trim());
    return this.getStageById(res.lastInsertRowid);
  }

  async updateStage(id, payload) {
    const stmt = this.db.prepare(`
      UPDATE stages SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(String(payload.name || "").trim(), id);
    return this.getStageById(id);
  }

  async deleteStage(id) {
    const s = await this.getStageById(id);
    if (!s) return null;
    this.db.prepare("DELETE FROM stages WHERE id = ?").run(id);
    return s;
  }

  // ===== Results per participant per stage =====
  async upsertStageResult(stageId, participantId, payload) {
    const timeSeconds = Number(payload.time_seconds || 0);
    const penaltyPoints = Number(payload.penalty_points || 0);
    const existing = this.db
      .prepare(
        "SELECT id FROM stage_results WHERE stage_id = ? AND participant_id = ?"
      )
      .get(stageId, participantId);
    if (existing) {
      this.db
        .prepare(
          `UPDATE stage_results SET time_seconds = ?, penalty_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
        .run(timeSeconds, penaltyPoints, existing.id);
      return this.db
        .prepare("SELECT * FROM stage_results WHERE id = ?")
        .get(existing.id);
    } else {
      const res = this.db
        .prepare(
          `INSERT INTO stage_results (stage_id, participant_id, time_seconds, penalty_points, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .run(stageId, participantId, timeSeconds, penaltyPoints);
      return this.db
        .prepare("SELECT * FROM stage_results WHERE id = ?")
        .get(res.lastInsertRowid);
    }
  }

  async getStageResults(stageId) {
    return this.db
      .prepare(
        `
        SELECT sr.*, p.full_name, p.gender, p.age, p.team_id
        FROM stage_results sr
        JOIN participants p ON p.id = sr.participant_id
        WHERE sr.stage_id = ?
      `
      )
      .all(stageId);
  }

  // ===== Итоги по соревнованию =====
  // Сумма штрафных баллов и времени по всем этапам; при равенстве — по среднему возрасту команды (меньше — выше)
  async computeStandings(competitionId) {
    const sql = `
      WITH team_members AS (
        SELECT t.id AS team_id, t.name AS team_name,
               AVG(p.age) AS avg_age
        FROM teams t
        JOIN participants p ON p.team_id = t.id
        WHERE t.competition_id = ?
        GROUP BY t.id
      ),
      member_results AS (
        SELECT p.team_id,
               COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
               COALESCE(SUM(sr.time_seconds), 0) AS total_time
        FROM participants p
        LEFT JOIN stage_results sr ON sr.participant_id = p.id
        JOIN teams t ON t.id = p.team_id AND t.competition_id = ?
        GROUP BY p.team_id
      )
      SELECT tm.team_id, tm.team_name,
             mr.total_penalties, mr.total_time, tm.avg_age
      FROM team_members tm
      JOIN member_results mr ON mr.team_id = tm.team_id
      ORDER BY mr.total_penalties ASC, mr.total_time ASC, tm.avg_age ASC
    `;
    const rows = this.db.prepare(sql).all(competitionId, competitionId);
    // Добавим ранги
    return rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }

  // Миграция данных из JSON файла (если существует) — отключено для конкурсов
  async migrateFromJson() {
    // Зарезервировано под будущую миграцию, сейчас не используется
    return;
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

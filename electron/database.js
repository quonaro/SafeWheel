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
      
      // Выполняем миграции
      await this.migrateStagesTable();
      
      // Заполняем тестовыми данными если база пустая
      const existingCompetitions = this.db.prepare("SELECT COUNT(*) as count FROM competitions").get();
      if (existingCompetitions.count === 0) {
        console.log("🌱 База данных пустая, загружаем тестовые данные...");
        await this.seedTestData();
      }
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

  // ===== Результаты по этапам =====
  async getStageStandings(competitionId) {
    const sql = `
      WITH stage_team_results AS (
        SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
               t.id AS team_id, t.name AS team_name,
               COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
               COALESCE(SUM(sr.time_seconds), 0) AS total_time,
               AVG(p.age) AS avg_age
        FROM stages s
        CROSS JOIN teams t
        LEFT JOIN participants p ON p.team_id = t.id
        LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
        WHERE s.competition_id = ? AND t.competition_id = ?
        GROUP BY s.id, t.id
        ORDER BY s.order_index, total_penalties ASC, total_time ASC, avg_age ASC
      )
      SELECT * FROM stage_team_results
    `;
    const rows = this.db.prepare(sql).all(competitionId, competitionId);
    
    // Группируем по этапам и добавляем ранги
    const stagesMap = new Map();
    rows.forEach(row => {
      if (!stagesMap.has(row.stage_id)) {
        stagesMap.set(row.stage_id, {
          stage_id: row.stage_id,
          stage_name: row.stage_name,
          order_index: row.order_index,
          results: []
        });
      }
      stagesMap.get(row.stage_id).results.push(row);
    });

    // Добавляем ранги для каждого этапа
    const stages = Array.from(stagesMap.values()).sort((a, b) => a.order_index - b.order_index);
    stages.forEach(stage => {
      stage.results.forEach((result, idx) => {
        result.rank = idx + 1;
      });
    });

    return stages;
  }

  // ===== Детальные результаты по этапам с личным прогрессом =====
  async getStageStandingsWithParticipants(competitionId) {
    const sql = `
      WITH stage_participant_results AS (
        SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
               t.id AS team_id, t.name AS team_name,
               p.id AS participant_id, p.full_name, p.gender, p.age,
               COALESCE(sr.penalty_points, 0) AS penalty_points,
               COALESCE(sr.time_seconds, 0) AS time_seconds
        FROM stages s
        CROSS JOIN teams t
        LEFT JOIN participants p ON p.team_id = t.id
        LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
        WHERE s.competition_id = ? AND t.competition_id = ?
        ORDER BY s.order_index, t.name, p.full_name
      )
      SELECT * FROM stage_participant_results
    `;
    const rows = this.db.prepare(sql).all(competitionId, competitionId);
    
    // Группируем по этапам и командам
    const stagesMap = new Map();
    rows.forEach(row => {
      if (!stagesMap.has(row.stage_id)) {
        stagesMap.set(row.stage_id, {
          stage_id: row.stage_id,
          stage_name: row.stage_name,
          order_index: row.order_index,
          teams: new Map()
        });
      }
      
      const stage = stagesMap.get(row.stage_id);
      if (!stage.teams.has(row.team_id)) {
        stage.teams.set(row.team_id, {
          team_id: row.team_id,
          team_name: row.team_name,
          participants: [],
          total_penalties: 0,
          total_time: 0
        });
      }
      
      const team = stage.teams.get(row.team_id);
      team.participants.push({
        participant_id: row.participant_id,
        full_name: row.full_name,
        gender: row.gender,
        age: row.age,
        penalty_points: row.penalty_points,
        time_seconds: row.time_seconds
      });
      
      team.total_penalties += row.penalty_points;
      team.total_time += row.time_seconds;
    });

    // Преобразуем Map в обычные объекты и добавляем ранги
    const stages = Array.from(stagesMap.values())
      .sort((a, b) => a.order_index - b.order_index)
      .map(stage => ({
        stage_id: stage.stage_id,
        stage_name: stage.stage_name,
        order_index: stage.order_index,
        teams: Array.from(stage.teams.values())
          .sort((a, b) => a.total_penalties - b.total_penalties || a.total_time - b.total_time)
          .map((team, teamIdx) => ({
            ...team,
            rank: teamIdx + 1,
            participants: team.participants
              .sort((a, b) => a.penalty_points - b.penalty_points || a.time_seconds - b.time_seconds)
              .map((participant, partIdx) => ({
                ...participant,
                rank: partIdx + 1
              }))
          }))
      }));

    return stages;
  }

  // ===== Личные результаты участников =====
  async getParticipantResults(competitionId) {
    const sql = `
      WITH participant_totals AS (
        SELECT p.id, p.full_name, p.gender, p.age, t.name AS team_name,
               COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
               COALESCE(SUM(sr.time_seconds), 0) AS total_time
        FROM participants p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN stage_results sr ON sr.participant_id = p.id
        WHERE t.competition_id = ?
        GROUP BY p.id
        ORDER BY total_penalties ASC, total_time ASC, p.age ASC
      )
      SELECT *, ROW_NUMBER() OVER (ORDER BY total_penalties ASC, total_time ASC, age ASC) as rank
      FROM participant_totals
    `;
    const rows = this.db.prepare(sql).all(competitionId);
    return rows;
  }

  // ===== Детальные результаты участника по этапам =====
  async getParticipantStageDetails(competitionId, participantId = null) {
    let sql, params;
    
    if (participantId) {
      // Результаты конкретного участника
      sql = `
        SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
               p.id AS participant_id, p.full_name, p.gender, p.age,
               t.name AS team_name,
               COALESCE(sr.penalty_points, 0) AS penalty_points,
               COALESCE(sr.time_seconds, 0) AS time_seconds
        FROM stages s
        CROSS JOIN participants p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
        WHERE s.competition_id = ? AND p.id = ?
        ORDER BY s.order_index
      `;
      params = [competitionId, participantId];
    } else {
      // Результаты всех участников
      sql = `
        SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
               p.id AS participant_id, p.full_name, p.gender, p.age,
               t.name AS team_name,
               COALESCE(sr.penalty_points, 0) AS penalty_points,
               COALESCE(sr.time_seconds, 0) AS time_seconds
        FROM stages s
        CROSS JOIN participants p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
        WHERE s.competition_id = ?
        ORDER BY s.order_index, t.name, p.full_name
      `;
      params = [competitionId];
    }
    
    const rows = this.db.prepare(sql).all(...params);
    return rows;
  }

  // Миграция таблицы stages - добавление колонки order_index
  async migrateStagesTable() {
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(stages)").all();
      const hasOrderIndex = tableInfo.some(col => col.name === 'order_index');

      if (!hasOrderIndex) {
        console.log("🔄 Добавляем колонку order_index в таблицу stages...");
        this.db.prepare("ALTER TABLE stages ADD COLUMN order_index INTEGER DEFAULT 0").run();
        this.db.prepare("UPDATE stages SET order_index = id WHERE order_index = 0").run();
        console.log("✅ Колонка order_index добавлена в таблицу stages");
      }
    } catch (error) {
      console.error("❌ Ошибка миграции таблицы stages:", error.message);
    }
  }

  // Миграция данных из JSON файла (если существует) — отключено для конкурсов
  async migrateFromJson() {
    // Зарезервировано под будущую миграцию, сейчас не используется
    return;
  }

  // Заполнение тестовыми данными из testing.json
  async seedTestData() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Путь к файлу testing.json
      const testingDataPath = path.join(__dirname, '..', 'testing.json');
      
      if (!fs.existsSync(testingDataPath)) {
        console.log('📄 Файл testing.json не найден, пропускаем заполнение тестовыми данными');
        return;
      }

      const testingData = JSON.parse(fs.readFileSync(testingDataPath, 'utf8'));
      
      // Создаем тестовое соревнование
      const competition = await this.createCompetition({
        name: 'Областной конкурс "Безопасное колесо - 2024"',
        description: 'Тестовые данные из testing.json',
        emoji: '🏆'
      });

      console.log(`✅ Создано соревнование: ${competition.name}`);

      // Создаем этапы на основе ключей из JSON
      const stages = Object.keys(testingData);
      const createdStages = [];
      
      for (let i = 0; i < stages.length; i++) {
        const stage = await this.createStage(competition.id, {
          name: stages[i],
          order_index: i + 1
        });
        createdStages.push(stage);
        console.log(`✅ Создан этап: ${stage.name}`);
      }

      // Сначала собираем все команды и участников из всех этапов
      const allTeamsData = {};
      const allParticipants = {};

      for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
        const stageName = stages[stageIndex];
        const stageData = testingData[stageName];
        const currentStage = createdStages[stageIndex];

        // Группируем участников по командам для текущего этапа
        const teamsData = {};
        let currentTeam = null;

        for (const row of stageData) {
          const firstColumnKey = Object.keys(row)[0];
          const firstColumnValue = row[firstColumnKey];
          
          // Если есть название команды в первой колонке (не заголовок и не пустое)
          if (firstColumnValue && 
              firstColumnValue !== 'Команда' && 
              firstColumnValue !== 'ФИ участника' &&
              (firstColumnValue.includes('ГО') || firstColumnValue.includes('МО'))) {
            currentTeam = firstColumnValue;
            if (!teamsData[currentTeam]) {
              teamsData[currentTeam] = [];
            }
            console.log(`🔍 Найдена команда: ${currentTeam}`);
          }
          // Если есть данные участника (есть Column2 с именем)
          else if (row['Column2'] && 
                   row['Column2'] !== 'ФИ участника' && 
                   row['Column2'] !== 'Команда' &&
                   currentTeam) {
            teamsData[currentTeam].push({
              name: row['Column2'],
              gender: row['Column3'],
              time: row['Column4'],
              penalties: row['Column5'],
              stage_id: currentStage.id
            });
            console.log(`  👤 Участник: ${row['Column2']} (${row['Column3']}, ${row['Column4']}, ${row['Column5']} штрафов)`);
          }
        }

        // Объединяем данные команд
        for (const [teamName, participants] of Object.entries(teamsData)) {
          if (participants.length === 0) continue;

          if (!allTeamsData[teamName]) {
            allTeamsData[teamName] = [];
          }

          // Добавляем участников команды для текущего этапа
          for (const participant of participants) {
            if (participant.name === 'ОТСУТСТВУЕТ') continue;

            const participantKey = `${teamName}_${participant.name}`;
            if (!allParticipants[participantKey]) {
              allParticipants[participantKey] = {
                name: participant.name,
                gender: participant.gender,
                teamName: teamName,
                results: {}
              };
            }

            // Добавляем результат для текущего этапа
            allParticipants[participantKey].results[participant.stage_id] = {
              time: participant.time,
              penalties: participant.penalties
            };
          }
        }
      }

      // Создаем команды
      const createdTeams = {};
      for (const teamName of Object.keys(allTeamsData)) {
        const team = await this.createTeam(competition.id, teamName);
        createdTeams[teamName] = team;
        console.log(`✅ Создана команда: ${team.name}`);
      }

      // Создаем участников и их результаты
      for (const [participantKey, participantData] of Object.entries(allParticipants)) {
        const team = createdTeams[participantData.teamName];
        if (!team) continue;

        // Создаем участника
        const createdParticipant = await this.createParticipant(team.id, {
          full_name: participantData.name.trim(),
          gender: participantData.gender === 'м' ? 'М' : 'Ж',
          age: Math.floor(Math.random() * 3) + 10 // Случайный возраст 10-12 лет
        });

        console.log(`✅ Создан участник: ${createdParticipant.full_name}`);

        // Создаем результаты для каждого этапа
        for (const [stageId, result] of Object.entries(participantData.results)) {
          const timeInSeconds = this.parseTimeToSeconds(result.time);
          
          if (timeInSeconds > 0 || result.penalties > 0) {
            await this.upsertStageResult(parseInt(stageId), createdParticipant.id, {
              time_seconds: timeInSeconds,
              penalty_points: result.penalties || 0
            });
            console.log(`  📊 Результат для этапа ${stageId}: ${result.time}, ${result.penalties} штрафов`);
          }
        }
      }

      console.log('🎉 Тестовые данные успешно загружены!');
      return competition.id;
    } catch (error) {
      console.error('❌ Ошибка загрузки тестовых данных:', error.message);
      throw error;
    }
  }

  // Парсинг времени из формата "14:54" (минуты:секунды) в секунды
  parseTimeToSeconds(timeStr) {
    if (!timeStr || timeStr === '00:00') return 0;
    
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return minutes * 60 + seconds;
  }

  // Форматирование времени из секунд в формат "ММ:СС"
  formatTime(seconds) {
    if (!seconds || seconds === 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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

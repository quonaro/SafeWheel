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
        } else if (
          process.env.ARGV0 &&
          !process.env.ARGV0.includes("/tmp/.mount_")
        ) {
          // Fallback на ARGV0 если это не временный путь
          exeDir = path.dirname(process.env.ARGV0);
        } else {
          // Обычный путь к исполняемому файлу
          exeDir = app
            ? path.dirname(app.getPath("exe"))
            : path.dirname(process.execPath);
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
      }

      this.db = new Database(this.dbPath, {
        // Оптимизации для better-sqlite3
        verbose: null,
        // Включаем WAL режим для лучшей производительности
        pragma: {
          journal_mode: 'WAL',
          synchronous: 'NORMAL',
          cache_size: -64000, // 64MB кэш
          temp_store: 'MEMORY',
          mmap_size: 134217728, // 128MB memory-mapped I/O
          page_size: 4096
        }
      });

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

        // Базовые индексы
        `CREATE INDEX IF NOT EXISTS idx_teams_competition ON teams(competition_id)`,
        `CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id)`,
        `CREATE INDEX IF NOT EXISTS idx_stages_competition ON stages(competition_id)`,
        `CREATE INDEX IF NOT EXISTS idx_results_stage ON stage_results(stage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_results_participant ON stage_results(participant_id)`,
        
        // Составные индексы для оптимизации сложных запросов
        // idx_stages_competition_order будет создан после миграции
        `CREATE INDEX IF NOT EXISTS idx_participants_team_competition ON participants(team_id)`,
        `CREATE INDEX IF NOT EXISTS idx_results_stage_participant ON stage_results(stage_id, participant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_results_participant_stage ON stage_results(participant_id, stage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_teams_competition_name ON teams(competition_id, name)`,
        
        // Индексы для сортировки и группировки
        `CREATE INDEX IF NOT EXISTS idx_participants_age ON participants(age)`,
        `CREATE INDEX IF NOT EXISTS idx_participants_gender ON participants(gender)`,
        `CREATE INDEX IF NOT EXISTS idx_results_penalties ON stage_results(penalty_points)`,
        `CREATE INDEX IF NOT EXISTS idx_results_time ON stage_results(time_seconds)`,
      ];

      this.db.exec(ddl.join(";"));

      // Миграция: добавляем поле emoji если его нет
      try {
        this.db.exec(
          "ALTER TABLE competitions ADD COLUMN emoji TEXT DEFAULT '🏆'"
        );
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
      } catch (e) {
        // Поле уже существует, игнорируем ошибку
        if (!e.message.includes("duplicate column name")) {
          console.warn(
            "⚠️ Предупреждение при добавлении поля description:",
            e.message
          );
        }
      }

      
      // Выполняем миграции
      await this.migrateStagesTable();
      
      // Создаем индекс после миграции
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_stages_competition_order ON stages(competition_id, order_index)`);
      
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

  // ===== Итоги по соревнованию (ОПТИМИЗИРОВАННАЯ ВЕРСИЯ) =====
  // Сумма штрафных баллов и времени по всем этапам; при равенстве — по среднему возрасту команды (меньше — выше)
  // Команды с меньшим количеством участников ставятся на последние места
  async computeStandings(competitionId) {
    const sql = `
      WITH team_aggregates AS (
        SELECT 
          t.id AS team_id, 
          t.name AS team_name,
          (SELECT COUNT(*) FROM participants p WHERE p.team_id = t.id) AS participant_count,
          (SELECT AVG(p.age) FROM participants p WHERE p.team_id = t.id) AS avg_age,
          COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
          COALESCE(SUM(sr.time_seconds), 0) AS total_time
        FROM teams t
        LEFT JOIN participants p ON p.team_id = t.id
        LEFT JOIN stage_results sr ON sr.participant_id = p.id
        LEFT JOIN stages s ON s.id = sr.stage_id AND s.competition_id = ?
        WHERE t.competition_id = ?
        GROUP BY t.id, t.name
      ),
      max_participants AS (
        SELECT MAX(participant_count) AS max_count
        FROM team_aggregates
      )
      SELECT 
        ta.team_id, 
        ta.team_name,
        ta.participant_count,
        ta.total_penalties, 
        ta.total_time, 
        ta.avg_age,
        CASE 
          WHEN ta.participant_count < mp.max_count THEN 1 
          ELSE 0 
        END AS is_incomplete_team
      FROM team_aggregates ta
      CROSS JOIN max_participants mp
      ORDER BY 
        is_incomplete_team ASC,  -- Полные команды сначала
        total_penalties ASC, 
        total_time ASC, 
        avg_age ASC
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

  // ===== Детальные результаты по этапам с личным прогрессом (СУПЕР ОПТИМИЗИРОВАННАЯ ВЕРСИЯ) =====
  async getStageStandingsWithParticipants(competitionId) {
    // Используем один оптимизированный запрос вместо двух CTE с дублированием параметров
    const sql = `
      WITH competition_data AS (
        SELECT 
          s.id AS stage_id, 
          s.name AS stage_name, 
          s.order_index,
          t.id AS team_id, 
          t.name AS team_name,
          p.id AS participant_id,
          p.full_name,
          p.gender,
          p.age,
          COALESCE(sr.penalty_points, 0) AS penalty_points,
          COALESCE(sr.time_seconds, 0) AS time_seconds
        FROM stages s
        CROSS JOIN teams t
        LEFT JOIN participants p ON p.team_id = t.id
        LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
        WHERE s.competition_id = ? AND t.competition_id = ?
      ),
      team_aggregates AS (
        SELECT 
          stage_id,
          stage_name,
          order_index,
          team_id,
          team_name,
          COALESCE(SUM(penalty_points), 0) AS team_total_penalties,
          COALESCE(SUM(time_seconds), 0) AS team_total_time,
          COUNT(participant_id) AS participant_count
        FROM competition_data
        GROUP BY stage_id, stage_name, order_index, team_id, team_name
      )
      SELECT 
        ta.stage_id,
        ta.stage_name,
        ta.order_index,
        ta.team_id,
        ta.team_name,
        ta.team_total_penalties,
        ta.team_total_time,
        ta.participant_count,
        cd.participant_id,
        cd.full_name,
        cd.gender,
        cd.age,
        cd.penalty_points,
        cd.time_seconds
      FROM team_aggregates ta
      LEFT JOIN competition_data cd ON cd.stage_id = ta.stage_id AND cd.team_id = ta.team_id
      ORDER BY ta.order_index, ta.team_total_penalties, ta.team_total_time, cd.full_name
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
          total_penalties: row.team_total_penalties,
          total_time: row.team_total_time
        });
      }
      
      const team = stage.teams.get(row.team_id);
      if (row.participant_id) {
        team.participants.push({
          participant_id: row.participant_id,
          full_name: row.full_name,
          gender: row.gender,
          age: row.age,
          penalty_points: row.penalty_points,
          time_seconds: row.time_seconds
        });
      }
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

  // ===== Личные результаты участников (с пагинацией) =====
  async getParticipantResults(competitionId, options = {}) {
    const { page = 1, limit = 50, offset = null } = options;
    const actualOffset = offset !== null ? offset : (page - 1) * limit;
    
    const sql = `
      WITH participant_totals AS (
        SELECT p.id, p.full_name, p.gender, p.age, t.name AS team_name,
               (SELECT COUNT(*) FROM participants p2 WHERE p2.team_id = t.id) AS team_participant_count,
               COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
               COALESCE(SUM(sr.time_seconds), 0) AS total_time
        FROM participants p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN stage_results sr ON sr.participant_id = p.id
        LEFT JOIN stages s ON s.id = sr.stage_id AND s.competition_id = ?
        WHERE t.competition_id = ?
        GROUP BY p.id, p.full_name, p.gender, p.age, t.name
      ),
      max_team_participants AS (
        SELECT MAX(team_participant_count) AS max_count
        FROM participant_totals
      ),
      ranked_participants AS (
        SELECT pt.*, mp.max_count,
               CASE 
                 WHEN pt.team_participant_count < mp.max_count THEN 1 
                 ELSE 0 
               END AS is_incomplete_team,
               ROW_NUMBER() OVER (
                 ORDER BY 
                   CASE WHEN pt.team_participant_count < mp.max_count THEN 1 ELSE 0 END ASC,
                   total_penalties ASC, 
                   total_time ASC, 
                   age ASC
               ) as rank
        FROM participant_totals pt
        CROSS JOIN max_team_participants mp
      )
      SELECT id, full_name, gender, age, team_name, total_penalties, total_time, rank
      FROM ranked_participants
      LIMIT ? OFFSET ?
    `;
    
    return this.db.prepare(sql).all(competitionId, competitionId, limit, actualOffset);
  }

  // ===== Подсчет общего количества участников =====
  async getParticipantResultsCount(competitionId) {
    const sql = `
      SELECT COUNT(DISTINCT p.id) as count
      FROM participants p
      JOIN teams t ON t.id = p.team_id
      WHERE t.competition_id = ?
    `;
    
    const result = this.db.prepare(sql).get(competitionId);
    return result.count;
  }

  // ===== Отладочная функция для проверки результатов участника по этапам =====
  async getParticipantStageResults(competitionId, participantName) {
    const sql = `
      SELECT 
        p.full_name,
        s.name as stage_name,
        s.id as stage_id,
        sr.time_seconds,
        sr.penalty_points,
        CASE 
          WHEN sr.time_seconds IS NOT NULL 
          THEN printf('%02d:%02d', sr.time_seconds / 60, sr.time_seconds % 60)
          ELSE 'Нет результата'
        END as time_display
      FROM participants p
      JOIN teams t ON t.id = p.team_id
      LEFT JOIN stage_results sr ON sr.participant_id = p.id
      LEFT JOIN stages s ON s.id = sr.stage_id
      WHERE t.competition_id = ? AND p.full_name LIKE ?
      ORDER BY s.id
    `;
    
    return this.db.prepare(sql).all(competitionId, `%${participantName}%`);
  }

  // ===== Оптимизированная загрузка участников с результатами (решение N+1 проблемы) =====
  async getParticipantsWithResults(competitionId, stageId = null) {
    let sql, params;
    
    if (stageId) {
      // Участники с результатами для конкретного этапа
      sql = `
        SELECT 
          p.id AS participant_id,
          p.full_name,
          p.gender,
          p.age,
          t.id AS team_id,
          t.name AS team_name,
          COALESCE(sr.time_seconds, 0) AS time_seconds,
          COALESCE(sr.penalty_points, 0) AS penalty_points
        FROM participants p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
        WHERE t.competition_id = ?
        ORDER BY t.name, p.full_name
      `;
      params = [stageId, competitionId];
    } else {
      // Все участники соревнования
      sql = `
        SELECT 
          p.id AS participant_id,
          p.full_name,
          p.gender,
          p.age,
          t.id AS team_id,
          t.name AS team_name
        FROM participants p
        JOIN teams t ON t.id = p.team_id
        WHERE t.competition_id = ?
        ORDER BY t.name, p.full_name
      `;
      params = [competitionId];
    }
    
    return this.db.prepare(sql).all(...params);
  }

  // ===== Детальные результаты участника по этапам (ОПТИМИЗИРОВАННАЯ ВЕРСИЯ) =====
  async getParticipantStageDetails(competitionId, participantId = null) {
    let sql, params;
    
    if (participantId) {
      // Результаты конкретного участника - оптимизированный запрос
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
      // Результаты всех участников - оптимизированный запрос
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

  // ===== НОВЫЕ ОПТИМИЗИРОВАННЫЕ МЕТОДЫ =====

  // Получение всех данных соревнования одним запросом (решение N+1)
  async getCompetitionData(competitionId) {
    const sql = `
      WITH competition_info AS (
        SELECT c.*, 
               COUNT(DISTINCT t.id) as team_count,
               COUNT(DISTINCT p.id) as participant_count,
               COUNT(DISTINCT s.id) as stage_count
        FROM competitions c
        LEFT JOIN teams t ON t.competition_id = c.id
        LEFT JOIN participants p ON p.team_id = t.id
        LEFT JOIN stages s ON s.competition_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
      ),
      teams_data AS (
        SELECT t.*, 
               COUNT(p.id) as participant_count,
               AVG(p.age) as avg_age
        FROM teams t
        LEFT JOIN participants p ON p.team_id = t.id
        WHERE t.competition_id = ?
        GROUP BY t.id
      ),
      stages_data AS (
        SELECT s.*, 
               COUNT(sr.id) as result_count
        FROM stages s
        LEFT JOIN stage_results sr ON sr.stage_id = s.id
        WHERE s.competition_id = ?
        GROUP BY s.id
      )
      SELECT 
        ci.*,
        json_group_array(
          json_object(
            'id', td.id,
            'name', td.name,
            'participant_count', td.participant_count,
            'avg_age', td.avg_age,
            'created_at', td.created_at,
            'updated_at', td.updated_at
          )
        ) as teams,
        json_group_array(
          json_object(
            'id', sd.id,
            'name', sd.name,
            'order_index', sd.order_index,
            'result_count', sd.result_count,
            'created_at', sd.created_at,
            'updated_at', sd.updated_at
          )
        ) as stages
      FROM competition_info ci
      LEFT JOIN teams_data td ON td.competition_id = ci.id
      LEFT JOIN stages_data sd ON sd.competition_id = ci.id
      GROUP BY ci.id
    `;
    
    const result = this.db.prepare(sql).get(competitionId, competitionId, competitionId);
    
    if (result) {
      result.teams = JSON.parse(result.teams || '[]');
      result.stages = JSON.parse(result.stages || '[]');
    }
    
    return result;
  }

  // Получение результатов всех участников по всем этапам одним запросом
  async getAllParticipantResults(competitionId) {
    const sql = `
      SELECT 
        p.id AS participant_id,
        p.full_name,
        p.gender,
        p.age,
        t.id AS team_id,
        t.name AS team_name,
        s.id AS stage_id,
        s.name AS stage_name,
        s.order_index,
        COALESCE(sr.penalty_points, 0) AS penalty_points,
        COALESCE(sr.time_seconds, 0) AS time_seconds
      FROM participants p
      JOIN teams t ON t.id = p.team_id
      CROSS JOIN stages s
      LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
      WHERE t.competition_id = ? AND s.competition_id = ?
      ORDER BY s.order_index, t.name, p.full_name
    `;
    
    return this.db.prepare(sql).all(competitionId, competitionId);
  }

  // Получение статистики соревнования одним запросом
  async getCompetitionStats(competitionId) {
    const sql = `
      WITH team_stats AS (
        SELECT 
          COUNT(DISTINCT t.id) as total_teams,
          COUNT(DISTINCT p.id) as total_participants,
          AVG(team_participant_count) as avg_participants_per_team,
          MAX(team_participant_count) as max_participants_per_team,
          MIN(team_participant_count) as min_participants_per_team
        FROM teams t
        LEFT JOIN (
          SELECT team_id, COUNT(*) as team_participant_count
          FROM participants
          GROUP BY team_id
        ) pc ON pc.team_id = t.id
        LEFT JOIN participants p ON p.team_id = t.id
        WHERE t.competition_id = ?
      ),
      stage_stats AS (
        SELECT 
          COUNT(DISTINCT s.id) as total_stages,
          COUNT(DISTINCT sr.id) as total_results,
          AVG(sr.time_seconds) as avg_time,
          MIN(sr.time_seconds) as best_time,
          MAX(sr.time_seconds) as worst_time,
          AVG(sr.penalty_points) as avg_penalties
        FROM stages s
        LEFT JOIN stage_results sr ON sr.stage_id = s.id
        WHERE s.competition_id = ?
      )
      SELECT 
        ts.*,
        ss.*
      FROM team_stats ts
      CROSS JOIN stage_stats ss
    `;
    
    return this.db.prepare(sql).get(competitionId, competitionId);
  }

  // Миграция таблицы stages - добавление колонки order_index
  async migrateStagesTable() {
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(stages)").all();
      const hasOrderIndex = tableInfo.some(col => col.name === 'order_index');

      if (!hasOrderIndex) {
        this.db.prepare("ALTER TABLE stages ADD COLUMN order_index INTEGER DEFAULT 0").run();
        this.db.prepare("UPDATE stages SET order_index = id WHERE order_index = 0").run();
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
    }
  }
}

module.exports = DatabaseManager;

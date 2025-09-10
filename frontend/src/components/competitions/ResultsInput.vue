<template>
  <div class="results-input-container">
    <el-row :gutter="12" class="mb-12">
      <el-col :span="8">
        <el-select v-model="stageId" placeholder="Выберите этап" style="width: 100%">
          <el-option v-for="s in stages" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-col>
      <el-col :span="8">
        <el-input v-model="searchQuery" placeholder="Поиск по участнику" style="width: 100%" clearable
          @input="filterResults">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
      </el-col>
      <el-col :span="8">
        <el-select v-model="selectedTeamId" placeholder="Все команды" style="width: 100%" @change="filterResults"
          clearable>
          <el-option label="Все команды" :value="null" />
          <el-option v-for="t in teams" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
      </el-col>
    </el-row>

    <div class="results-container">
      <div v-if="groupedParticipants.length === 0" class="empty-state">
        <p>Нет данных для отображения</p>
      </div>
      
      <div v-else class="teams-groups">
        <div v-for="team in groupedParticipants" :key="team.teamId" class="team-group">
          <div class="team-header">
            <h3 class="team-title">{{ team.teamName }}</h3>
            <span class="participants-count">{{ team.participants.length }} участников</span>
          </div>
          
          <div class="team-participants">
            <el-table :data="team.participants" style="width:100%"
              :class="['modern-table', 'team-table']"
              :show-header="true">
              <el-table-column prop="full_name" label="Участник" :min-width="150">
                <template #default="scope">
                  <div class="participant-cell">
                    <span class="participant-name">{{ scope.row.full_name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="age" label="Возраст" :width="100">
                <template #default="scope">
                  <div class="age-cell">
                    <span class="age-text">{{ scope.row.age || '—' }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="Время" :width="120">
                <template #default="scope">
                  <div class="input-cell">
                    <el-input v-model="scope.row.time_display" @change="handleTimeChange(scope.row)"
                      size="small" class="time-input" placeholder="00:00" />
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="Штрафные баллы" :width="140">
                <template #default="scope">
                  <div class="input-cell">
                    <el-input-number v-model="scope.row.penalty_points" :min="0" :step="1" @change="debouncedSave(scope.row)"
                      size="small" class="penalty-input" />
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const stages = ref([])
const teams = ref([])
const stageId = ref(null)
const selectedTeamId = ref(null)
const searchQuery = ref('')
const rows = ref([])

const loadStages = async () => {
  if (!props.competitionId) { stages.value = []; return }
  stages.value = await api.listStages(props.competitionId)
  if (stages.value.length && !stageId.value) stageId.value = stages.value[0].id
}

const loadTeams = async () => {
  if (!props.competitionId) { teams.value = []; return }
  teams.value = await api.listTeams(props.competitionId)
}

// Функция форматирования времени из секунд в формат ММ:СС
const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '00:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Функция парсинга времени из формата ММ:СС в секунды
const parseTimeToSeconds = (timeStr) => {
  if (!timeStr || timeStr === '00:00') return 0
  
  const parts = timeStr.split(':')
  if (parts.length !== 2) return 0
  
  const minutes = parseInt(parts[0]) || 0
  const seconds = parseInt(parts[1]) || 0
  
  return minutes * 60 + seconds
}

const loadRows = async () => {
  if (!stageId.value) { rows.value = []; return }
  // Все участники соревнования по командам
  const teamsData = await api.listTeams(props.competitionId)
  const participantRows = []
  for (const t of teamsData) {
    const participants = await api.listParticipants(t.id)
    for (const p of participants) {
      participantRows.push({
        participant_id: p.id,
        team_id: t.id,
        team_name: t.name,
        full_name: p.full_name,
        age: p.age,
        time_seconds: 0,
        time_display: '00:00',
        penalty_points: 0
      })
    }
  }
  const existing = await api.getStageResults(stageId.value)
  for (const r of existing) {
    const idx = participantRows.findIndex(x => x.participant_id === r.participant_id)
    if (idx >= 0) {
      participantRows[idx].time_seconds = r.time_seconds
      participantRows[idx].time_display = formatTime(r.time_seconds)
      participantRows[idx].penalty_points = r.penalty_points
    }
  }
  rows.value = participantRows
}


// Фильтрация результатов по команде и поисковому запросу
const filteredRows = computed(() => {
  let filtered = rows.value

  // Фильтр по команде
  if (selectedTeamId.value) {
    filtered = filtered.filter(row => row.team_id === selectedTeamId.value)
  }

  // Фильтр по поисковому запросу (только по участникам)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(row =>
      row.full_name.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Группировка участников по командам
const groupedParticipants = computed(() => {
  const groups = new Map()
  
  filteredRows.value.forEach(participant => {
    const teamName = participant.team_name
    if (!groups.has(teamName)) {
      groups.set(teamName, {
        teamName: teamName,
        teamId: participant.team_id,
        participants: []
      })
    }
    groups.get(teamName).participants.push(participant)
  })
  
  return Array.from(groups.values())
})

const filterResults = () => {
  // Фильтрация происходит автоматически через computed
}

watch(() => props.competitionId, () => {
  loadStages()
  loadTeams()
}, { immediate: true })
watch(stageId, () => loadRows(), { immediate: true })

// Обработка изменения времени
const handleTimeChange = (row) => {
  // Валидация формата ММ:СС
  const timeRegex = /^([0-5]?[0-9]):([0-5][0-9])$/
  if (!timeRegex.test(row.time_display)) {
    // Если формат неверный, возвращаем к предыдущему значению
    row.time_display = formatTime(row.time_seconds)
    return
  }
  
  // Конвертируем в секунды
  row.time_seconds = parseTimeToSeconds(row.time_display)
  
  // Сохраняем
  debouncedSave(row)
}

let timer = null
const debouncedSave = (row) => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    await api.upsertStageResult(stageId.value, row.participant_id, { time_seconds: row.time_seconds, penalty_points: row.penalty_points })
  }, 300)
}
</script>

<style scoped>
/* Контейнер для растягивания на всю высоту */
.results-input-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Современные стили для таблицы результатов */
.modern-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-height: 200px;
  width: 100%;
}

/* Стили для пустого состояния */
.modern-table :deep(.el-table__empty-block) {
  height: 200px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(248, 250, 252, 0.5);
}

/* Ограничиваем ширину таблицы когда нет данных */
.empty-table {
  min-width: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

.empty-table .table-scroll {
  min-width: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

/* Принудительно ограничиваем ширину через deep селекторы */
.empty-table :deep(.el-table) {
  min-width: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

.empty-table :deep(.el-table__header-wrapper) {
  min-width: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

.empty-table :deep(.el-table__body-wrapper) {
  min-width: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

.empty-table :deep(.el-table__header) {
  min-width: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

.empty-table :deep(.el-table__body) {
  min-width: auto !important;
  max-width: 100% !important;
  width: auto !important;
}

.empty-table :deep(.el-table__empty-block) {
  min-width: auto !important;
  max-width: 100% !important;
  width: 100% !important;
}

.modern-table :deep(.el-table__empty-text) {
  color: #6b7280;
  font-size: 16px;
  font-weight: 500;
}

.modern-table :deep(.el-table__header) {
  background: #f3f4f6;
  color: #111827;
}

.modern-table :deep(.el-table__header th) {
  background: #f3f4f6;
  color: #111827;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 12px;
  border: none;
}

.modern-table :deep(.el-table__body tr) {
  transition: all 0.3s ease;
}

.modern-table :deep(.el-table__body tr:hover) {
  background: rgba(59, 130, 246, 0.05);
}

.modern-table :deep(.el-table__body td) {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* Стили для ячеек */
.team-cell {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  min-height: 20px;
}

.team-name {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.participant-cell {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  min-height: 20px;
}

.participant-name {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.age-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  min-height: 20px;
}

.age-text {
  font-weight: 500;
  color: #6b7280;
  font-size: 14px;
}

.input-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
}

/* Контейнер результатов */
.results-container {
  width: 100%;
  max-width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  min-height: 400px;
}

/* Группы команд */
.teams-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Группа команды */
.team-group {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* Заголовок команды */
.team-header {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.team-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.participants-count {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
}

/* Участники команды */
.team-participants {
  padding: 0;
}

.team-table {
  border-radius: 0;
  box-shadow: none;
  border: none;
}

.team-table :deep(.el-table__header) {
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.team-table :deep(.el-table__header th) {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  font-size: 14px;
  padding: 12px 16px;
  border: none;
}

.team-table :deep(.el-table__body tr) {
  transition: all 0.3s ease;
}

.team-table :deep(.el-table__body tr:hover) {
  background: rgba(59, 130, 246, 0.05);
}

.team-table :deep(.el-table__body td) {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.team-table :deep(.el-table__body tr:last-child td) {
  border-bottom: none;
}

/* Пустое состояние */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* Стилизация скроллбара */
.results-container::-webkit-scrollbar,
.table-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.results-container::-webkit-scrollbar-track,
.table-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.results-container::-webkit-scrollbar-thumb,
.table-scroll::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.results-container::-webkit-scrollbar-thumb:hover,
.table-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
}

.results-container::-webkit-scrollbar-corner,
.table-scroll::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0.05);
}

.modern-table :deep(.cell) {
  white-space: normal;
  word-break: break-word;
}

/* Обеспечиваем растягивание таблицы по родительскому элементу */
.modern-table :deep(.el-table) {
  width: 100% !important;
}

.modern-table :deep(.el-table__header-wrapper) {
  width: 100%;
}

.modern-table :deep(.el-table__body-wrapper) {
  width: 100%;
}

.modern-table :deep(.el-table__header) {
  width: 100%;
}

.modern-table :deep(.el-table__body) {
  width: 100%;
}

.time-input :deep(.el-input__inner) {
  background: transparent;
  border: none;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  color: #059669;
  font-family: 'Courier New', monospace;
  box-shadow: none;
}

.time-input :deep(.el-input__inner:focus) {
  border: none;
  box-shadow: none;
  outline: none;
}

.penalty-input :deep(.el-input-number__input) {
  background: transparent;
  border: none;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  color: #dc2626;
  box-shadow: none;
}

.penalty-input :deep(.el-input-number__input:focus) {
  border: none;
  box-shadow: none;
  outline: none;
}

/* Адаптивность */
@media (max-width: 768px) {
  .teams-groups {
    gap: 16px;
  }

  .team-header {
    padding: 12px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .team-title {
    font-size: 16px;
  }

  .participants-count {
    font-size: 12px;
    padding: 3px 8px;
  }

  .team-table :deep(.el-table__header th),
  .team-table :deep(.el-table__body td) {
    padding: 8px 6px;
    font-size: 13px;
  }

  .participant-cell {
    padding: 2px 4px;
  }

  .participant-name {
    font-size: 12px;
  }

  .results-container {
    max-height: 500px;
  }
}
</style>

<template>
  <div>
    <el-row :gutter="12" class="mb-12">
      <el-col :span="8">
        <el-select v-model="stageId" placeholder="Выберите этап" style="width: 100%" @change="loadResults">
          <el-option v-for="s in stages" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-col>
      <el-col :span="8">
        <el-select v-model="selectedTeamId" placeholder="Все команды" style="width: 100%" @change="filterResults"
          clearable>
          <el-option label="Все команды" :value="null" />
          <el-option v-for="t in teams" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
      </el-col>
      <el-col :span="8" class="text-right">
        <el-button type="primary" @click="loadResults">
          <el-icon>
            <Refresh />
          </el-icon>
          Обновить
        </el-button>
      </el-col>
    </el-row>

    <div class="table-scroll">
      <el-table :data="filteredRows" style="width:100%" class="modern-table">
        <el-table-column prop="team_name" label="Команда" width="220">
          <template #default="scope">
            <div class="team-cell">
              <span class="team-name">{{ scope.row.team_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="full_name" label="Участник">
          <template #default="scope">
            <div class="participant-cell">
              <span class="participant-name">{{ scope.row.full_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Время (сек)" width="160">
          <template #default="scope">
            <div class="input-cell">
              <el-input-number v-model="scope.row.time_seconds" :min="0" :step="0.1" @change="debouncedSave(scope.row)"
                size="small" class="time-input" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Штрафные баллы" width="180">
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
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const stages = ref([])
const teams = ref([])
const stageId = ref(null)
const selectedTeamId = ref(null)
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
        time_seconds: 0,
        penalty_points: 0
      })
    }
  }
  const existing = await api.getStageResults(stageId.value)
  for (const r of existing) {
    const idx = participantRows.findIndex(x => x.participant_id === r.participant_id)
    if (idx >= 0) Object.assign(participantRows[idx], { time_seconds: r.time_seconds, penalty_points: r.penalty_points })
  }
  rows.value = participantRows
}

const loadResults = async () => {
  await loadRows()
}

// Фильтрация результатов по команде
const filteredRows = computed(() => {
  if (!selectedTeamId.value) return rows.value
  return rows.value.filter(row => row.team_id === selectedTeamId.value)
})

const filterResults = () => {
  // Фильтрация происходит автоматически через computed
}

watch(() => props.competitionId, () => {
  loadStages()
  loadTeams()
}, { immediate: true })
watch(stageId, () => loadRows(), { immediate: true })

let timer = null
const debouncedSave = (row) => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    await api.upsertStageResult(stageId.value, row.participant_id, { time_seconds: row.time_seconds, penalty_points: row.penalty_points })
  }, 300)
}
</script>

<style scoped>
/* Современные стили для таблицы результатов */
.modern-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  padding: 16px 12px;
  border: none;
}

.modern-table :deep(.el-table__body tr) {
  transition: all 0.3s ease;
}

.modern-table :deep(.el-table__body tr:hover) {
  background: rgba(59, 130, 246, 0.05);
}

.modern-table :deep(.el-table__body td) {
  padding: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* Стили для ячеек */
.team-cell {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.team-name {
  font-weight: 600;
  color: #1e40af;
  font-size: 14px;
}

.participant-cell {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.participant-name {
  font-weight: 500;
  color: #059669;
  font-size: 14px;
}

.input-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.table-scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 800px;
}

.modern-table :deep(.cell) {
  white-space: normal;
  word-break: break-word;
}

.time-input :deep(.el-input-number__input) {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  color: #1e40af;
}

.time-input :deep(.el-input-number__input:focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.penalty-input :deep(.el-input-number__input) {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  color: #dc2626;
}

.penalty-input :deep(.el-input-number__input:focus) {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

/* Адаптивность */
@media (max-width: 768px) {

  .modern-table :deep(.el-table__header th),
  .modern-table :deep(.el-table__body td) {
    padding: 8px 6px;
    font-size: 13px;
  }

  .team-cell,
  .participant-cell {
    padding: 2px 4px;
  }

  .team-name,
  .participant-name {
    font-size: 12px;
  }

  .table-scroll {
    min-width: 100%;
  }
}
</style>

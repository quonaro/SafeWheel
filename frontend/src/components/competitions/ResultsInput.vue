<template>
  <div>
    <el-row :gutter="12" class="mb-12">
      <el-col :span="8">
        <el-select v-model="stageId" placeholder="Выберите этап" style="width: 100%" @change="loadResults">
          <el-option v-for="s in stages" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-col>
      <el-col :span="8">
        <el-select v-model="selectedTeamId" placeholder="Все команды" style="width: 100%" @change="filterResults" clearable>
          <el-option label="Все команды" :value="null" />
          <el-option v-for="t in teams" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
      </el-col>
      <el-col :span="8" class="text-right">
        <el-button type="primary" @click="loadResults">
          <el-icon><Refresh /></el-icon>
          Обновить
        </el-button>
      </el-col>
    </el-row>

    <el-table :data="filteredRows" style="width:100%">
      <el-table-column prop="team_name" label="Команда" width="220" />
      <el-table-column prop="full_name" label="Участник" />
      <el-table-column label="Время (сек)" width="140">
        <template #default="scope">
          <el-input-number v-model="scope.row.time_seconds" :min="0" :step="0.1" @change="debouncedSave(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="Штрафные баллы" width="160">
        <template #default="scope">
          <el-input-number v-model="scope.row.penalty_points" :min="0" :step="1" @change="debouncedSave(scope.row)" />
        </template>
      </el-table-column>
    </el-table>
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
/* Component-specific styles only */
</style>



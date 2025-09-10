<template>
  <div>
    <el-row :gutter="12" class="mb-12">
      <el-col :span="12">
        <el-select v-model="stageId" placeholder="Выберите этап" style="width: 100%" @change="loadResults">
          <el-option v-for="s in stages" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-col>
    </el-row>

    <el-table :data="rows" style="width:100%">
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
import { ref, watch } from 'vue'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const stages = ref([])
const stageId = ref(null)
const rows = ref([])

const loadStages = async () => {
  if (!props.competitionId) { stages.value = []; return }
  stages.value = await api.listStages(props.competitionId)
  if (stages.value.length && !stageId.value) stageId.value = stages.value[0].id
}

const loadRows = async () => {
  if (!stageId.value) { rows.value = []; return }
  // Все участники соревнования по командам
  const teams = await api.listTeams(props.competitionId)
  const participantRows = []
  for (const t of teams) {
    const participants = await api.listParticipants(t.id)
    for (const p of participants) {
      participantRows.push({ participant_id: p.id, team_name: t.name, full_name: p.full_name, time_seconds: 0, penalty_points: 0 })
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

watch(() => props.competitionId, () => loadStages(), { immediate: true })
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
.mb-12 { margin-bottom: 12px; }
</style>



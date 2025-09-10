<template>
  <div>
    <el-table :data="rows" style="width: 100%">
      <el-table-column prop="rank" label="Место" width="100" />
      <el-table-column prop="team_name" label="Команда" />
      <el-table-column prop="total_penalties" label="Штрафы" width="140" />
      <el-table-column prop="total_time" label="Время (сумма сек)" width="180" />
      <el-table-column prop="avg_age" label="Средний возраст" width="160" />
    </el-table>
    <div class="mt-8">
      <el-button type="primary" @click="load">Обновить</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const rows = ref([])

const load = async () => {
  if (!props.competitionId) { rows.value = []; return }
  rows.value = await api.computeStandings(props.competitionId)
}

watch(() => props.competitionId, () => load(), { immediate: true })
</script>

<style scoped>
/* Component-specific styles only */
</style>



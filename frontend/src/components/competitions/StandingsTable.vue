<template>
  <div>
    <div class="table-scroll">
      <el-table :data="rows" style="width: 100%" class="modern-table" :height="rows.length > 0 ? 'auto' : 200"
        empty-text="Нет данных для отображения">
        <el-table-column prop="rank" label="Место" width="100">
          <template #default="scope">
            <div class="rank-cell">
              <span class="rank-number">{{ scope.row.rank }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="team_name" label="Команда">
          <template #default="scope">
            <div class="team-cell">
              <span class="team-name">{{ scope.row.team_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_penalties" label="Штрафы" width="140">
          <template #default="scope">
            <div class="penalty-cell">
              <span class="penalty-value">{{ scope.row.total_penalties }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_time" label="Время (сумма сек)" width="180">
          <template #default="scope">
            <div class="time-cell">
              <span class="time-value">{{ scope.row.total_time }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="avg_age" label="Средний возраст" width="160">
          <template #default="scope">
            <div class="age-cell">
              <span class="age-value">{{ scope.row.avg_age }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
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
/* Современные стили для таблицы результатов */
.modern-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-height: 200px;
}

/* Стили для пустого состояния */
.modern-table :deep(.el-table__empty-block) {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(248, 250, 252, 0.5);
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
.rank-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 50%;
  background: #f59e0b;
  width: 40px;
  height: 40px;
  margin: 0 auto;
}

.rank-number {
  font-weight: 700;
  color: white;
  font-size: 16px;
}

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

.penalty-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.penalty-value {
  font-weight: 600;
  color: #dc2626;
  font-size: 14px;
}

.time-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.time-value {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.age-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.age-value {
  font-weight: 600;
  color: #7c3aed;
  font-size: 14px;
}

/* Кнопка обновления */
.mt-8 {
  margin-top: 20px;
  text-align: center;
}

.mt-8 .el-button {
  background: #1f2937;
  border: none;
  color: white;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
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

.mt-8 .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

/* Адаптивность */
@media (max-width: 768px) {

  .modern-table :deep(.el-table__header th),
  .modern-table :deep(.el-table__body td) {
    padding: 8px 6px;
    font-size: 13px;
  }

  .rank-cell {
    width: 32px;
    height: 32px;
  }

  .rank-number {
    font-size: 14px;
  }

  .team-cell,
  .penalty-cell,
  .time-cell,
  .age-cell {
    padding: 2px 4px;
  }

  .team-name,
  .penalty-value,
  .time-value,
  .age-value {
    font-size: 12px;
  }

  .table-scroll {
    min-width: 100%;
  }
}
</style>

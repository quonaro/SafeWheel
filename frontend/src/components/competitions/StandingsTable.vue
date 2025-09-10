<template>
  <div>
    <el-row :gutter="12" class="mb-12">
      <el-col :span="20">
        <h3 class="table-title">Таблица результатов</h3>
      </el-col>
      <el-col :span="4" class="text-right">
        <el-button type="primary" @click="load">
          <el-icon>
            <Refresh />
          </el-icon>
          Обновить
        </el-button>
      </el-col>
    </el-row>

    <div class="table-scroll">
      <el-table :data="rows" style="width: 100%" :class="['modern-table', { 'empty-table': rows.length === 0 }]"
        :height="rows.length > 0 ? 'auto' : 200" empty-text="Нет данных для отображения">
        <el-table-column prop="rank" label="Место" :width="rows.length > 0 ? 100 : 0">
          <template #default="scope">
            <div class="rank-cell">
              <span class="rank-number">{{ scope.row.rank }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="team_name" label="Команда" :min-width="rows.length > 0 ? 200 : 0">
          <template #default="scope">
            <div class="team-cell">
              <span class="team-name">{{ scope.row.team_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_penalties" label="Штрафы" :width="rows.length > 0 ? 140 : 0">
          <template #default="scope">
            <div class="penalty-cell">
              <span class="penalty-value">{{ scope.row.total_penalties }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_time" label="Время (сумма сек)" :width="rows.length > 0 ? 180 : 0">
          <template #default="scope">
            <div class="time-cell">
              <span class="time-value">{{ scope.row.total_time }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="avg_age" label="Средний возраст" :width="rows.length > 0 ? 160 : 0">
          <template #default="scope">
            <div class="age-cell">
              <span class="age-value">{{ scope.row.avg_age }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'

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
  width: 100%;
  min-width: 800px;
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
.rank-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 50%;
  background: #f59e0b;
  width: 36px;
  height: 36px;
  margin: 0 auto;
}

.rank-number {
  font-weight: 700;
  color: white;
  font-size: 14px;
}

.team-cell {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  min-height: 20px;
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
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  min-height: 20px;
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
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  min-height: 20px;
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
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  min-height: 20px;
}

.age-value {
  font-weight: 600;
  color: #7c3aed;
  font-size: 14px;
}

/* Заголовок таблицы */
.table-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

/* Кнопка обновления */
.text-right .el-button {
  background: #1f2937;
  border: none;
  color: white;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.table-scroll {
  width: 100%;
  max-width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 800px;
  max-height: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* Стилизация скроллбара */
.table-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.table-scroll::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.table-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
}

.table-scroll::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0.05);
}

.modern-table :deep(.cell) {
  white-space: normal;
  word-break: break-word;
}

.text-right .el-button:hover {
  background: #374151;
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

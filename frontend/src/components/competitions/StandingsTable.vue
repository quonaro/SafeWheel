<template>
  <div>
    <el-tabs v-model="activeTab" class="results-tabs">
      <el-tab-pane label="Общие результаты" name="overall">
        <div class="table-scroll">
          <el-table :data="rows" style="width: 100%" :class="['modern-table', { 'empty-table': rows.length === 0 }]"
            :height="rows.length > 0 ? 'auto' : 200" empty-text="Нет данных для отображения">
            <el-table-column prop="rank" label="Место" :width="rows.length > 0 ? 100 : 0">
              <template #default="scope">
                <div class="rank-cell" :class="{ 'is-top': [1, 2, 3].includes(scope.row.rank) }">
                  <template v-if="scope.row.rank === 1">
                    <span class="trophy gold">🥇</span>
                  </template>
                  <template v-else-if="scope.row.rank === 2">
                    <span class="trophy silver">🥈</span>
                  </template>
                  <template v-else-if="scope.row.rank === 3">
                    <span class="trophy bronze">🥉</span>
                  </template>
                  <template v-else>
                    <span class="rank-number">{{ scope.row.rank }}</span>
                  </template>
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
            <el-table-column prop="total_time" label="Время" :width="rows.length > 0 ? 180 : 0">
              <template #default="scope">
                <div class="time-cell">
                  <span class="time-value">{{ formatTime(scope.row.total_time) }}</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Результаты по этапам" name="stages">
        <StageResultsTable :competition-id="competitionId" />
      </el-tab-pane>

      <el-tab-pane label="Личные результаты" name="participants">
        <ParticipantResultsTable :competition-id="competitionId" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import StageResultsTable from './StageResultsTable.vue'
import ParticipantResultsTable from './ParticipantResultsTable.vue'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const rows = ref([])
const activeTab = ref('overall')

// Функция форматирования времени из секунд в формат ММ:СС
const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '00:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

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
  width: 36px;
  height: 36px;
  margin: 0 auto;
  background: #4b5563;
  border: 2px solid #374151;
}

.rank-number {
  font-weight: 700;
  color: white;
  font-size: 14px;
}

/* Выделение 1-3 мест трофеями и цветами */
.rank-cell.is-top {
  background: transparent;
  width: auto;
  height: auto;
  padding: 4px;
  position: relative;
  border: none;
}

.trophy {
  font-size: 22px;
  line-height: 1;
  display: inline-block;
}

.trophy.gold {
  filter: drop-shadow(0 0 6px rgba(234, 179, 8, 0.45));
}

.trophy.silver {
  filter: drop-shadow(0 0 6px rgba(156, 163, 175, 0.45));
}

.trophy.bronze {
  filter: drop-shadow(0 0 6px rgba(217, 119, 6, 0.45));
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

/* Стили для вкладок */
.results-tabs {
  margin-top: 20px;
  width: 100%;
  overflow: visible;
}

.results-tabs :deep(.el-tabs__header) {
  margin: 0 0 20px 0;
  background: #f8fafc;
  border-radius: 0;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: visible;
}

.results-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 8px;
  overflow: visible;
}

.results-tabs :deep(.el-tabs__nav) {
  overflow: visible;
}

.results-tabs :deep(.el-tabs__item) {
  padding: 8px 16px;
  font-weight: 600;
  color: #64748b;
  border-radius: 0;
  transition: color 0.3s ease;
  white-space: nowrap;
  min-width: fit-content;
  position: relative;
  overflow: visible;
  font-size: 15px;
  letter-spacing: 0.025em;
}

.results-tabs :deep(.el-tabs__item.is-active) {
  background: #ffffff;
  color: #1e40af;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.15);
  transform: translateY(-1px);
  border: 1px solid rgba(30, 64, 175, 0.1);
}

.results-tabs :deep(.el-tabs__item:hover) {
  color: #1e40af;
}

.results-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.results-tabs :deep(.el-tabs__content) {
  padding: 0;
  overflow: visible;
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


/* Адаптивность */
@media (max-width: 768px) {
  .results-tabs :deep(.el-tabs__header) {
    padding: 3px;
    border-radius: 0;
  }

  .results-tabs :deep(.el-tabs__nav-wrap) {
    padding: 0 6px;
  }

  .results-tabs :deep(.el-tabs__item) {
    padding: 6px 12px;
    font-size: 14px;
    font-weight: 500;
  }

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

@media (max-width: 480px) {
  .results-tabs :deep(.el-tabs__item) {
    padding: 5px 10px;
    font-size: 13px;
  }

  .results-tabs :deep(.el-tabs__nav-wrap) {
    padding: 0 4px;
  }
}
</style>

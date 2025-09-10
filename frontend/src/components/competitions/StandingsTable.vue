<template>
  <div class="standings-container">
    <el-tabs v-model="activeTab" class="results-tabs">
      <el-tab-pane name="overall">
        <template #label>
          <div class="tab-label">
            <el-icon class="tab-icon"><Trophy /></el-icon>
            <span>Общие результаты</span>
            <el-badge v-if="rows.length > 0" :value="rows.length" class="tab-badge" />
          </div>
        </template>
        <div class="table-container">
          <el-table :data="paginatedRows" style="width: 100%" :class="['modern-table', { 'empty-table': rows.length === 0 }]"
            :max-height="460" empty-text="Нет данных для отображения">
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
            <el-table-column prop="team_name" label="Команда" :min-width="rows.length > 0 ? 150 : 0">
              <template #default="scope">
                <div class="team-cell">
                  <span class="team-name">{{ scope.row.team_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="total_penalties" label="Штрафы" :width="rows.length > 0 ? 100 : 0">
              <template #default="scope">
                <div class="penalty-cell">
                  <span class="penalty-value">{{ scope.row.total_penalties }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="total_time" label="Время" :width="rows.length > 0 ? 120 : 0">
              <template #default="scope">
                <div class="time-cell">
                  <span class="time-value">{{ formatTime(scope.row.total_time) }}</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- Пагинация -->
          <div v-if="rows.length > pageSize" class="pagination-container">
            <el-pagination
              :key="`pagination-${rows.length}-${pageSize}`"
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="rows.length"
              layout="pager"
              :page-sizes="[10, 20, 50, 100]"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              class="modern-pagination"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="stages">
        <template #label>
          <div class="tab-label">
            <el-icon class="tab-icon"><List /></el-icon>
            <span>Результаты по этапам</span>
          </div>
        </template>
        <StageResultsTable :competition-id="competitionId" />
      </el-tab-pane>

      <el-tab-pane name="participants">
        <template #label>
          <div class="tab-label">
            <el-icon class="tab-icon"><User /></el-icon>
            <span>Личностные</span>
          </div>
        </template>
        <ParticipantResultsTable :competition-id="competitionId" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { Trophy, List, User } from '@element-plus/icons-vue'
import StageResultsTable from './StageResultsTable.vue'
import ParticipantResultsTable from './ParticipantResultsTable.vue'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const rows = ref([])
const activeTab = ref('overall')
const currentPage = ref(1)
const pageSize = ref(20) // Оптимальный размер страницы

// Функция форматирования времени из секунд в формат ММ:СС
const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '00:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Вычисляемые свойства для пагинации
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return rows.value.slice(start, end)
})

// Обработчики пагинации
const handleSizeChange = async (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
  await nextTick() // Ждем обновления DOM
}

const handleCurrentChange = async (newPage) => {
  currentPage.value = newPage
  await nextTick() // Ждем обновления DOM
}

const load = async () => {
  if (!props.competitionId) { 
    rows.value = []
    return 
  }
  rows.value = await api.computeStandings(props.competitionId)
  currentPage.value = 1 // Сбрасываем на первую страницу при загрузке новых данных
  await nextTick() // Ждем обновления DOM
}

watch(() => props.competitionId, () => load(), { immediate: true })
</script>

<style scoped>
/* Контейнер для растягивания на всю высоту */
.standings-container {
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
  min-width: 800px;
}

/* Включаем скролл для таблицы */
.modern-table :deep(.el-table__body-wrapper) {
  overflow-y: auto;
  overflow-x: auto;
}

.modern-table :deep(.el-table__header-wrapper) {
  overflow: hidden;
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
  font-size: 12px;
  padding: 8px 10px;
  border: none;
  text-align: center;
  white-space: nowrap;
}

.modern-table :deep(.el-table__body tr) {
  transition: all 0.3s ease;
}

.modern-table :deep(.el-table__body tr:hover) {
  background: rgba(59, 130, 246, 0.05);
}

.modern-table :deep(.el-table__body td) {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* Центрирование ячеек данных */
.modern-table :deep(.el-table__body td:nth-child(1)), /* Место */
.modern-table :deep(.el-table__body td:nth-child(3)), /* Штрафы */
.modern-table :deep(.el-table__body td:nth-child(4)) { /* Время */
  text-align: center;
}

/* Стили для ячеек */
.rank-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  margin: 0 auto;
  background: #4b5563;
  border: 2px solid #374151;
}

.rank-number {
  font-weight: 700;
  color: white;
  font-size: 12px;
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
  font-size: 18px;
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
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  min-height: 18px;
}

.team-name {
  font-weight: 600;
  color: #1e40af;
  font-size: 13px;
}

.penalty-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  min-height: 18px;
}

.penalty-value {
  font-weight: 600;
  color: #dc2626;
  font-size: 13px;
}

.time-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  min-height: 18px;
}

.time-value {
  font-weight: 600;
  color: #059669;
  font-size: 13px;
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
  margin-top: 12px;
  width: 100%;
  overflow: visible;
}

.results-tabs :deep(.el-tabs__header) {
  margin: 0 0 20px 0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-bottom: none;
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
  padding: 10px 16px;
  font-weight: 500;
  color: #64748b;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  min-width: fit-content;
  position: relative;
  overflow: visible;
  font-size: 14px;
  margin: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.results-tabs :deep(.el-tabs__item.is-active) {
  background: none;
  color: #3b82f6;
  box-shadow: none;
}

.el-tabs__nav-wrap:after{
  background: none;
}
.results-tabs :deep(.el-tabs__item:last-child) {
  padding-right: 12px !important;
}

.results-tabs :deep(.el-tabs__item:nth-child(2)) {
  padding-left: 12px !important;
}
.results-tabs :deep(.el-tabs__nav.is-top) {
  gap: 5px;
}

.results-tabs :deep(.el-tabs__item:hover) {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.results-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.results-tabs :deep(.el-tabs__content) {
  padding: 0;
  overflow: visible;
}

/* Стили для лейблов вкладок */
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.tab-icon {
  font-size: 14px;
  transition: color 0.2s ease;
}

.results-tabs :deep(.el-tabs__item.is-active) .tab-icon {
  color: #3b82f6;
}

.tab-badge {
  margin-left: 4px;
}

.tab-badge :deep(.el-badge__content) {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  line-height: 16px;
}

/* Стили для пагинации */
.pagination-container {
  display: flex;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.modern-pagination :deep(.el-pagination) {
  --el-pagination-font-size: 13px;
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: #64748b;
  --el-pagination-border-radius: 6px;
  --el-pagination-button-color: #64748b;
  --el-pagination-button-disabled-color: #d1d5db;
  --el-pagination-hover-color: #3b82f6;
}

.modern-pagination :deep(.el-pagination .btn-prev),
.modern-pagination :deep(.el-pagination .btn-next) {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 10px;
  margin: 0 2px;
  transition: all 0.3s ease;
}

.modern-pagination :deep(.el-pagination .btn-prev:hover),
.modern-pagination :deep(.el-pagination .btn-next:hover) {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.modern-pagination :deep(.el-pagination .el-pager li) {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin: 0 1px;
  min-width: 32px;
  height: 32px;
  line-height: 30px;
  transition: all 0.3s ease;
}

.modern-pagination :deep(.el-pagination .el-pager li:hover) {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.modern-pagination :deep(.el-pagination .el-pager li.is-active) {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}

.modern-pagination :deep(.el-pagination .el-pagination__total) {
  color: #64748b;
  font-weight: 500;
  margin-right: 16px;
}

.modern-pagination :deep(.el-pagination .el-pagination__jump) {
  color: #64748b;
  margin-left: 16px;
}

.modern-pagination :deep(.el-pagination .el-pagination__sizes) {
  margin-right: 16px;
}

.modern-pagination :deep(.el-pagination .el-pagination__sizes .el-select) {
  width: 100px;
}

.modern-pagination :deep(.el-pagination .el-pagination__sizes .el-select .el-input__inner) {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 36px;
  line-height: 34px;
}

/* Русская локализация для пагинации */
.modern-pagination :deep(.el-pagination .el-pagination__total) {
  color: #64748b;
  font-weight: 500;
  margin-right: 16px;
  white-space: nowrap;
}

.modern-pagination :deep(.el-pagination .el-pagination__sizes .el-select .el-input__wrapper) {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 36px;
}

.modern-pagination :deep(.el-pagination .el-pagination__jump) {
  color: #64748b;
  margin-left: 16px;
  white-space: nowrap;
}

.modern-pagination :deep(.el-pagination .el-pagination__jump .el-input__wrapper) {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 36px;
  width: 60px;
}


.table-container {
  width: 100%;
  max-width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0; /* Позволяет контейнеру сжиматься */
}

.table-container .modern-table {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-width: 800px;
}

/* Стилизация скроллбара для таблицы */
.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0.05);
}

/* Стили скроллбара для Firefox */
.modern-table :deep(.el-table__body-wrapper) {
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.3) rgba(0, 0, 0, 0.05);
}

.modern-table :deep(.cell) {
  white-space: normal;
  word-break: break-word;
}


/* Адаптивность */
@media (max-width: 768px) {
  .results-tabs :deep(.el-tabs__header) {
    padding: 4px;
    border-radius: 8px;
    margin: 0 0 16px 0;
  }

  .results-tabs :deep(.el-tabs__nav-wrap) {
    padding: 0 4px;
  }

  .results-tabs :deep(.el-tabs__item) {
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    margin: 0 2px;
  }

  .tab-label {
    gap: 6px;
  }

  .tab-icon {
    font-size: 14px;
  }

  .tab-badge :deep(.el-badge__content) {
    font-size: 10px;
    min-width: 16px;
    height: 16px;
    line-height: 14px;
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

  .table-container .modern-table {
    min-width: 100%;
  }



  .modern-pagination :deep(.el-pagination) {
    --el-pagination-font-size: 13px;
  }

  .modern-pagination :deep(.el-pagination .btn-prev),
  .modern-pagination :deep(.el-pagination .btn-next) {
    padding: 6px 10px;
    margin: 0 2px;
  }

  .modern-pagination :deep(.el-pagination .el-pager li) {
    min-width: 32px;
    height: 32px;
    line-height: 30px;
    margin: 0 1px;
  }
}

@media (max-width: 480px) {
  .results-tabs :deep(.el-tabs__header) {
    padding: 3px;
    border-radius: 6px;
  }

  .results-tabs :deep(.el-tabs__item) {
    padding: 6px 8px;
    font-size: 13px;
    margin: 0 1px;
  }

  .results-tabs :deep(.el-tabs__nav-wrap) {
    padding: 0 2px;
  }

  .tab-label {
    gap: 4px;
  }

  .tab-icon {
    font-size: 12px;
  }

  .tab-badge :deep(.el-badge__content) {
    font-size: 9px;
    min-width: 14px;
    height: 14px;
    line-height: 12px;
  }

 

  .modern-pagination :deep(.el-pagination) {
    --el-pagination-font-size: 12px;
  }

  .modern-pagination :deep(.el-pagination .btn-prev),
  .modern-pagination :deep(.el-pagination .btn-next) {
    padding: 4px 8px;
    margin: 0 1px;
  }

  .modern-pagination :deep(.el-pagination .el-pager li) {
    min-width: 28px;
    height: 28px;
    line-height: 26px;
    margin: 0 1px;
  }

  .modern-pagination :deep(.el-pagination .el-pagination__total),
  .modern-pagination :deep(.el-pagination .el-pagination__jump) {
    display: none;
  }
}
</style>

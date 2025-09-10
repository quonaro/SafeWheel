<template>
  <div class="participant-results-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Загрузка результатов...</span>
    </div>

    <div v-else-if="participants.length === 0" class="empty-state">
      <el-icon><UserFilled /></el-icon>
      <p>Нет данных для отображения</p>
    </div>

    <div v-else class="table-container">
      <el-table 
        :data="paginatedParticipants" 
        style="width: 100%" 
        :class="['modern-table', { 'empty-table': participants.length === 0 }]"
        height="460px" 
        empty-text="Нет данных для отображения"
      >
        <el-table-column prop="rank" label="Место" :width="participants.length > 0 ? 100 : 0">
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
        <el-table-column prop="full_name" label="Участник" :min-width="participants.length > 0 ? 180 : 0">
          <template #default="scope">
            <div class="participant-cell">
              <span class="participant-name">{{ scope.row.full_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="team_name" label="Команда" :min-width="participants.length > 0 ? 150 : 0">
          <template #default="scope">
            <div class="team-cell">
              <span class="team-name">{{ scope.row.team_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="Возраст" :width="participants.length > 0 ? 100 : 0">
          <template #default="scope">
            <span>{{ scope.row.age || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="Пол" :width="participants.length > 0 ? 80 : 0">
          <template #default="scope">
            <span>{{ scope.row.gender || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total_penalties" label="Штрафы" :width="participants.length > 0 ? 120 : 0">
          <template #default="scope">
            <div class="penalty-cell">
              <span class="penalty-value">{{ scope.row.total_penalties }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_time" label="Время" :width="participants.length > 0 ? 120 : 0">
          <template #default="scope">
            <div class="time-cell">
              <span class="time-value">{{ formatTime(scope.row.total_time) }}</span>
            </div>
          </template>
        </el-table-column>
        </el-table>
        
        <!-- Пагинация -->
        <div v-if="participants.length > pageSize" class="pagination-container">
          <el-pagination
            :key="`pagination-${participants.length}-${pageSize}`"
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="participants.length"
            layout="pager"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            class="modern-pagination"
          />
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { Loading, UserFilled } from '@element-plus/icons-vue'

const props = defineProps({ 
  competitionId: { 
    type: Number, 
    required: false 
  } 
})

const api = window.electronAPI?.database
const participants = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20) // Оптимальный размер страницы

// Функция форматирования времени из секунд в формат ММ:СС
const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined || seconds === 0) return '00:00'
  
  // Округляем до ближайшего целого числа секунд
  const totalSeconds = Math.round(Number(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Вычисляемые свойства для пагинации
const paginatedParticipants = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return participants.value.slice(start, end)
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
    participants.value = []
    return 
  }
  
  loading.value = true
  try {
    participants.value = await api.getParticipantResults(props.competitionId, { limit: 1000 })
  } catch (error) {
    console.error('Ошибка загрузки личных результатов:', error)
    participants.value = []
  } finally {
    loading.value = false
  }
  currentPage.value = 1 // Сбрасываем на первую страницу при загрузке новых данных
  await nextTick() // Ждем обновления DOM
}


watch(() => props.competitionId, () => load(), { immediate: true })
</script>

<style scoped>
/* Контейнер для растягивания на всю высоту */
.participant-results-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Современные стили для таблицы результатов */
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
  overflow: visible;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-height: 200px;
  width: 100%;
  min-width: 1000px;
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

/* Убираем overflow: hidden для ячеек с медалями */
.modern-table :deep(.el-table__body td:first-child) {
  overflow: visible !important;
}

.modern-table :deep(.el-table__body tr) {
  overflow: visible !important;
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

.participant-cell {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  min-height: 20px;
}

.participant-name {
  font-weight: 600;
  color: #059669;
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


/* Заголовок таблицы */
.table-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.table-scroll {
  width: 100%;
  max-width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 1000px;
  flex: 1;
  min-height: 400px;
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

/* Центрирование текста в колонках */
.modern-table :deep(.el-table__body td:nth-child(4)), /* Возраст */
.modern-table :deep(.el-table__body td:nth-child(5)), /* Пол */
.modern-table :deep(.el-table__body td:nth-child(6)), /* Штрафы */
.modern-table :deep(.el-table__body td:nth-child(7)) { /* Время */
  text-align: center;
}

.modern-table :deep(.el-table__header th:nth-child(4)), /* Возраст */
.modern-table :deep(.el-table__header th:nth-child(5)), /* Пол */
.modern-table :deep(.el-table__header th:nth-child(6)), /* Штрафы */
.modern-table :deep(.el-table__header th:nth-child(7)) { /* Время */
  text-align: center;
}

/* Центрирование всех заголовков таблицы */
.modern-table :deep(.el-table__header th) {
  text-align: center;
}

/* Состояния загрузки и пустого состояния */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: #6b7280;
  font-size: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
}

.empty-state .el-icon {
  font-size: 48px;
  color: #d1d5db;
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

  .participant-cell,
  .team-cell {
    padding: 2px 4px;
  }

  .participant-name,
  .team-name {
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

/* Стили для пагинации */
.pagination-container {
  display: flex;
  justify-content: center;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.modern-pagination :deep(.el-pagination) {
  --el-pagination-font-size: 14px;
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: #64748b;
  --el-pagination-border-radius: 8px;
  --el-pagination-button-color: #64748b;
  --el-pagination-button-disabled-color: #d1d5db;
  --el-pagination-hover-color: #3b82f6;
}

.modern-pagination :deep(.el-pagination .btn-prev),
.modern-pagination :deep(.el-pagination .btn-next) {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 4px;
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
  border-radius: 8px;
  margin: 0 2px;
  min-width: 36px;
  height: 36px;
  line-height: 34px;
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
</style>

<template>
  <div>
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Загрузка детальных результатов...</span>
    </div>

    <div v-else-if="details.length === 0" class="empty-state">
      <el-icon><List /></el-icon>
      <p>Нет данных для отображения</p>
    </div>

    <div v-else class="details-container">
      <div class="participant-info">
        <h4>{{ details[0]?.full_name || 'Участник' }}</h4>
        <p>Команда: {{ details[0]?.team_name || '—' }} | Возраст: {{ details[0]?.age || '—' }} | Пол: {{ details[0]?.gender || '—' }}</p>
      </div>

      <div class="table-scroll">
        <el-table 
          :data="details" 
          style="width: 100%" 
          :class="['modern-table', { 'empty-table': details.length === 0 }]"
          :height="details.length > 0 ? 'auto' : 200" 
          empty-text="Нет данных для отображения"
        >
          <el-table-column prop="stage_name" label="Этап" :min-width="details.length > 0 ? 200 : 0">
            <template #default="scope">
              <div class="stage-cell">
                <span class="stage-name">{{ scope.row.stage_name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="order_index" label="Порядок" :width="details.length > 0 ? 100 : 0">
            <template #default="scope">
              <div class="order-cell">
                <span class="order-value">{{ scope.row.order_index }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="penalty_points" label="Штрафы" :width="details.length > 0 ? 120 : 0">
            <template #default="scope">
              <div class="penalty-cell">
                <span class="penalty-value">{{ scope.row.penalty_points }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="time_seconds" label="Время (сек)" :width="details.length > 0 ? 150 : 0">
            <template #default="scope">
              <div class="time-cell">
                <span class="time-value">{{ scope.row.time_seconds }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Статус" :width="details.length > 0 ? 120 : 0">
            <template #default="scope">
              <div class="status-cell">
                <el-tag 
                  :type="scope.row.penalty_points > 0 || scope.row.time_seconds > 0 ? 'success' : 'info'"
                  size="small"
                >
                  {{ scope.row.penalty_points > 0 || scope.row.time_seconds > 0 ? 'Завершен' : 'Не участвовал' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Общие штрафы:</span>
          <span class="summary-value penalty">{{ totalPenalties }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Общее время:</span>
          <span class="summary-value time">{{ totalTime }} сек</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Завершенных этапов:</span>
          <span class="summary-value">{{ completedStages }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Loading, List } from '@element-plus/icons-vue'

const props = defineProps({ 
  competitionId: { 
    type: Number, 
    required: false 
  },
  participantId: {
    type: Number,
    required: false
  }
})

const api = window.electronAPI?.database
const details = ref([])
const loading = ref(false)

const totalPenalties = computed(() => {
  return details.value.reduce((sum, item) => sum + (item.penalty_points || 0), 0)
})

const totalTime = computed(() => {
  return details.value.reduce((sum, item) => sum + (item.time_seconds || 0), 0)
})

const completedStages = computed(() => {
  return details.value.filter(item => item.penalty_points > 0 || item.time_seconds > 0).length
})

const load = async () => {
  if (!props.competitionId || !props.participantId) { 
    details.value = []
    return 
  }
  
  loading.value = true
  try {
    details.value = await api.getParticipantStageDetails(props.competitionId, props.participantId)
  } catch (error) {
    console.error('Ошибка загрузки детальных результатов:', error)
    details.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.competitionId, props.participantId], () => load(), { immediate: true })
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
.stage-cell {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  min-height: 20px;
}

.stage-name {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.order-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  min-height: 20px;
}

.order-value {
  font-weight: 600;
  color: #7c3aed;
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

.status-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  min-height: 20px;
}

/* Контейнер деталей */
.details-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.participant-info {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.participant-info h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.participant-info p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
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

/* Сводка */
.summary {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.summary-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.summary-value.penalty {
  color: #dc2626;
}

.summary-value.time {
  color: #059669;
}

/* Состояния загрузки и пустого состояния */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
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

  .stage-cell,
  .order-cell,
  .penalty-cell,
  .time-cell,
  .status-cell {
    padding: 2px 4px;
  }

  .stage-name,
  .order-value,
  .penalty-value,
  .time-value {
    font-size: 12px;
  }

  .table-scroll {
    min-width: 100%;
  }

  .summary {
    flex-direction: column;
    gap: 12px;
  }

  .summary-item {
    min-width: auto;
  }
}
</style>

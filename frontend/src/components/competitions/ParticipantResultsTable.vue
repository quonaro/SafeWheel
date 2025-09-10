<template>
  <div>
    <div class="mb-12">
      <h3 class="table-title">Личные результаты участников</h3>
    </div>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Загрузка результатов...</span>
    </div>

    <div v-else-if="participants.length === 0" class="empty-state">
      <el-icon><UserFilled /></el-icon>
      <p>Нет данных для отображения</p>
    </div>

    <div v-else class="table-scroll">
      <el-table 
        :data="participants" 
        style="width: 100%" 
        :class="['modern-table', { 'empty-table': participants.length === 0 }]"
        :height="participants.length > 0 ? 'auto' : 200" 
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
            <div class="age-cell">
              <span class="age-value">{{ scope.row.age || '—' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="Пол" :width="participants.length > 0 ? 80 : 0">
          <template #default="scope">
            <div class="gender-cell">
              <span class="gender-value">{{ scope.row.gender || '—' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_penalties" label="Штрафы" :width="participants.length > 0 ? 120 : 0">
          <template #default="scope">
            <div class="penalty-cell">
              <span class="penalty-value">{{ scope.row.total_penalties }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_time" label="Время (сек)" :width="participants.length > 0 ? 150 : 0">
          <template #default="scope">
            <div class="time-cell">
              <span class="time-value">{{ scope.row.total_time }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Действия" :width="participants.length > 0 ? 120 : 0">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="showParticipantDetails(scope.row)"
            >
              Детали
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Диалог с детальными результатами участника -->
    <el-dialog
      v-model="detailsDialogVisible"
      :title="`Результаты участника: ${selectedParticipant?.full_name || ''}`"
      width="80%"
      :before-close="closeDetailsDialog"
    >
      <ParticipantDetailsTable 
        v-if="selectedParticipant"
        :competition-id="competitionId"
        :participant-id="selectedParticipant.participant_id"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Loading, UserFilled } from '@element-plus/icons-vue'
import ParticipantDetailsTable from './ParticipantDetailsTable.vue'

const props = defineProps({ 
  competitionId: { 
    type: Number, 
    required: false 
  } 
})

const api = window.electronAPI?.database
const participants = ref([])
const loading = ref(false)
const detailsDialogVisible = ref(false)
const selectedParticipant = ref(null)

const load = async () => {
  if (!props.competitionId) { 
    participants.value = []
    return 
  }
  
  loading.value = true
  try {
    participants.value = await api.getParticipantResults(props.competitionId)
  } catch (error) {
    console.error('Ошибка загрузки личных результатов:', error)
    participants.value = []
  } finally {
    loading.value = false
  }
}

const showParticipantDetails = (participant) => {
  selectedParticipant.value = participant
  detailsDialogVisible.value = true
}

const closeDetailsDialog = () => {
  detailsDialogVisible.value = false
  selectedParticipant.value = null
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
  padding: 0;
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

.gender-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(236, 72, 153, 0.1);
  border: 1px solid rgba(236, 72, 153, 0.2);
  min-height: 20px;
}

.gender-value {
  font-weight: 600;
  color: #be185d;
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
  max-height: 600px;
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

  .rank-cell {
    width: 32px;
    height: 32px;
  }

  .rank-number {
    font-size: 14px;
  }

  .participant-cell,
  .team-cell,
  .age-cell,
  .gender-cell,
  .penalty-cell,
  .time-cell {
    padding: 2px 4px;
  }

  .participant-name,
  .team-name,
  .age-value,
  .gender-value,
  .penalty-value,
  .time-value {
    font-size: 12px;
  }

  .table-scroll {
    min-width: 100%;
  }
}
</style>

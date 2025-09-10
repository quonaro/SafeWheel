<template>
  <div>
    <div class="mb-12">
      <h3 class="table-title">Результаты по этапам</h3>
    </div>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Загрузка результатов...</span>
    </div>

    <div v-else-if="stages.length === 0" class="empty-state">
      <el-icon><TrophyBase /></el-icon>
      <p>Нет данных для отображения</p>
    </div>

    <div v-else class="stages-container">
      <div v-for="stage in stages" :key="stage.stage_id" class="stage-section">
        <div class="stage-header">
          <h4 class="stage-title">{{ stage.stage_name }}</h4>
        </div>
        
        <div v-for="team in stage.teams" :key="team.team_id" class="team-section">
          <div class="team-header">
            <div class="team-rank">
              <span class="rank-badge" :class="{ 'is-top': [1, 2, 3].includes(team.rank) }">
                <template v-if="team.rank === 1">🥇</template>
                <template v-else-if="team.rank === 2">🥈</template>
                <template v-else-if="team.rank === 3">🥉</template>
                <template v-else>{{ team.rank }}</template>
              </span>
            </div>
            <div class="team-info">
              <h4 class="team-name">{{ team.team_name }}</h4>
              <div class="team-stats">
                <span class="stat-item">Штрафы: {{ team.total_penalties }}</span>
                <span class="stat-item">Время: {{ team.total_time }}с</span>
              </div>
            </div>
          </div>
          
          <div class="participants-table">
            <el-table 
              :data="team.participants" 
              style="width: 100%" 
              size="small"
              :show-header="false"
            >
              <el-table-column prop="rank" label="Место" width="60">
                <template #default="scope">
                  <div class="participant-rank" :class="{ 'is-top': [1, 2, 3].includes(scope.row.rank) }">
                    {{ scope.row.rank }}
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="full_name" label="Участник" min-width="150">
                <template #default="scope">
                  <div class="participant-info">
                    <span class="participant-name">{{ scope.row.full_name }}</span>
                    <span class="participant-details">{{ scope.row.gender }}, {{ scope.row.age }}л</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="penalty_points" label="Штрафы" width="80">
                <template #default="scope">
                  <div class="penalty-cell">
                    <span class="penalty-value">{{ scope.row.penalty_points }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="time_seconds" label="Время" width="100">
                <template #default="scope">
                  <div class="time-cell">
                    <span class="time-value">{{ scope.row.time_seconds }}с</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="Статус" width="100">
                <template #default="scope">
                  <el-tag 
                    :type="scope.row.penalty_points > 0 || scope.row.time_seconds > 0 ? 'success' : 'info'"
                    size="small"
                  >
                    {{ scope.row.penalty_points > 0 || scope.row.time_seconds > 0 ? 'Завершен' : 'Не участвовал' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Loading, TrophyBase } from '@element-plus/icons-vue'

const props = defineProps({ 
  competitionId: { 
    type: Number, 
    required: false 
  } 
})

const api = window.electronAPI?.database
const stages = ref([])
const loading = ref(false)

const load = async () => {
  if (!props.competitionId) { 
    stages.value = []
    return 
  }
  
  loading.value = true
  try {
    stages.value = await api.getStageStandingsWithParticipants(props.competitionId)
  } catch (error) {
    console.error('Ошибка загрузки результатов по этапам:', error)
    stages.value = []
  } finally {
    loading.value = false
  }
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

/* Контейнер этапов */
.stages-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stage-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.stage-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
}

.stage-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

/* Секция команды */
.team-section {
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.team-section:last-child {
  margin-bottom: 0;
}

.team-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.team-rank {
  flex-shrink: 0;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6b7280;
  color: white;
  font-weight: 700;
  font-size: 16px;
}

.rank-badge.is-top {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.team-info {
  flex: 1;
}

.team-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.team-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Таблица участников */
.participants-table {
  background: white;
}

.participants-table :deep(.el-table__body tr) {
  border-bottom: 1px solid #f3f4f6;
}

.participants-table :deep(.el-table__body tr:hover) {
  background: #f8fafc;
}

.participants-table :deep(.el-table__body td) {
  padding: 8px 12px;
  border: none;
}

.participant-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  font-weight: 600;
  font-size: 12px;
}

.participant-rank.is-top {
  background: #fbbf24;
  color: white;
}

.participant-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.participant-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.participant-details {
  font-size: 12px;
  color: #6b7280;
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

  .stage-section {
    padding: 16px;
  }
}
</style>

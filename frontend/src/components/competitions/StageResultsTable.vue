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

    <div v-else class="results-container">
      <!-- Навигация по этапам -->
      <div class="stages-navigation">
        <!-- Выпадающий список для большого количества этапов -->
        <div v-if="stages.length > 4" class="stage-selector">
          <el-select 
            v-model="activeStageIndex" 
            placeholder="Выберите этап"
            size="large"
            style="width: 300px"
            @change="setActiveStage(activeStageIndex)"
          >
            <el-option
              v-for="(stage, index) in stages"
              :key="stage.stage_id"
              :label="`${stage.stage_name} (${stage.teams.length} команд, ${stage.teams.reduce((total, team) => total + team.participants.length, 0)} участников)`"
              :value="index"
            />
          </el-select>
        </div>
        
        <!-- Вкладки для небольшого количества этапов -->
        <div v-else class="stages-tabs">
          <div 
            v-for="(stage, index) in stages" 
            :key="stage.stage_id"
            class="stage-tab"
            :class="{ 'is-active': activeStageIndex === index }"
            @click="setActiveStage(index)"
          >
            <div class="tab-content">
              <span class="tab-title">{{ stage.stage_name }}</span>
              <div class="tab-stats">
                <span class="teams-count">{{ stage.teams.length }}</span>
                <span class="participants-count">{{ stage.teams.reduce((total, team) => total + team.participants.length, 0) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Навигационные стрелки -->
        <div class="navigation-controls">
          <el-button 
            :disabled="activeStageIndex === 0"
            @click="prevStage"
            size="small"
            circle
            title="Предыдущий этап"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          
          <span class="stage-counter">
            {{ activeStageIndex + 1 }} из {{ stages.length }}
          </span>
          
          <el-button 
            :disabled="activeStageIndex === stages.length - 1"
            @click="nextStage"
            size="small"
            circle
            title="Следующий этап"
          >
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
      
      <!-- Контент активного этапа -->
      <div class="active-stage-content">
        <div v-if="activeStage" class="stage-section">
          <div class="stage-header">
            <h4 class="stage-title">{{ activeStage.stage_name }}</h4>
            <div class="stage-stats">
              <span class="teams-count">{{ activeStage.teams.length }} команд</span>
              <span class="participants-count">{{ activeStage.teams.reduce((total, team) => total + team.participants.length, 0) }} участников</span>
            </div>
          </div>
          
          <div class="teams-container">
            <div v-for="team in activeStage.teams" :key="team.team_id" class="team-section">
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
                <span class="stat-item participants-count">Участников: {{ team.participants.length }}</span>
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
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Loading, TrophyBase, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({ 
  competitionId: { 
    type: Number, 
    required: false 
  } 
})

const api = window.electronAPI?.database
const stages = ref([])
const loading = ref(false)
const activeStageIndex = ref(0)

// Computed свойство для активного этапа
const activeStage = computed(() => {
  return stages.value[activeStageIndex.value] || null
})

// Функция переключения этапа
const setActiveStage = (index) => {
  if (index >= 0 && index < stages.value.length) {
    activeStageIndex.value = index
  }
}

// Функция переключения на следующий этап
const nextStage = () => {
  if (activeStageIndex.value < stages.value.length - 1) {
    setActiveStage(activeStageIndex.value + 1)
  }
}

// Функция переключения на предыдущий этап
const prevStage = () => {
  if (activeStageIndex.value > 0) {
    setActiveStage(activeStageIndex.value - 1)
  }
}

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
/* Контейнер результатов с вкладками */
.results-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Навигация по этапам */
.stages-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border-radius: 12px 12px 0 0;
  padding: 16px 20px;
  border-bottom: 2px solid #e5e7eb;
  gap: 20px;
}

/* Селектор этапов */
.stage-selector {
  flex: 1;
  max-width: 400px;
}

/* Навигационные контролы */
.navigation-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.stage-counter {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  min-width: 80px;
  text-align: center;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .stages-navigation {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .stage-selector {
    max-width: 100%;
    width: 100%;
  }
  
  .navigation-controls {
    width: 100%;
    justify-content: center;
  }
  
  .stages-tabs {
    width: 100%;
    justify-content: center;
  }
  
  .stage-tab {
    min-width: 150px;
  }
}

/* Вкладки для переключения между этапами */
.stages-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
}

/* Кастомный скроллбар для вкладок */
.stages-tabs::-webkit-scrollbar {
  height: 6px;
}

.stages-tabs::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 3px;
}

.stages-tabs::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}

.stages-tabs::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.stage-tab {
  flex: 1;
  min-width: 200px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: transparent;
  border: 2px solid transparent;
}

.stage-tab:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.stage-tab.is-active {
  background: #3b82f6;
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.tab-content {
  padding: 12px 16px;
  text-align: center;
}

.tab-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.stage-tab.is-active .tab-title {
  color: white;
}

.tab-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.stage-tab.is-active .tab-stats {
  color: rgba(255, 255, 255, 0.9);
}

.tab-stats .teams-count::before {
  content: "👥 ";
}

.tab-stats .participants-count::before {
  content: "👤 ";
}

/* Контент активного этапа */
.active-stage-content {
  background: white;
  border-radius: 0 0 12px 12px;
  min-height: 400px;
  max-height: 70vh;
  overflow-y: auto;
}

/* Контейнер команд */
.teams-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

/* Кастомный скроллбар для контента этапа */
.active-stage-content::-webkit-scrollbar {
  width: 8px;
}

.active-stage-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.active-stage-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.active-stage-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.stage-section {
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  border: none;
}

.stage-header {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stage-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.stage-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.teams-count,
.participants-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.teams-count::before {
  content: "👥";
}

.participants-count::before {
  content: "👤";
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

.stat-item.participants-count {
  color: #059669;
  font-weight: 600;
}

/* Таблица участников */
.participants-table {
  background: white;
  max-height: 300px;
  overflow-y: auto;
}

/* Кастомный скроллбар для таблиц участников */
.participants-table::-webkit-scrollbar {
  width: 6px;
}

.participants-table::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 3px;
}

.participants-table::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 3px;
}

.participants-table::-webkit-scrollbar-thumb:hover {
  background: #adb5bd;
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

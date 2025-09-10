<template>
  <div class="competitions">
    <div class="header-section">
      <div class="title">
        <h1>{{ currentCompetition?.name || 'Конкурс' }}</h1>
        <p>Управление соревнованиями "Безопасное колесо"</p>
      </div>
      
      <div class="controls">
        <el-button class="back-button" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          Назад к выбору
        </el-button>
      </div>
    </div>

    <div class="content-container">
      <TeamsParticipants v-if="activeTab === 'teams'" :competition-id="currentCompetitionId" />
      <StagesManager v-if="activeTab === 'stages'" :competition-id="currentCompetitionId" />
      <ResultsInput v-if="activeTab === 'results'" :competition-id="currentCompetitionId" />
      <StandingsTable v-if="activeTab === 'standings'" :competition-id="currentCompetitionId" />
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'teams'
  },
  competitionId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['tab-change', 'back-to-selector'])

const competitions = ref([])
const currentCompetitionId = ref(props.competitionId)

const currentCompetition = computed(() => {
  return competitions.value.find(c => c.id === currentCompetitionId.value)
})

// Следим за изменениями activeTab и уведомляем родительский компонент
watch(() => props.activeTab, (newTab) => {
  // Можно добавить дополнительную логику при смене вкладки
}, { immediate: true })

// Следим за изменениями competitionId
watch(() => props.competitionId, (newId) => {
  currentCompetitionId.value = newId
}, { immediate: true })

const api = window.electronAPI?.database

const loadCompetitions = async () => {
  if (!api) return
  competitions.value = await api.listCompetitions()
}

const goBack = () => {
  emit('back-to-selector')
}

const loadAll = async () => {
  // children react on prop
}


onMounted(() => {
  loadCompetitions()
})
</script>

<script>
export default {
  components: {
    TeamsParticipants: () => import('./competitions/TeamsParticipants.vue'),
    StagesManager: () => import('./competitions/StagesManager.vue'),
    ResultsInput: () => import('./competitions/ResultsInput.vue'),
    StandingsTable: () => import('./competitions/StandingsTable.vue')
  }
}
</script>

<style scoped>
.competitions {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #374151;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.title h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.title p {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.select-wrapper {
  min-width: 280px;
}

.competition-select {
  width: 100%;
}

.competition-select :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  color: #374151;
}

.competition-select :deep(.el-input__inner) {
  color: #374151;
}

.competition-select :deep(.el-input__inner::placeholder) {
  color: #9ca3af;
}


.back-button {
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.2);
  color: #6b7280;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: rgba(107, 114, 128, 0.2);
  color: #374151;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(107, 114, 128, 0.2);
}

.content-container {
  flex: 1;
  overflow: hidden;
}

</style>



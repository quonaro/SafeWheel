<template>
  <div class="competitions">
    <div class="header-section">
      <div class="title">
        <h1>Конкурсы</h1>
        <p>Управление соревнованиями "Безопасное колесо"</p>
      </div>
      
      <div class="controls">
        <div class="select-wrapper">
          <el-select 
            v-model="currentCompetitionId" 
            placeholder="Выберите конкурс" 
            class="competition-select"
            @change="loadAll"
          >
            <el-option v-for="c in competitions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>
        <el-button type="primary" class="add-button" @click="openCompetitionDialog()">
          <el-icon><Plus /></el-icon>
          Новый конкурс
        </el-button>
      </div>
    </div>

    <div class="content-container">
      <TeamsParticipants v-if="activeTab === 'teams'" :competition-id="currentCompetitionId" />
      <StagesManager v-if="activeTab === 'stages'" :competition-id="currentCompetitionId" />
      <ResultsInput v-if="activeTab === 'results'" :competition-id="currentCompetitionId" />
      <StandingsTable v-if="activeTab === 'standings'" :competition-id="currentCompetitionId" />
    </div>

    <el-dialog 
      v-model="competitionDialogVisible" 
      :title="editingCompetition ? 'Редактировать конкурс' : 'Новый конкурс'" 
      width="520px"
      class="custom-dialog"
    >
      <el-form :model="competitionForm" label-width="120px">
        <el-form-item label="Название">
          <el-input v-model="competitionForm.name" placeholder="Введите название конкурса" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="competitionDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveCompetition">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'teams'
  }
})

const emit = defineEmits(['tab-change'])

const competitions = ref([])
const currentCompetitionId = ref(null)
const competitionDialogVisible = ref(false)
const editingCompetition = ref(null)
const competitionForm = reactive({ name: '' })

// Следим за изменениями activeTab и уведомляем родительский компонент
watch(() => props.activeTab, (newTab) => {
  // Можно добавить дополнительную логику при смене вкладки
}, { immediate: true })

const api = window.electronAPI?.database

const loadCompetitions = async () => {
  if (!api) return
  competitions.value = await api.listCompetitions()
  if (!currentCompetitionId.value && competitions.value.length) {
    currentCompetitionId.value = competitions.value[0].id
  }
}

const loadAll = async () => {
  // children react on prop
}

const openCompetitionDialog = (c = null) => {
  editingCompetition.value = c
  Object.assign(competitionForm, c || { name: '' })
  competitionDialogVisible.value = true
}

const saveCompetition = async () => {
  try {
    if (!competitionForm.name?.trim()) throw new Error('Укажите название')
    const payload = { name: String(competitionForm.name || '').trim() }
    if (editingCompetition.value) {
      const saved = await api.updateCompetition(editingCompetition.value.id, payload)
      const idx = competitions.value.findIndex((x) => x.id === saved.id)
      if (idx >= 0) competitions.value[idx] = saved
    } else {
      const created = await api.createCompetition(payload)
      competitions.value.unshift(created)
      currentCompetitionId.value = created.id
    }
    competitionDialogVisible.value = false
    ElMessage.success('Сохранено')
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка')
  }
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

.add-button {
  background: #3b82f6;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
}

.add-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

.content-container {
  flex: 1;
  overflow: hidden;
}

.custom-dialog :deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.custom-dialog :deep(.el-dialog__header) {
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.custom-dialog :deep(.el-dialog__body) {
  color: white;
}

.custom-dialog :deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
}

.custom-dialog :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.custom-dialog :deep(.el-input__inner) {
  color: white;
}

.custom-dialog :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}

.custom-dialog :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}

.custom-dialog :deep(.el-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}
</style>



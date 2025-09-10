<template>
  <div id="app">
    <div class="app-container">
      <div class="sidebar">
        <div class="sidebar-content">
          <nav class="nav-menu">
            <div 
              class="nav-item" 
              :class="{ 
                active: activeTab === 'teams' && selectedCompetitionId, 
                disabled: !selectedCompetitionId 
              }" 
              @click="selectedCompetitionId && setActiveTab('teams')"
            >
              <el-icon><UserFilled /></el-icon>
            </div>
            <div 
              class="nav-item" 
              :class="{ 
                active: activeTab === 'stages' && selectedCompetitionId, 
                disabled: !selectedCompetitionId 
              }" 
              @click="selectedCompetitionId && setActiveTab('stages')"
            >
              <el-icon><List /></el-icon>
            </div>
            <div 
              class="nav-item" 
              :class="{ 
                active: activeTab === 'results' && selectedCompetitionId, 
                disabled: !selectedCompetitionId 
              }" 
              @click="selectedCompetitionId && setActiveTab('results')"
            >
              <el-icon><Edit /></el-icon>
            </div>
            <div 
              class="nav-item" 
              :class="{ 
                active: activeTab === 'standings' && selectedCompetitionId, 
                disabled: !selectedCompetitionId 
              }" 
              @click="selectedCompetitionId && setActiveTab('standings')"
            >
              <el-icon><TrophyBase /></el-icon>
            </div>
          </nav>
        </div>
      </div>
      
      <div class="main-content">
        <div class="content-card">
          <div v-if="!selectedCompetitionId" class="competition-selector">
            <div class="selector-header">
              <h1>Выберите конкурс</h1>
              <p>Для начала работы выберите существующий конкурс или создайте новый</p>
            </div>
            
            <div class="competition-list">
              <div 
                v-for="competition in competitions" 
                :key="competition.id"
                class="competition-card"
                @click="selectCompetition(competition.id)"
              >
                <div class="competition-icon">🏆</div>
                <div class="competition-info">
                  <h3>{{ competition.name }}</h3>
                  <p>Конкурс "Безопасное колесо"</p>
                </div>
                <div class="competition-arrow">→</div>
              </div>
              
              <div class="competition-card new-competition" @click="openCreateDialog">
                <div class="competition-icon">+</div>
                <div class="competition-info">
                  <h3>Создать новый конкурс</h3>
                  <p>Добавить новый конкурс в систему</p>
                </div>
                <div class="competition-arrow">→</div>
              </div>
            </div>
          </div>
          
          <CompetitionsManager 
            v-else
            :active-tab="activeTab" 
            :competition-id="selectedCompetitionId"
            @tab-change="handleTabChange"
            @back-to-selector="backToSelector"
          />
        </div>
      </div>
    </div>
    
    <!-- Диалог создания конкурса -->
    <el-dialog 
      v-model="createDialogVisible" 
      title="Создать новый конкурс" 
      width="520px"
      class="custom-dialog"
    >
      <el-form :model="competitionForm" label-width="120px">
        <el-form-item label="Название">
          <el-input v-model="competitionForm.name" placeholder="Введите название конкурса" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="createCompetition">Создать</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import CompetitionsManager from './components/CompetitionsManager.vue'
import { UserFilled, List, Edit, TrophyBase } from '@element-plus/icons-vue'

const activeTab = ref('teams')
const selectedCompetitionId = ref(null)
const competitions = ref([])
const createDialogVisible = ref(false)
const competitionForm = reactive({ name: '' })

const api = window.electronAPI?.database

const setActiveTab = (tab) => {
  activeTab.value = tab
}

const handleTabChange = (tab) => {
  activeTab.value = tab
}

const selectCompetition = (competitionId) => {
  selectedCompetitionId.value = competitionId
  activeTab.value = 'teams'
}

const backToSelector = () => {
  selectedCompetitionId.value = null
}

const openCreateDialog = () => {
  competitionForm.name = ''
  createDialogVisible.value = true
}

const createCompetition = async () => {
  try {
    if (!competitionForm.name?.trim()) throw new Error('Укажите название')
    const payload = { name: String(competitionForm.name || '').trim() }
    const created = await api.createCompetition(payload)
    competitions.value.unshift(created)
    createDialogVisible.value = false
    ElMessage.success('Конкурс создан')
    selectCompetition(created.id)
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка')
  }
}

const loadCompetitions = async () => {
  if (!api) return
  competitions.value = await api.listCompetitions()
}

onMounted(() => {
  loadCompetitions()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  background: #f8fafc;
  overflow: hidden;
}

.app-container {
  display: flex;
  height: 100vh;
  gap: 20px;
  padding: 20px;
}

.sidebar {
  width: 80px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-content {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: center;
}


.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.nav-item {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #6b7280;
  margin-bottom: 8px;
  position: relative;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
  transform: translateY(-2px);
}

.nav-item.active {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.nav-item .el-icon {
  font-size: 20px;
}

.nav-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-item.disabled:hover {
  background: transparent;
  transform: none;
  color: #6b7280;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 30px;
  height: 100%;
  overflow: hidden;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Стили для селектора конкурсов */
.competition-selector {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.selector-header {
  text-align: center;
  margin-bottom: 40px;
}

.selector-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #1f2937;
}

.selector-header p {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.competition-list {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.competition-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 20px;
}

.competition-card:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.competition-card.new-competition {
  border: 2px dashed rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.05);
}

.competition-card.new-competition:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.competition-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  color: #3b82f6;
}

.competition-card.new-competition .competition-icon {
  background: rgba(59, 130, 246, 0.2);
  font-size: 24px;
  font-weight: bold;
}

.competition-info {
  flex: 1;
}

.competition-info h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #1f2937;
}

.competition-info p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.competition-arrow {
  font-size: 20px;
  color: #9ca3af;
  transition: all 0.3s ease;
}

.competition-card:hover .competition-arrow {
  color: #3b82f6;
  transform: translateX(4px);
}

/* Стили для диалога */
.custom-dialog :deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.custom-dialog :deep(.el-dialog__header) {
  color: #1f2937;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.custom-dialog :deep(.el-dialog__body) {
  color: #374151;
}

.custom-dialog :deep(.el-form-item__label) {
  color: #374151;
  font-weight: 500;
}

.custom-dialog :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.custom-dialog :deep(.el-input__inner) {
  color: #374151;
}

.custom-dialog :deep(.el-input__inner::placeholder) {
  color: #9ca3af;
}

.custom-dialog :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}

.custom-dialog :deep(.el-button--primary) {
  background: #3b82f6;
  border: none;
}
</style>

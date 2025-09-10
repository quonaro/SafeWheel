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

/* Адаптивность для основного контейнера */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    justify-content: center;
    padding: 16px 0;
  }
  
  .sidebar-content {
    flex-direction: row;
    gap: 12px;
    padding: 0 20px;
  }
  
  .nav-menu {
    flex-direction: row;
    gap: 12px;
  }
  
  .nav-item {
    margin-bottom: 0;
  }
}

@media (max-width: 480px) {
  .app-container {
    padding: 12px;
    gap: 12px;
  }
  
  .sidebar {
    padding: 12px 0;
  }
  
  .sidebar-content {
    padding: 0 16px;
    gap: 8px;
  }
  
  .nav-menu {
    gap: 8px;
  }
  
  .nav-item {
    width: 44px;
    height: 44px;
  }
  
  .nav-item .el-icon {
    font-size: 16px;
  }
}

.sidebar {
  width: 70px;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.sidebar-content {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: center;
}


.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.nav-item {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: #6b7280;
  margin-bottom: 8px;
  position: relative;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #3b82f6;
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.2);
}

.nav-item:hover::before {
  opacity: 1;
}

.nav-item.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  border-color: transparent;
  transform: translateY(-2px) scale(1.1);
}

.nav-item.active::before {
  opacity: 0;
}

.nav-item .el-icon {
  font-size: 20px;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.nav-item:hover .el-icon {
  transform: scale(1.1);
}

.nav-item.active .el-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.nav-item.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
  background: rgba(107, 114, 128, 0.1);
  border-color: rgba(107, 114, 128, 0.1);
  box-shadow: none;
}

.nav-item.disabled:hover {
  background: rgba(107, 114, 128, 0.1);
  transform: none;
  color: #6b7280;
  box-shadow: none;
}

.nav-item.disabled::before {
  opacity: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-card {
  background: #ffffff;
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 40px;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* Адаптивность для контентной области */
@media (max-width: 768px) {
  .content-card {
    padding: 24px;
    border-radius: 16px;
  }
}

@media (max-width: 480px) {
  .content-card {
    padding: 16px;
    border-radius: 12px;
  }
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
  padding: 60px 40px;
  background: #ffffff;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.selector-header {
  text-align: center;
  margin-bottom: 50px;
  position: relative;
  z-index: 1;
}

.selector-header h1 {
  font-size: 42px;
  font-weight: 800;
  margin: 0 0 16px 0;
  color: #1f2937;
}

.selector-header p {
  color: #6b7280;
  font-size: 18px;
  margin: 0;
  font-weight: 400;
}

.competition-list {
  width: 100%;
  max-width: 1400px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: clamp(16px, 2.5vw, 32px);
  position: relative;
  z-index: 1;
}

/* Адаптивность для разных экранов */
@media (max-width: 1200px) {
  .competition-list {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: clamp(16px, 2vw, 24px);
  }
}

@media (max-width: 900px) {
  .competition-list {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: clamp(14px, 1.8vw, 20px);
  }
}

@media (max-width: 768px) {
  .competition-list {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: clamp(12px, 1.5vw, 18px);
    max-width: 100%;
  }
  
  .competition-selector {
    padding: clamp(30px, 5vw, 50px) clamp(16px, 4vw, 30px);
  }
  
  .selector-header h1 {
    font-size: clamp(28px, 4vw, 36px);
  }
  
  .selector-header p {
    font-size: clamp(14px, 2vw, 18px);
  }
}

@media (max-width: 600px) {
  .competition-list {
    grid-template-columns: 1fr;
    gap: clamp(10px, 1.2vw, 16px);
  }
}

@media (max-width: 480px) {
  .competition-selector {
    padding: clamp(20px, 4vw, 30px) clamp(12px, 3vw, 20px);
  }
  
  .selector-header h1 {
    font-size: clamp(24px, 3.5vw, 32px);
  }
  
  .selector-header p {
    font-size: clamp(12px, 1.8vw, 16px);
  }
  
  .competition-card {
    padding: clamp(16px, 3vw, 24px);
  }
  
  .competition-icon {
    width: clamp(50px, 8vw, 70px);
    height: clamp(50px, 8vw, 70px);
    font-size: clamp(28px, 4vw, 40px);
  }
  
  .competition-info h3 {
    font-size: clamp(16px, 2.5vw, 20px);
  }
  
  .competition-info p {
    font-size: clamp(11px, 1.5vw, 14px);
  }
}

@media (min-width: 1400px) {
  .competition-list {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: clamp(20px, 2.5vw, 36px);
  }
  
  .competition-selector {
    padding: clamp(60px, 8vw, 100px) clamp(40px, 6vw, 80px);
  }
  
  .selector-header h1 {
    font-size: clamp(36px, 5vw, 52px);
  }
  
  .selector-header p {
    font-size: clamp(16px, 2.2vw, 22px);
  }
}

@media (min-width: 1800px) {
  .competition-list {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: clamp(24px, 3vw, 40px);
  }
}

.competition-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: clamp(16px, 2vw, 24px);
  padding: clamp(20px, 3vw, 40px);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-height: clamp(200px, 25vw, 280px);
}

.competition-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
}

.competition-card.new-competition {
  border: 2px dashed rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.02);
}

.competition-card.new-competition:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
  transform: translateY(-8px) scale(1.05);
}

.competition-icon {
  font-size: clamp(32px, 4vw, 56px);
  width: clamp(60px, 8vw, 90px);
  height: clamp(60px, 8vw, 90px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  border-radius: clamp(12px, 1.5vw, 20px);
  color: white;
  margin-bottom: clamp(12px, 2vw, 24px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.competition-card:hover .competition-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.competition-card.new-competition .competition-icon {
  background: #10b981;
  font-size: clamp(24px, 3vw, 40px);
  font-weight: bold;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
}

.competition-card.new-competition:hover .competition-icon {
  background: #059669;
  transform: scale(1.15) rotate(-5deg);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
}

.competition-info {
  flex: 1;
  position: relative;
  z-index: 1;
}

.competition-info h3 {
  font-size: clamp(16px, 2.2vw, 24px);
  font-weight: 700;
  margin: 0 0 clamp(4px, 0.8vw, 12px) 0;
  color: #1f2937;
  transition: color 0.3s ease;
}

.competition-card:hover .competition-info h3 {
  color: #3b82f6;
}

.competition-info p {
  font-size: clamp(12px, 1.5vw, 16px);
  color: #6b7280;
  margin: 0;
  font-weight: 500;
  line-height: 1.5;
}

.competition-arrow {
  font-size: clamp(18px, 2.5vw, 28px);
  color: #9ca3af;
  transition: all 0.3s ease;
  margin-top: clamp(8px, 1.5vw, 20px);
  position: relative;
  z-index: 1;
}

.competition-card:hover .competition-arrow {
  color: #3b82f6;
  transform: translateY(-2px) scale(1.2);
}

/* Стили для диалога */
.custom-dialog :deep(.el-dialog) {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  position: relative;
  overflow: hidden;
}

.custom-dialog :deep(.el-dialog__header) {
  color: #1f2937;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 24px 32px 20px;
  background: rgba(59, 130, 246, 0.02);
  margin: 0;
  border-radius: 24px 24px 0 0;
}

.custom-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.custom-dialog :deep(.el-dialog__body) {
  color: #374151;
  padding: 32px;
}

.custom-dialog :deep(.el-form-item__label) {
  color: #374151;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.custom-dialog :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.custom-dialog :deep(.el-input__wrapper:hover) {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.custom-dialog :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.custom-dialog :deep(.el-input__inner) {
  color: #374151;
  font-size: 16px;
  padding: 12px 16px;
}

.custom-dialog :deep(.el-input__inner::placeholder) {
  color: #9ca3af;
  font-weight: 400;
}

.custom-dialog :deep(.el-dialog__footer) {
  padding: 20px 32px 32px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(248, 250, 252, 0.5);
  border-radius: 0 0 24px 24px;
}

.custom-dialog :deep(.el-button) {
  border-radius: 12px;
  font-weight: 600;
  padding: 12px 24px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.custom-dialog :deep(.el-button--primary) {
  background: #3b82f6;
  border: none;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.custom-dialog :deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

.custom-dialog :deep(.el-button:not(.el-button--primary)) {
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.custom-dialog :deep(.el-button:not(.el-button--primary):hover) {
  background: rgba(107, 114, 128, 0.2);
  color: #374151;
  transform: translateY(-1px);
}

/* Адаптивность для диалогов */
@media (max-width: 768px) {
  .custom-dialog :deep(.el-dialog) {
    width: 90% !important;
    margin: 0 auto;
  }
  
  .custom-dialog :deep(.el-dialog__header) {
    padding: 20px 24px 16px;
  }
  
  .custom-dialog :deep(.el-dialog__body) {
    padding: 24px;
  }
  
  .custom-dialog :deep(.el-dialog__footer) {
    padding: 16px 24px 24px;
  }
}

@media (max-width: 480px) {
  .custom-dialog :deep(.el-dialog) {
    width: 95% !important;
    border-radius: 16px;
  }
  
  .custom-dialog :deep(.el-dialog__header) {
    padding: 16px 20px 12px;
  }
  
  .custom-dialog :deep(.el-dialog__title) {
    font-size: 18px;
  }
  
  .custom-dialog :deep(.el-dialog__body) {
    padding: 20px;
  }
  
  .custom-dialog :deep(.el-dialog__footer) {
    padding: 12px 20px 20px;
    flex-direction: column;
    gap: 12px;
  }
  
  .custom-dialog :deep(.el-button) {
    width: 100%;
    padding: 14px 24px;
  }
}
</style>

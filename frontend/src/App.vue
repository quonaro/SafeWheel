<template>
  <div id="app">
    <div class="app-container">
      <div class="sidebar" :class="{ expanded: isMenuExpanded }">
        <div class="sidebar-content">
          <nav class="nav-menu">
            <div class="nav-item back-item" :class="{
              disabled: !selectedCompetitionId
            }" @click="selectedCompetitionId && backToSelector()">
              <el-icon>
                <ArrowLeft />
              </el-icon>
              <span v-if="isMenuExpanded" class="nav-text">Назад</span>
            </div>

            <div class="nav-item stages-item" :class="{
              active: activeTab === 'stages' && selectedCompetitionId,
              disabled: !selectedCompetitionId
            }" @click="selectedCompetitionId && setActiveTab('stages')">
              <el-icon>
                <List />
              </el-icon>
              <span v-if="isMenuExpanded" class="nav-text">Этапы</span>
              <div v-if="selectedCompetitionId && stagesCount > 0" class="nav-badge">
                {{ stagesCount }}
              </div>
            </div>

            <div class="nav-item teams-item" :class="{
              active: activeTab === 'teams' && selectedCompetitionId,
              disabled: !selectedCompetitionId
            }" @click="selectedCompetitionId && setActiveTab('teams')">
              <el-icon>
                <UserFilled />
              </el-icon>
              <span v-if="isMenuExpanded" class="nav-text">Команды</span>
              <div v-if="selectedCompetitionId && teamsCount > 0" class="nav-badge">
                {{ teamsCount }}
              </div>
            </div>

            <div class="nav-item results-item" :class="{
              active: activeTab === 'results' && selectedCompetitionId,
              disabled: !selectedCompetitionId
            }" @click="selectedCompetitionId && setActiveTab('results')">
              <el-icon>
                <Edit />
              </el-icon>
              <span v-if="isMenuExpanded" class="nav-text">Заполнение результатов</span>
            </div>

            <div class="nav-item standings-item" :class="{
              active: activeTab === 'standings' && selectedCompetitionId,
              disabled: !selectedCompetitionId
            }" @click="selectedCompetitionId && setActiveTab('standings')">
              <el-icon>
                <TrophyBase />
              </el-icon>
              <span v-if="isMenuExpanded" class="nav-text">Результаты</span>
            </div>

            <div class="nav-item settings-item" :class="{
              active: activeTab === 'settings' && selectedCompetitionId,
              disabled: !selectedCompetitionId
            }" @click="selectedCompetitionId && setActiveTab('settings')">
              <el-icon>
                <Setting />
              </el-icon>
              <span v-if="isMenuExpanded" class="nav-text">Настройки</span>
            </div>

            <!-- Кнопка сворачивания/разворачивания меню -->
            <div class="nav-item toggle-item" @click="toggleMenu">
              <el-icon>
                <Expand v-if="!isMenuExpanded" />
                <Fold v-else />
              </el-icon>
              <span v-if="isMenuExpanded" class="nav-text">
                {{ isMenuExpanded ? 'Свернуть' : 'Развернуть' }}
              </span>
            </div>
          </nav>
        </div>
      </div>

      <div class="main-content">
        <div class="content-card">
          <div v-if="!selectedCompetitionId" class="competition-selector">
            <div class="selector-header">
              <div class="header-content">
                <div class="header-actions">
                  <el-button type="primary" @click="openCreateDialog" class="create-button" size="large">
                    <el-icon>
                      <Plus />
                    </el-icon>
                    Создать конкурс
                  </el-button>
                </div>
              </div>
            </div>

            <div class="competition-list">
              <div v-for="competition in competitions" :key="competition.id" class="competition-card"
                @click="selectCompetition(competition.id)">
                <div class="competition-icon">{{ competition.emoji || '🏆' }}</div>
                <div class="competition-info">
                  <h3>{{ competition.name }}</h3>
                  <p>{{ competition.description || 'Конкурс "Безопасное колесо"' }}</p>
                </div>
                <div class="competition-arrow">→</div>
              </div>
            </div>
          </div>

          <CompetitionsManager v-else :active-tab="activeTab" :competition-id="selectedCompetitionId"
            :refresh-counts="refreshCounts" @tab-change="handleTabChange" @back-to-selector="backToSelector" />
        </div>
      </div>
    </div>

    <!-- Диалог создания конкурса -->
    <el-dialog v-model="createDialogVisible" title="Создать новый конкурс" width="580px" class="custom-dialog">
      <el-form :model="competitionForm" label-width="120px">
        <el-form-item label="Название">
          <el-input v-model="competitionForm.name" placeholder="Введите название конкурса" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="competitionForm.description" type="textarea" :rows="3"
            placeholder="Введите описание конкурса (необязательно)" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="Эмодзи">
          <div class="emoji-selector">
            <div class="emoji-preview">
              <span class="preview-emoji">{{ competitionForm.emoji }}</span>
            </div>
            <div class="emoji-grid">
              <div v-for="emoji in availableEmojis" :key="emoji" class="emoji-option"
                :class="{ active: competitionForm.emoji === emoji }" @click="competitionForm.emoji = emoji">
                {{ emoji }}
              </div>
            </div>
          </div>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CompetitionsManager from './components/CompetitionsManager.vue'
import { UserFilled, List, Edit, TrophyBase, Plus, ArrowLeft, Setting, Expand, Fold } from '@element-plus/icons-vue'

const activeTab = ref('teams')
const selectedCompetitionId = ref(null)
const competitions = ref([])
const createDialogVisible = ref(false)
const competitionForm = reactive({ name: '', description: '', emoji: '🏆' })
const isMenuExpanded = ref(true) // Меню развернуто по умолчанию
const stagesCount = ref(0)
const teamsCount = ref(0)

// Список доступных эмодзи для выбора
const availableEmojis = [
  '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱',
  '🚗', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒',
  '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲',
  '🎯', '🎪', '🎨', '🎭', '🎪', '🎡', '🎢', '🎠',
  '🌟', '⭐', '💫', '✨', '🔥', '💎', '🎊', '🎉',
  '🏁', '🏃', '🏃‍♂️', '🏃‍♀️', '🚶', '🚶‍♂️', '🚶‍♀️', '💪',
  '🎓', '👨‍🎓', '👩‍🎓', '🎖️', '🏆', '🥇', '🥈', '🥉'
]

const api = window.electronAPI?.database

const setActiveTab = (tab) => {
  activeTab.value = tab
}

const toggleMenu = () => {
  isMenuExpanded.value = !isMenuExpanded.value
}

// Загрузка количества этапов и команд
const loadCounts = async () => {
  if (!selectedCompetitionId.value || !api) return

  try {
    const stages = await api.listStages(selectedCompetitionId.value)
    const teams = await api.listTeams(selectedCompetitionId.value)

    stagesCount.value = stages?.length || 0
    teamsCount.value = teams?.length || 0
  } catch (error) {
    console.error('Ошибка загрузки количества этапов и команд:', error)
    stagesCount.value = 0
    teamsCount.value = 0
  }
}

const handleTabChange = (tab) => {
  activeTab.value = tab
}

const selectCompetition = async (competitionId) => {
  selectedCompetitionId.value = competitionId
  activeTab.value = 'teams'
  await loadCounts()
}

const backToSelector = () => {
  selectedCompetitionId.value = null
}

const openCreateDialog = () => {
  competitionForm.name = ''
  competitionForm.description = ''
  competitionForm.emoji = '🏆'
  createDialogVisible.value = true
}

const createCompetition = async () => {
  try {
    if (!competitionForm.name?.trim()) throw new Error('Укажите название')
    const payload = {
      name: String(competitionForm.name || '').trim(),
      description: String(competitionForm.description || '').trim(),
      emoji: String(competitionForm.emoji || '🏆')
    }
    const created = await api.createCompetition(payload)
    competitions.value.unshift(created)
    createDialogVisible.value = false
    ElMessage.success('Конкурс создан')
    await selectCompetition(created.id)
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка')
  }
}

const loadCompetitions = async () => {
  if (!api) return
  competitions.value = await api.listCompetitions()
}

// Функция для обновления количества (можно вызывать из дочерних компонентов)
const refreshCounts = async () => {
  if (selectedCompetitionId.value) {
    await loadCounts()
  }
}

// Watcher для обновления количества при изменении активной вкладки
watch(activeTab, async () => {
  if (selectedCompetitionId.value) {
    await loadCounts()
  }
})

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
  width: 70px;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  min-width: 70px;
  max-width: 70px;
  transition: all 0.3s ease;
}

.sidebar.expanded {
  width: 200px;
  min-width: 200px;
  max-width: 200px;
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
  justify-content: flex-start;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: #8b5cf6;
  margin-bottom: 8px;
  position: relative;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border: 1px solid rgba(139, 92, 246, 0.1);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);
  gap: 8px;
  padding: 0 12px;
  min-width: 48px;
}

/* Базовые стили применяются только к кнопкам без специальных классов */
.nav-item:not(.stages-item):not(.teams-item):not(.results-item):not(.standings-item):not(.settings-item):not(.back-item):not(.toggle-item) {
  color: #8b5cf6;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-color: rgba(139, 92, 246, 0.1);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);
}

.sidebar.expanded .nav-item {
  width: auto;
  min-width: 48px;
  justify-content: flex-start;
}

.nav-item:hover {
  transform: translateY(-2px) scale(1.02);
}

.nav-item.active {
  transform: translateY(-2px) scale(1.05);
}

/* Базовые стили hover и active применяются только к кнопкам без специальных классов */
.nav-item:not(.stages-item):not(.teams-item):not(.results-item):not(.standings-item):not(.settings-item):not(.back-item):not(.toggle-item):hover {
  background: linear-gradient(135deg, #ede9fe, #e0e7ff);
  color: #7c3aed;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.2);
}

.nav-item:not(.stages-item):not(.teams-item):not(.results-item):not(.standings-item):not(.settings-item):not(.back-item):not(.toggle-item).active {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  border-color: transparent;
}

.nav-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-color: rgba(107, 114, 128, 0.1);
  color: #9ca3af;
  box-shadow: none;
}

.nav-item.disabled:hover {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  transform: none;
  color: #9ca3af;
  box-shadow: none;
}


.nav-item .el-icon {
  font-size: 20px;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.nav-item:hover .el-icon {
  transform: scale(1.1);
}

.nav-item.active .el-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.nav-text {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.3s ease;
  opacity: 1;
  max-width: 120px;
  flex-shrink: 0;
}

.sidebar:not(.expanded) .nav-text {
  opacity: 0;
  width: 0;
  max-width: 0;
  margin: 0;
  overflow: hidden;
}

.nav-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 10;
  animation: badgePulse 2s infinite;
}

@keyframes badgePulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
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

/* Стили для кнопки "назад" */
.nav-item.back-item {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #dc2626;
  margin-bottom: 16px;
}

.nav-item.back-item:hover {
  background: linear-gradient(135deg, #fecaca, #fca5a5);
  color: #b91c1c;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

.nav-item.back-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-color: rgba(107, 114, 128, 0.1);
  color: #9ca3af;
  box-shadow: none;
}

.nav-item.back-item.disabled:hover {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  transform: none;
  color: #9ca3af;
  box-shadow: none;
}

/* Стили для кнопки переключения меню */
.nav-item.toggle-item {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 1px solid rgba(14, 165, 233, 0.2);
  color: #0ea5e9;
  margin-top: auto;
}

.nav-item.toggle-item:hover {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  color: #0284c7;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.15);
  border-color: rgba(14, 165, 233, 0.3);
}

/* Цвета для разных кнопок */
.nav-item.stages-item {
  color: #059669;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-color: rgba(5, 150, 105, 0.2);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.08);
}

.nav-item.stages-item:hover {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #047857;
  box-shadow: 0 8px 24px rgba(5, 150, 105, 0.15);
  border-color: rgba(5, 150, 105, 0.3);
}

.nav-item.stages-item.active {
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.3);
}

.nav-item.teams-item {
  color: #dc2626;
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border-color: rgba(220, 38, 38, 0.2);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.08);
}

.nav-item.teams-item:hover {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #b91c1c;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.3);
}

.nav-item.teams-item.active {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
}

.nav-item.results-item {
  color: #7c3aed;
  background: linear-gradient(135deg, #faf5ff, #f3e8ff);
  border-color: rgba(124, 58, 237, 0.2);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08);
}

.nav-item.results-item:hover {
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  color: #6d28d9;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.15);
  border-color: rgba(124, 58, 237, 0.3);
}

.nav-item.results-item.active {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
}

.nav-item.standings-item {
  color: #ea580c;
  background: linear-gradient(135deg, #fff7ed, #fed7aa);
  border-color: rgba(234, 88, 12, 0.2);
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.08);
}

.nav-item.standings-item:hover {
  background: linear-gradient(135deg, #fed7aa, #fdba74);
  color: #c2410c;
  box-shadow: 0 8px 24px rgba(234, 88, 12, 0.15);
  border-color: rgba(234, 88, 12, 0.3);
}

.nav-item.standings-item.active {
  background: linear-gradient(135deg, #ea580c, #c2410c);
  color: white;
  box-shadow: 0 4px 16px rgba(234, 88, 12, 0.3);
}

.nav-item.settings-item {
  color: #0891b2;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-color: rgba(8, 145, 178, 0.2);
  box-shadow: 0 2px 8px rgba(8, 145, 178, 0.08);
}

.nav-item.settings-item:hover {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  color: #0e7490;
  box-shadow: 0 8px 24px rgba(8, 145, 178, 0.15);
  border-color: rgba(8, 145, 178, 0.3);
}

.nav-item.settings-item.active {
  background: linear-gradient(135deg, #0891b2, #0e7490);
  color: white;
  box-shadow: 0 4px 16px rgba(8, 145, 178, 0.3);
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
  padding: 20px;
  height: 100%;
  overflow: visible;
  position: relative;
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
  justify-content: flex-start;
  padding: 60px 40px;
  background: #ffffff;
  border-radius: 20px;
  position: relative;
  overflow: visible;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.selector-header {
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 30px;
}

.header-text {
  flex: 1;
  text-align: left;
}

.header-text h1 {
  font-size: 42px;
  font-weight: 800;
  margin: 0 0 16px 0;
  color: #1f2937;
}

.header-text p {
  color: #6b7280;
  font-size: 18px;
  margin: 0;
  font-weight: 400;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.create-button {
  background: #3b82f6;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
  transition: all 0.3s ease;
}

.create-button:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.create-button .el-icon {
  margin-right: 8px;
  font-size: 18px;
}

.competition-list {
  width: 100%;
  max-width: 1400px;
  display: flex;
  flex-wrap: wrap;
  gap: clamp(16px, 2.5vw, 32px);
  position: relative;
  z-index: 1;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 40px 20px;
  margin: 0;
}






.competition-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: clamp(14px, 1.8vw, 20px);
  padding: clamp(16px, 2.5vw, 28px);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-height: clamp(160px, 20vw, 220px);
  width: clamp(200px, 16vw, 260px);
  flex: 0 0 auto;
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
  font-size: clamp(24px, 3vw, 40px);
  width: clamp(45px, 6vw, 65px);
  height: clamp(45px, 6vw, 65px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  border-radius: clamp(10px, 1.2vw, 16px);
  color: white;
  margin-bottom: clamp(8px, 1.5vw, 16px);
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
  font-size: clamp(14px, 1.8vw, 20px);
  font-weight: 700;
  margin: 0 0 clamp(3px, 0.6vw, 8px) 0;
  color: #1f2937;
  transition: color 0.3s ease;
}

.competition-card:hover .competition-info h3 {
  color: #3b82f6;
}

.competition-info p {
  font-size: clamp(10px, 1.2vw, 14px);
  color: #6b7280;
  margin: 0;
  font-weight: 500;
  line-height: 1.4;
}

.competition-arrow {
  font-size: clamp(14px, 2vw, 22px);
  color: #9ca3af;
  transition: all 0.3s ease;
  margin-top: clamp(6px, 1vw, 12px);
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

.custom-dialog :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  color: #374151;
  font-size: 16px;
  padding: 12px 16px;
  resize: vertical;
  min-height: 80px;
}

.custom-dialog :deep(.el-textarea__inner:hover) {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.custom-dialog :deep(.el-textarea__inner:focus) {
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.custom-dialog :deep(.el-textarea__inner::placeholder) {
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


/* Стили для селектора эмодзи */
.emoji-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.emoji-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
  background: #3b82f6;
  border-radius: 12px;
  margin: 0 auto;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.preview-emoji {
  font-size: 24px;
  color: white;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.5);
}

.emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.emoji-option:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  transform: scale(1.1);
}

.emoji-option.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>

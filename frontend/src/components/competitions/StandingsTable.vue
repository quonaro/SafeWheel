<template>
  <div class="standings-container">
    <div class="standings-header">
      <h2 class="standings-title">
        <el-icon class="title-icon">
          <Trophy />
        </el-icon>
        Результаты соревнования
      </h2>
      <el-button type="primary" @click="openExportDialog" class="export-button">
        <el-icon>
          <Download />
        </el-icon>
        Экспорт в Word
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="results-tabs">
      <el-tab-pane name="overall">
        <template #label>
          <div class="tab-label">
            <el-icon class="tab-icon">
              <Trophy />
            </el-icon>
            <span>Общие результаты</span>
            <el-badge v-if="rows.length > 0" :value="rows.length" class="tab-badge" />
          </div>
        </template>
        <div class="table-container">
          <el-table :data="paginatedRows" style="width: 100%"
            :class="['modern-table', { 'empty-table': rows.length === 0 }]" :max-height="460"
            empty-text="Нет данных для отображения">
            <el-table-column prop="rank" label="Место" :width="rows.length > 0 ? 100 : 0">
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
            <el-table-column prop="team_name" label="Команда" :min-width="rows.length > 0 ? 150 : 0">
              <template #default="scope">
                <div class="team-cell">
                  <span class="team-name">{{ scope.row.team_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="total_penalties" label="Штрафы" :width="rows.length > 0 ? 100 : 0">
              <template #default="scope">
                <div class="penalty-cell">
                  <span class="penalty-value">{{ scope.row.total_penalties }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="total_time" label="Время" :width="rows.length > 0 ? 120 : 0">
              <template #default="scope">
                <div class="time-cell">
                  <span class="time-value">{{ formatTime(scope.row.total_time) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="participant_count" label="Участников" :width="rows.length > 0 ? 100 : 0">
              <template #default="scope">
                <div class="participant-count-cell" :class="{ 'incomplete-team': scope.row.is_incomplete_team }">
                  <span class="participant-count-value">{{ scope.row.participant_count }}</span>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <!-- Пагинация -->
          <div v-if="rows.length > pageSize" class="pagination-container">
            <el-pagination :key="`pagination-${rows.length}-${pageSize}`" v-model:current-page="currentPage"
              :page-size="pageSize" :total="rows.length" layout="pager" :page-sizes="[10, 20, 50, 100]"
              @size-change="handleSizeChange" @current-change="handleCurrentChange" class="modern-pagination" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="stages">
        <template #label>
          <div class="tab-label">
            <el-icon class="tab-icon">
              <List />
            </el-icon>
            <span>Результаты по этапам</span>
          </div>
        </template>
        <StageResultsTable :competition-id="competitionId" />
      </el-tab-pane>

      <el-tab-pane name="participants">
        <template #label>
          <div class="tab-label">
            <el-icon class="tab-icon">
              <User />
            </el-icon>
            <span>Личностные</span>
          </div>
        </template>
        <ParticipantResultsTable :competition-id="competitionId" />
      </el-tab-pane>
    </el-tabs>

    <!-- Диалог экспорта в Word -->
    <el-dialog v-model="showExportDialog" title="Экспорт результатов в Word" width="600px" class="export-dialog">
      <div class="export-form">
        <!-- Выбор типа экспорта -->
        <div class="form-section">
          <h3 class="section-title">
            <el-icon class="section-icon">
              <Trophy />
            </el-icon>
            Тип отчета
          </h3>
          <div class="export-type-group">
            <div class="export-option" :class="{ active: exportForm.exportType === 'general' }"
              @click="exportForm.exportType = 'general'">
              <div class="option-content">
                <el-icon class="option-icon">
                  <Trophy />
                </el-icon>
                <div class="option-text">
                  <div class="option-title">Общие результаты</div>
                  <div class="option-description">Общая таблица команд с местами</div>
                </div>
              </div>
            </div>

            <div class="export-option" :class="{ active: exportForm.exportType === 'stages' }"
              @click="exportForm.exportType = 'stages'">
              <div class="option-content">
                <el-icon class="option-icon">
                  <List />
                </el-icon>
                <div class="option-text">
                  <div class="option-title">Результаты по этапам</div>
                  <div class="option-description">Детальные результаты по каждому этапу</div>
                </div>
              </div>
            </div>

            <div class="export-option" :class="{ active: exportForm.exportType === 'personal' }"
              @click="exportForm.exportType = 'personal'">
              <div class="option-content">
                <el-icon class="option-icon">
                  <User />
                </el-icon>
                <div class="option-text">
                  <div class="option-title">Личные результаты</div>
                  <div class="option-description">Индивидуальные результаты участников</div>
                </div>
              </div>
            </div>

            <div class="export-option" :class="{ active: exportForm.exportType === 'full' }"
              @click="exportForm.exportType = 'full'">
              <div class="option-content">
                <el-icon class="option-icon">
                  <Document />
                </el-icon>
                <div class="option-text">
                  <div class="option-title">Полный отчет (всё)</div>
                  <div class="option-description">Общие, этапы и личные в одном документе</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Настройки для экспорта этапов -->
        <div v-if="exportForm.exportType === 'stages'" class="form-section">
          <h3 class="section-title">
            <el-icon class="section-icon">
              <List />
            </el-icon>
            Параметры этапов
          </h3>
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <el-radio-group v-model="exportForm.stageMode">
              <el-radio-button label="all">Все этапы</el-radio-button>
              <el-radio-button label="single">Конкретный этап</el-radio-button>
            </el-radio-group>

            <el-select v-model="exportForm.stageId" :disabled="exportForm.stageMode !== 'single'"
              placeholder="Выберите этап" style="min-width: 260px">
              <el-option v-for="stage in stages" :key="stage.id" :label="stage.name" :value="stage.id" />
            </el-select>
          </div>
        </div>


        <!-- Настройка имени файла -->
        <div class="form-section">
          <h3 class="section-title">
            <el-icon class="section-icon">
              <Document />
            </el-icon>
            Имя файла
          </h3>
          <el-input v-model="exportForm.fileName" :placeholder="generateFileName(exportForm.exportType)"
            class="filename-input">
            <template #prepend>
              <el-icon>
                <Document />
              </el-icon>
            </template>
          </el-input>
          <div class="filename-help">
            Если не указано, будет использовано автоматически сгенерированное имя
          </div>
        </div>

        <!-- Информация о формате -->
        <div class="export-info">
          <el-icon class="info-icon">
            <InfoFilled />
          </el-icon>
          <span>Файл будет сохранен в формате Microsoft Word (.docx) в папку "Загрузки"</span>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showExportDialog = false" class="cancel-btn">
            Отмена
          </el-button>
          <el-button type="primary" @click="handleExport"
            :loading="exportLoading.general || exportLoading.stages || exportLoading.personal || exportLoading.full"
            class="export-confirm-btn">
            <el-icon>
              <Download />
            </el-icon>
            Экспортировать
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, reactive } from 'vue'
import { Trophy, List, User, Download, InfoFilled, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import StageResultsTable from './StageResultsTable.vue'
import ParticipantResultsTable from './ParticipantResultsTable.vue'
import wordExportService from '../../services/wordExport.js'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const rows = ref([])
const activeTab = ref('overall')
const currentPage = ref(1)
const pageSize = ref(20) // Оптимальный размер страницы
const showExportDialog = ref(false)
const exportForm = reactive({
  fileName: '',
  exportType: 'general',
  stageMode: 'all', // 'all' | 'single'
  stageId: null,
})
const stages = ref([])

const exportLoading = reactive({
  general: false,
  stages: false,
  personal: false,
  full: false,
})


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
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return rows.value.slice(start, end)
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
    rows.value = []
    return
  }
  rows.value = await api.computeStandings(props.competitionId)
  currentPage.value = 1 // Сбрасываем на первую страницу при загрузке новых данных
  await nextTick() // Ждем обновления DOM
}


watch(() => props.competitionId, () => load(), { immediate: true })

// Функции для работы с экспортом

const generateFileName = (type) => {
  const competitionName = rows.value[0]?.competition_name || 'Соревнование'
  const date = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')

  switch (type) {
    case 'general':
      return `Общие результаты - ${competitionName} - ${date}.docx`
    case 'stages': {
      if (exportForm.stageMode === 'single' && exportForm.stageId) {
        const stage = stages.value.find(s => s.id === exportForm.stageId)
        const stageName = stage?.name || 'Этап'
        return `Результаты этапа - ${stageName} - ${competitionName} - ${date}.docx`
      }
      return `Результаты по этапам - ${competitionName} - ${date}.docx`
    }
    case 'personal':
      return `Личные результаты - ${competitionName} - ${date}.docx`
    case 'full':
      return `Полный отчет - ${competitionName} - ${date}.docx`
    default:
      return `Результаты - ${competitionName} - ${date}.docx`
  }
}

const resetExportForm = () => {
  exportForm.fileName = ''
  exportForm.exportType = 'general'
  exportForm.stageMode = 'all'
  exportForm.stageId = null
}

const openExportDialog = async () => {
  resetExportForm()
  if (props.competitionId) {
    try {
      stages.value = await api.listStages(props.competitionId)
    } catch (e) {
      stages.value = []
    }
  } else {
    stages.value = []
  }
  showExportDialog.value = true
}

// Универсальная функция экспорта
const handleExport = async () => {
  switch (exportForm.exportType) {
    case 'general':
      await exportGeneralResults()
      break
    case 'stages':
      if (exportForm.stageMode === 'single') {
        await exportSingleStageResults()
      } else {
        await exportStageResults()
      }
      break
    case 'personal':
      await exportPersonalResults()
      break
    case 'full':
      await exportFullCompetition()
      break
    default:
      ElMessage.error('Неизвестный тип экспорта')
  }
}

// Функции экспорта в Word
const exportGeneralResults = async () => {
  if (!props.competitionId) return

  exportLoading.general = true
  try {
    const buffer = await wordExportService.exportGeneralResults(props.competitionId)

    // Генерируем имя файла с расширением .docx
    const fileName = exportForm.fileName || generateFileName('general')
    const fileNameWithExt = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`

    // Сохраняем файл
    const filePath = await window.electronAPI.files.saveWordDocument(
      fileNameWithExt,
      buffer
    )

    if (filePath) {
      ElMessage.success(`Файл сохранен: ${filePath}`)
      showExportDialog.value = false
    }
  } catch (error) {
    console.error('Ошибка экспорта:', error)
    ElMessage.error('Ошибка экспорта: ' + error.message)
  } finally {
    exportLoading.general = false
  }
}

const exportStageResults = async () => {
  if (!props.competitionId) return

  exportLoading.stages = true
  try {
    const buffer = await wordExportService.exportStageResults(props.competitionId)

    // Генерируем имя файла с расширением .docx
    const fileName = exportForm.fileName || generateFileName('stages')
    const fileNameWithExt = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`

    // Сохраняем файл
    const filePath = await window.electronAPI.files.saveWordDocument(
      fileNameWithExt,
      buffer
    )

    if (filePath) {
      ElMessage.success(`Файл сохранен: ${filePath}`)
      showExportDialog.value = false
    }
  } catch (error) {
    console.error('Ошибка экспорта:', error)
    ElMessage.error('Ошибка экспорта: ' + error.message)
  } finally {
    exportLoading.stages = false
  }
}

const exportPersonalResults = async () => {
  if (!props.competitionId) return

  exportLoading.personal = true
  try {
    const buffer = await wordExportService.exportPersonalResults(props.competitionId)

    // Генерируем имя файла с расширением .docx
    const fileName = exportForm.fileName || generateFileName('personal')
    const fileNameWithExt = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`

    // Сохраняем файл
    const filePath = await window.electronAPI.files.saveWordDocument(
      fileNameWithExt,
      buffer
    )

    if (filePath) {
      ElMessage.success(`Файл сохранен: ${filePath}`)
      showExportDialog.value = false
    }
  } catch (error) {
    console.error('Ошибка экспорта:', error)
    ElMessage.error('Ошибка экспорта: ' + error.message)
  } finally {
    exportLoading.personal = false
  }
}

const exportSingleStageResults = async () => {
  if (!props.competitionId || !exportForm.stageId) {
    ElMessage.error('Выберите этап')
    return
  }

  exportLoading.stages = true
  try {
    const buffer = await wordExportService.exportSingleStageResults(
      props.competitionId,
      exportForm.stageId
    )

    const fileName = exportForm.fileName || generateFileName('stages')
    const fileNameWithExt = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`

    const filePath = await window.electronAPI.files.saveWordDocument(
      fileNameWithExt,
      buffer
    )

    if (filePath) {
      ElMessage.success(`Файл сохранен: ${filePath}`)
      showExportDialog.value = false
    }
  } catch (error) {
    console.error('Ошибка экспорта:', error)
    ElMessage.error('Ошибка экспорта: ' + error.message)
  } finally {
    exportLoading.stages = false
  }
}

const exportFullCompetition = async () => {
  if (!props.competitionId) return

  exportLoading.full = true
  try {
    const buffer = await wordExportService.exportFullCompetition(props.competitionId)

    const fileName = exportForm.fileName || generateFileName('full')
    const fileNameWithExt = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`

    const filePath = await window.electronAPI.files.saveWordDocument(
      fileNameWithExt,
      buffer
    )

    if (filePath) {
      ElMessage.success(`Файл сохранен: ${filePath}`)
      showExportDialog.value = false
    }
  } catch (error) {
    console.error('Ошибка экспорта:', error)
    ElMessage.error('Ошибка экспорта: ' + error.message)
  } finally {
    exportLoading.full = false
  }
}
</script>

<style scoped>
/* Контейнер для растягивания на всю высоту */
.standings-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Заголовок с кнопкой экспорта */
.standings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 4px;
}

.standings-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.title-icon {
  font-size: 28px;
  color: #f59e0b;
}

.export-button {
  height: 40px;
  padding: 0 20px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  transition: all 0.3s ease;
}

.export-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
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

/* Включаем скролл для таблицы */
.modern-table :deep(.el-table__body-wrapper) {
  overflow-y: auto;
  overflow-x: auto;
}

.modern-table :deep(.el-table__header-wrapper) {
  overflow: hidden;
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
  padding: 8px 10px;
  border: none;
  text-align: center;
  white-space: nowrap;
}

.modern-table :deep(.el-table__body tr) {
  transition: all 0.3s ease;
}

.modern-table :deep(.el-table__body tr:hover) {
  background: rgba(59, 130, 246, 0.05);
}

.modern-table :deep(.el-table__body td) {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* Центрирование ячеек данных */
.modern-table :deep(.el-table__body td:nth-child(1)),
/* Место */
.modern-table :deep(.el-table__body td:nth-child(3)),
/* Штрафы */
.modern-table :deep(.el-table__body td:nth-child(4)),
/* Время */
.modern-table :deep(.el-table__body td:nth-child(5)),
/* Возраст */
.modern-table :deep(.el-table__body td:nth-child(6)) {
  /* Участников */
  text-align: center;
}

/* Стили для ячеек */
.rank-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  margin: 0 auto;
  background: #4b5563;
  border: 2px solid #374151;
}

.rank-number {
  font-weight: 700;
  color: white;
  font-size: 12px;
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
  font-size: 18px;
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
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  min-height: 18px;
}

.team-name {
  font-weight: 600;
  color: #1e40af;
  font-size: 13px;
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



.participant-count-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  min-height: 20px;
}

.participant-count-cell.incomplete-team {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.participant-count-value {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.participant-count-cell.incomplete-team .participant-count-value {
  color: #dc2626;
}

/* Заголовок таблицы */
.table-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

/* Стили для вкладок */
.results-tabs {
  margin-top: 12px;
  width: 100%;
  overflow: visible;
}

.results-tabs :deep(.el-tabs__header) {
  margin: 0 0 20px 0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  overflow: visible;
}

.results-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 8px;
  overflow: visible;
}

.results-tabs :deep(.el-tabs__nav) {
  overflow: visible;
}

.results-tabs :deep(.el-tabs__item) {
  padding: 10px 16px;
  font-weight: 500;
  color: #64748b;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  min-width: fit-content;
  position: relative;
  overflow: visible;
  font-size: 14px;
  margin: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.results-tabs :deep(.el-tabs__item.is-active) {
  background: none;
  color: #3b82f6;
  box-shadow: none;
}

.el-tabs__nav-wrap:after {
  background: none;
}

.results-tabs :deep(.el-tabs__item:last-child) {
  padding-right: 12px !important;
}

.results-tabs :deep(.el-tabs__item:nth-child(2)) {
  padding-left: 12px !important;
}

.results-tabs :deep(.el-tabs__nav.is-top) {
  gap: 5px;
}

.results-tabs :deep(.el-tabs__item:hover) {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.results-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.results-tabs :deep(.el-tabs__content) {
  padding: 0;
  overflow: visible;
}

/* Стили для лейблов вкладок */
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.tab-icon {
  font-size: 14px;
  transition: color 0.2s ease;
}

.results-tabs :deep(.el-tabs__item.is-active) .tab-icon {
  color: #3b82f6;
}

.tab-badge {
  margin-left: 4px;
}

.tab-badge :deep(.el-badge__content) {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  line-height: 16px;
}

/* Стили для пагинации */
.pagination-container {
  display: flex;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.modern-pagination :deep(.el-pagination) {
  --el-pagination-font-size: 13px;
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: #64748b;
  --el-pagination-border-radius: 6px;
  --el-pagination-button-color: #64748b;
  --el-pagination-button-disabled-color: #d1d5db;
  --el-pagination-hover-color: #3b82f6;
}

.modern-pagination :deep(.el-pagination .btn-prev),
.modern-pagination :deep(.el-pagination .btn-next) {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 10px;
  margin: 0 2px;
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
  border-radius: 6px;
  margin: 0 1px;
  min-width: 32px;
  height: 32px;
  line-height: 30px;
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


.table-container {
  width: 100%;
  max-width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  /* Позволяет контейнеру сжиматься */
}

.table-container .modern-table {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-width: 800px;
}

/* Стилизация скроллбара для таблицы */
.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
}

.modern-table :deep(.el-table__body-wrapper)::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0.05);
}

/* Стили скроллбара для Firefox */
.modern-table :deep(.el-table__body-wrapper) {
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.3) rgba(0, 0, 0, 0.05);
}

.modern-table :deep(.cell) {
  white-space: normal;
  word-break: break-word;
}


/* Адаптивность */
@media (max-width: 768px) {
  .results-tabs :deep(.el-tabs__header) {
    padding: 4px;
    border-radius: 8px;
    margin: 0 0 16px 0;
  }

  .results-tabs :deep(.el-tabs__nav-wrap) {
    padding: 0 4px;
  }

  .results-tabs :deep(.el-tabs__item) {
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    margin: 0 2px;
  }

  .tab-label {
    gap: 6px;
  }

  .tab-icon {
    font-size: 14px;
  }

  .tab-badge :deep(.el-badge__content) {
    font-size: 10px;
    min-width: 16px;
    height: 16px;
    line-height: 14px;
  }

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
  .time-cell {
    padding: 2px 4px;
  }

  .team-name,
  .penalty-value,
  .time-value {
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

@media (max-width: 480px) {
  .results-tabs :deep(.el-tabs__header) {
    padding: 3px;
    border-radius: 6px;
  }

  .results-tabs :deep(.el-tabs__item) {
    padding: 6px 8px;
    font-size: 13px;
    margin: 0 1px;
  }

  .results-tabs :deep(.el-tabs__nav-wrap) {
    padding: 0 2px;
  }

  .tab-label {
    gap: 4px;
  }

  .tab-icon {
    font-size: 12px;
  }

  .tab-badge :deep(.el-badge__content) {
    font-size: 9px;
    min-width: 14px;
    height: 14px;
    line-height: 12px;
  }



  .modern-pagination :deep(.el-pagination) {
    --el-pagination-font-size: 12px;
  }

  .modern-pagination :deep(.el-pagination .btn-prev),
  .modern-pagination :deep(.el-pagination .btn-next) {
    padding: 4px 8px;
    margin: 0 1px;
  }

  .modern-pagination :deep(.el-pagination .el-pager li) {
    min-width: 28px;
    height: 28px;
    line-height: 26px;
    margin: 0 1px;
  }

  .modern-pagination :deep(.el-pagination .el-pagination__total),
  .modern-pagination :deep(.el-pagination .el-pagination__jump) {
    display: none;
  }
}

/* Стили для диалога экспорта */
.export-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e5e7eb;
  padding: 20px 24px 16px;
}

.export-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.export-options h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.export-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.export-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.export-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #0369a1;
  font-size: 14px;
}

.info-icon {
  font-size: 16px;
  color: #0ea5e9;
}

/* Стили для улучшенной формы экспорта */
.export-form {
  padding: 0;
}

.form-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.section-icon {
  font-size: 18px;
  color: #6366f1;
}

.export-type-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-option {
  margin: 0;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s ease;
  width: 100%;
  cursor: pointer;
  background: #ffffff;
}

.export-option:hover {
  border-color: #6366f1;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

.export-option.active {
  border-color: #6366f1;
  background: linear-gradient(135deg, #f0f4ff, #e0e7ff);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.option-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  width: 100%;
}

.option-icon {
  font-size: 20px;
  color: #6366f1;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
}

.option-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.option-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.directory-selector {
  width: 100%;
}

.directory-input {
  width: 100%;
}

.directory-input :deep(.el-input__inner) {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding-right: 120px;
}

.select-directory-btn {
  margin-right: 8px;
  font-weight: 500;
}

.filename-input {
  width: 100%;
}

.filename-input :deep(.el-input-group__prepend) {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-right: none;
}

.filename-input :deep(.el-input__inner) {
  border-left: none;
}

.filename-help {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0 0 0;
  border-top: 1px solid #e5e7eb;
  margin-top: 24px;
}

.cancel-btn {
  padding: 10px 20px;
  font-weight: 500;
}

.export-confirm-btn {
  padding: 10px 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.3s ease;
}

.export-confirm-btn:hover {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.export-confirm-btn:disabled {
  background: #9ca3af;
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}
</style>

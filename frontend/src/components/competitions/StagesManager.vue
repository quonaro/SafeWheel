<template>
  <div class="stages-container">
    <el-row :gutter="12" class="mb-12">
      <el-col :span="18">
        <el-input v-model="stageForm.name" placeholder="Название этапа" />
      </el-col>
      <el-col :span="6">
        <el-button type="primary" :disabled="!stageForm.name.trim()" @click="addStage">Добавить этап</el-button>
      </el-col>
    </el-row>

    <div class="table-scroll">
      <el-table :data="stages" style="width: 100%" :class="['modern-table', { 'empty-table': stages.length === 0 }]"
        height="100%" empty-text="Нет данных для отображения">
        <el-table-column type="index" label="#" :width="stages.length > 0 ? 80 : 0" />
        <el-table-column prop="name" label="Название" :min-width="stages.length > 0 ? 200 : 0">
          <template #default="scope">
            <div class="editable-cell" @click="editStageInline(scope.row)">
              <span v-if="!scope.row.editing">{{ scope.row.name }}</span>
              <el-input v-else v-model="scope.row.name" @blur="saveStageInline(scope.row)"
                @keyup.enter="saveStageInline(scope.row)" @keyup.escape="cancelEdit(scope.row)" ref="stageInput"
                size="small" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Действия" :width="stages.length > 0 ? 120 : 0">
          <template #default="scope">
            <el-button size="small" type="danger" @click="removeStage(scope.row.id)" class="delete-btn">
              <el-icon>
                <Delete />
              </el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="stageDialog" title="Редактировать этап" width="480px">
      <el-form :model="stageForm" label-width="120px">
        <el-form-item label="Название"><el-input v-model="stageForm.name" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageDialog = false">Отмена</el-button>
        <el-button type="primary" @click="saveStage">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

const props = defineProps({
  competitionId: { type: Number, required: false },
  refreshCounts: { type: Function, default: () => { } }
})
const api = window.electronAPI?.database

const stages = ref([])
const stageDialog = ref(false)
const currentStageId = ref(null)
const stageForm = reactive({ name: '' })

const load = async () => {
  if (!props.competitionId) { stages.value = []; return }
  stages.value = await api.listStages(props.competitionId)
}

watch(() => props.competitionId, () => load(), { immediate: true })

const addStage = async () => {
  try {
    const payload = {
      name: String(stageForm.name || '').trim()
    }
    const created = await api.createStage(props.competitionId, payload)
    stages.value.push(created)
    Object.assign(stageForm, { name: '' })
    await props.refreshCounts()
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка добавления этапа')
  }
}

const editStage = (s) => {
  currentStageId.value = s.id
  Object.assign(stageForm, { name: s.name })
  stageDialog.value = true
}

const saveStage = async () => {
  try {
    const payload = {
      name: String(stageForm.name || '').trim()
    }
    const saved = await api.updateStage(currentStageId.value, payload)
    const idx = stages.value.findIndex(s => s.id === saved.id)
    if (idx >= 0) stages.value[idx] = saved
    stageDialog.value = false
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка сохранения')
  }
}

const removeStage = async (id) => {
  await api.deleteStage(id)
  stages.value = stages.value.filter(s => s.id !== id)
  await props.refreshCounts()
}

// Inline редактирование этапа
const editStageInline = (stage) => {
  stage.editing = true
  stage.originalName = stage.name
  nextTick(() => {
    const input = document.querySelector('.editable-cell input')
    if (input) input.focus()
  })
}

const saveStageInline = async (stage) => {
  if (!stage.name.trim()) {
    stage.name = stage.originalName
    stage.editing = false
    return
  }
  try {
    const payload = { name: String(stage.name || '').trim() }
    const saved = await api.updateStage(stage.id, payload)
    Object.assign(stage, saved)
    stage.editing = false
    ElMessage.success('Этап обновлен')
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка обновления этапа')
    stage.name = stage.originalName
    stage.editing = false
  }
}

const cancelEdit = (stage) => {
  if (stage.originalName) {
    stage.name = stage.originalName
  }
  stage.editing = false
}
</script>

<style scoped>
/* Контейнер для растягивания на всю высоту */
.stages-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Современные стили для таблицы этапов */
.modern-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-height: 200px;
  width: 100%;
  min-width: 600px;
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

/* Редактируемые ячейки */
.editable-cell {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: all 0.2s ease;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.editable-cell:hover {
  background: rgba(59, 130, 246, 0.1);
}

.editable-cell.editing {
  background: rgba(59, 130, 246, 0.15);
  padding: 0;
}

.editable-cell input {
  width: 100%;
}

/* Кнопка удаления */
.delete-btn {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.delete-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.table-scroll {
  width: 100%;
  max-width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 600px;
  flex: 1;
  min-height: 400px;
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

/* Адаптивность */
@media (max-width: 768px) {

  .modern-table :deep(.el-table__header th),
  .modern-table :deep(.el-table__body td) {
    padding: 8px 6px;
    font-size: 13px;
  }

  .table-scroll {
    min-width: 100%;
  }
}
</style>

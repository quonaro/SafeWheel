<template>
  <div>
    <el-row :gutter="12" class="mb-12">
      <el-col :span="18">
        <el-input v-model="stageForm.name" placeholder="Название этапа" />
      </el-col>
      <el-col :span="6">
        <el-button type="primary" :disabled="!stageForm.name.trim()" @click="addStage">Добавить этап</el-button>
      </el-col>
    </el-row>

    <div class="table-scroll">
      <el-table :data="stages" style="width: 100%" class="modern-table">
        <el-table-column type="index" label="#" width="80" />
        <el-table-column prop="name" label="Название">
          <template #default="scope">
            <div class="editable-cell" @click="editStageInline(scope.row)">
              <span v-if="!scope.row.editing">{{ scope.row.name }}</span>
              <el-input v-else v-model="scope.row.name" @blur="saveStageInline(scope.row)"
                @keyup.enter="saveStageInline(scope.row)" @keyup.escape="cancelEdit(scope.row)" ref="stageInput"
                size="small" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="120">
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

const props = defineProps({ competitionId: { type: Number, required: false } })
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
/* Современные стили для таблицы этапов */
.modern-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  padding: 16px 12px;
  border: none;
}

.modern-table :deep(.el-table__body tr) {
  transition: all 0.3s ease;
}

.modern-table :deep(.el-table__body tr:hover) {
  background: rgba(59, 130, 246, 0.05);
}

.modern-table :deep(.el-table__body td) {
  padding: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* Редактируемые ячейки */
.editable-cell {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  min-height: 24px;
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
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 800px;
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

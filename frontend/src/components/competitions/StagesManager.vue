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

    <el-table :data="stages" style="width: 100%">
      <el-table-column type="index" label="#" width="80" />
      <el-table-column prop="name" label="Название" />
      <el-table-column label="Действия" width="180">
        <template #default="scope">
          <el-button size="small" @click="editStage(scope.row)">Редактировать</el-button>
          <el-button size="small" type="danger" @click="removeStage(scope.row.id)">Удалить</el-button>
        </template>
      </el-table-column>
    </el-table>

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
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

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
</script>

<style scoped>
/* Component-specific styles only */
</style>



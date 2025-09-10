<template>
  <div class="competitions">
    <el-row :gutter="12" class="mb-12">
      <el-col :span="16">
        <el-select v-model="currentCompetitionId" placeholder="Выберите конкурс" style="width: 100%" @change="loadAll">
          <el-option v-for="c in competitions" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-col>
      <el-col :span="8" class="text-right">
        <el-button type="primary" @click="openCompetitionDialog()">
          <el-icon><Plus /></el-icon>
          Новый конкурс
        </el-button>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Команды и участники" name="teams">
        <TeamsParticipants :competition-id="currentCompetitionId" />
      </el-tab-pane>
      <el-tab-pane label="Этапы" name="stages">
        <StagesManager :competition-id="currentCompetitionId" />
      </el-tab-pane>
      <el-tab-pane label="Результаты" name="results">
        <ResultsInput :competition-id="currentCompetitionId" />
      </el-tab-pane>
      <el-tab-pane label="Итоги" name="standings">
        <StandingsTable :competition-id="currentCompetitionId" />
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="competitionDialogVisible" :title="editingCompetition ? 'Редактировать конкурс' : 'Новый конкурс'" width="520px">
      <el-form :model="competitionForm" label-width="120px">
        <el-form-item label="Название">
          <el-input v-model="competitionForm.name" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const activeTab = ref('teams')
const competitions = ref([])
const currentCompetitionId = ref(null)
const competitionDialogVisible = ref(false)
const editingCompetition = ref(null)
const competitionForm = reactive({ name: '' })

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
.mb-12 { margin-bottom: 12px; }
.text-right { text-align: right; }
</style>



<template>
  <div>
    <el-row :gutter="12" class="mb-12">
      <el-col :span="16">
        <el-input v-model="teamName" placeholder="Название команды" />
      </el-col>
      <el-col :span="8">
        <el-button type="primary" :disabled="!teamName.trim()" @click="addTeam">Добавить команду</el-button>
      </el-col>
    </el-row>

    <el-table :data="teams" row-key="id" style="width: 100%">
      <el-table-column prop="name" label="Команда" width="260" />
      <el-table-column label="Участники">
        <template #default="scope">
          <el-table :data="participantsByTeam[scope.row.id] || []" size="small" style="width: 100%">
            <el-table-column prop="full_name" label="ФИО" />
            <el-table-column prop="gender" label="Пол" width="80" />
            <el-table-column prop="age" label="Возраст" width="100" />
            <el-table-column label="Действия" width="180">
              <template #default="p">
                <el-button size="small" @click="openParticipantDialog(scope.row.id, p.row)">Редактировать</el-button>
                <el-button size="small" type="danger" @click="removeParticipant(p.row.id)">Удалить</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="mt-8">
            <el-button size="small" type="primary" :disabled="(participantsByTeam[scope.row.id]?.length || 0) >= 4" @click="openParticipantDialog(scope.row.id)">Добавить участника</el-button>
            <el-button size="small" type="danger" @click="removeTeam(scope.row.id)">Удалить команду</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="participantDialog" :title="participantForm.id ? 'Редактировать участника' : 'Добавить участника'" width="520px">
      <el-form :model="participantForm" label-width="120px">
        <el-form-item label="ФИО">
          <el-input v-model="participantForm.full_name" />
        </el-form-item>
        <el-form-item label="Пол">
          <el-select v-model="participantForm.gender" placeholder="Выберите">
            <el-option label="М" value="М" />
            <el-option label="Ж" value="Ж" />
          </el-select>
        </el-form-item>
        <el-form-item label="Возраст">
          <el-input-number v-model="participantForm.age" :min="0" :max="120" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="participantDialog = false">Отмена</el-button>
        <el-button type="primary" @click="saveParticipant">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({ competitionId: { type: Number, required: false } })
const api = window.electronAPI?.database

const teams = ref([])
const participantsByTeam = reactive({})
const teamName = ref('')

const participantDialog = ref(false)
const currentTeamId = ref(null)
const participantForm = reactive({ id: null, full_name: '', gender: 'М', age: 0 })

const loadTeams = async () => {
  if (!props.competitionId) { teams.value = []; return }
  teams.value = await api.listTeams(props.competitionId)
}

const loadParticipants = async (teamId) => {
  participantsByTeam[teamId] = await api.listParticipants(teamId)
}

const loadAll = async () => {
  await loadTeams()
  for (const t of teams.value) await loadParticipants(t.id)
}

watch(() => props.competitionId, () => loadAll(), { immediate: true })

const addTeam = async () => {
  if (!teamName.value.trim()) return
  try {
    const t = await api.createTeam(props.competitionId, teamName.value)
    teams.value.push(t)
    participantsByTeam[t.id] = []
    teamName.value = ''
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка добавления команды')
  }
}

const removeTeam = async (teamId) => {
  await api.deleteTeam(teamId)
  teams.value = teams.value.filter(t => t.id !== teamId)
  delete participantsByTeam[teamId]
}

const openParticipantDialog = (teamId, participant = null) => {
  currentTeamId.value = teamId
  Object.assign(participantForm, participant || { id: null, full_name: '', gender: 'М', age: 0 })
  participantDialog.value = true
}

const saveParticipant = async () => {
  try {
    if (!participantForm.full_name?.trim()) throw new Error('Укажите ФИО')
    // Преобразуем реактивный объект в обычный для IPC
    const payload = {
      full_name: String(participantForm.full_name || '').trim(),
      gender: participantForm.gender || 'М',
      age: Number(participantForm.age || 0)
    }
    let saved
    if (participantForm.id) {
      saved = await api.updateParticipant(participantForm.id, payload)
      const arr = participantsByTeam[currentTeamId.value]
      const idx = arr.findIndex(p => p.id === saved.id)
      if (idx >= 0) arr[idx] = saved
    } else {
      saved = await api.createParticipant(currentTeamId.value, payload)
      participantsByTeam[currentTeamId.value].push(saved)
    }
    participantDialog.value = false
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка сохранения участника')
  }
}

const removeParticipant = async (id) => {
  await api.deleteParticipant(id)
  const arr = participantsByTeam[currentTeamId.value] || []
  const idx = arr.findIndex(p => p.id === id)
  if (idx >= 0) arr.splice(idx, 1)
  // перезагрузим список для всех команд
  await loadAll()
}
</script>

<style scoped>
/* Component-specific styles only */
</style>



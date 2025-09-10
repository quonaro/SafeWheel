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

    <div class="teams-table-scroll">
      <el-table :data="teams" row-key="id" style="width: 100%"
        :class="['modern-table', { 'empty-table': teams.length === 0 }]" :height="400">
        <el-table-column prop="name" label="Команда" :width="teams.length > 0 ? 260 : 0">
          <template #default="scope">
            <div class="editable-cell" @click="editTeam(scope.row)">
              <span v-if="!scope.row.editing">{{ scope.row.name }}</span>
              <el-input v-else v-model="scope.row.name" @blur="saveTeam(scope.row)" @keyup.enter="saveTeam(scope.row)"
                @keyup.escape="cancelEdit(scope.row)" ref="teamInput" size="small" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Участники">
          <template #default="scope">
            <div class="table-scroll">
              <el-table :data="participantsByTeam[scope.row.id] || []" size="small" style="width: 100%"
                class="nested-table">
                <el-table-column prop="full_name" label="ФИО" width="180">
                  <template #default="p">
                    <div class="editable-cell" @click="editParticipant(scope.row.id, p.row)">
                      <span v-if="!p.row.editing" class="name-text">{{ p.row.full_name }}</span>
                      <el-input v-else v-model="p.row.full_name" @blur="saveParticipantInline(scope.row.id, p.row)"
                        @keyup.enter="saveParticipantInline(scope.row.id, p.row)" @keyup.escape="cancelEdit(p.row)"
                        size="small" />
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="gender" label="Пол" width="100">
                  <template #default="p">
                    <div class="editable-cell" @click="editParticipant(scope.row.id, p.row)">
                      <span v-if="!p.row.editing">{{ p.row.gender }}</span>
                      <el-select v-else v-model="p.row.gender" @change="handleGenderChange(scope.row.id, p.row)"
                        size="small" class="gender-select" :popper-append-to-body="false">
                        <el-option label="М" value="М" />
                        <el-option label="Ж" value="Ж" />
                      </el-select>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="age" label="Возраст" width="120">
                  <template #default="p">
                    <div class="editable-cell" @click="editParticipant(scope.row.id, p.row)">
                      <span v-if="!p.row.editing">{{ p.row.age }}</span>
                      <el-input-number v-else v-model="p.row.age" :min="0" :max="120"
                        @change="handleAgeChange(scope.row.id, p.row)" size="small" class="age-input"
                        :controls="false" />
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="Действия" width="120">
                  <template #default="p">
                    <el-button size="small" type="danger" @click="removeParticipant(p.row.id)" class="delete-btn">
                      <el-icon>
                        <Delete />
                      </el-icon>
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="table-actions">
              <el-button size="small" type="primary" :disabled="(participantsByTeam[scope.row.id]?.length || 0) >= 4"
                @click="openParticipantDialog(scope.row.id)">
                <el-icon>
                  <Plus />
                </el-icon>
                Добавить участника
              </el-button>
              <el-button size="small" type="danger" @click="removeTeam(scope.row.id)" class="delete-btn">
                <el-icon>
                  <Delete />
                </el-icon>
                Удалить команду
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="participantDialog"
      :title="participantForm.id ? 'Редактировать участника' : 'Добавить участника'" width="520px">
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
import { ref, watch, reactive, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'

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

// Редактирование команды
const editTeam = (team) => {
  team.editing = true
  team.originalName = team.name
  nextTick(() => {
    const input = document.querySelector('.editable-cell input')
    if (input) input.focus()
  })
}

const saveTeam = async (team) => {
  if (!team.name.trim()) {
    team.name = team.originalName
    team.editing = false
    return
  }
  try {
    await api.updateTeam(team.id, team.name)
    team.editing = false
    ElMessage.success('Команда обновлена')
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка обновления команды')
    team.name = team.originalName
    team.editing = false
  }
}

const cancelEdit = (item) => {
  if (item.originalName) {
    item.name = item.originalName
  }
  item.editing = false
}

// Редактирование участника
const editParticipant = (teamId, participant) => {
  participant.editing = true
  participant.originalData = { ...participant }
  currentTeamId.value = teamId
}

const saveParticipantInline = async (teamId, participant) => {
  if (!participant.full_name.trim()) {
    Object.assign(participant, participant.originalData)
    participant.editing = false
    return
  }
  try {
    const payload = {
      full_name: String(participant.full_name || '').trim(),
      gender: participant.gender || 'М',
      age: Number(participant.age || 0)
    }
    const saved = await api.updateParticipant(participant.id, payload)
    Object.assign(participant, saved)
    participant.editing = false
    ElMessage.success('Участник обновлен')
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка обновления участника')
    Object.assign(participant, participant.originalData)
    participant.editing = false
  }
}

// Обработка изменения пола
const handleGenderChange = async (teamId, participant) => {
  try {
    const payload = {
      full_name: String(participant.full_name || '').trim(),
      gender: participant.gender || 'М',
      age: Number(participant.age || 0)
    }
    const saved = await api.updateParticipant(participant.id, payload)
    Object.assign(participant, saved)
    ElMessage.success('Пол обновлен')
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка обновления пола')
    participant.gender = participant.originalData.gender
  }
}

// Обработка изменения возраста
const handleAgeChange = async (teamId, participant) => {
  try {
    const payload = {
      full_name: String(participant.full_name || '').trim(),
      gender: participant.gender || 'М',
      age: Number(participant.age || 0)
    }
    const saved = await api.updateParticipant(participant.id, payload)
    Object.assign(participant, saved)
    ElMessage.success('Возраст обновлен')
  } catch (e) {
    ElMessage.error(e.message || 'Ошибка обновления возраста')
    participant.age = participant.originalData.age
  }
}
</script>

<style scoped>
/* Современные стили для таблиц */
.modern-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  width: 100%;
  min-width: 600px;
  min-height: 200px;
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

.empty-table .teams-table-scroll {
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

.nested-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.nested-table :deep(.el-table__header) {
  background: rgba(59, 130, 246, 0.1);
}

.nested-table :deep(.el-table__header th) {
  background: transparent;
  color: #374151;
  font-weight: 600;
  font-size: 13px;
  padding: 8px 6px;
  border: none;
}

.nested-table :deep(.el-table__body tr:hover) {
  background: rgba(59, 130, 246, 0.03);
}

.nested-table :deep(.el-table__body td) {
  padding: 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
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

/* Стили для текста ФИО с ellipsis */
.name-text {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.editable-cell:hover {
  background: rgba(59, 130, 246, 0.1);
}

.editable-cell.editing {
  background: rgba(59, 130, 246, 0.15);
  padding: 0;
}

.editable-cell input,
.editable-cell .el-select,
.editable-cell .el-input-number {
  width: 100%;
}

/* Специальные стили для select и input-number */
.gender-select {
  z-index: 1000;
}

.gender-select :deep(.el-select__wrapper) {
  z-index: 1000;
}

.age-input {
  z-index: 1000;
}

.age-input :deep(.el-input-number__input) {
  z-index: 1000;
}

/* Убираем стрелочки у input-number */
.age-input :deep(.el-input-number__increase),
.age-input :deep(.el-input-number__decrease) {
  display: none;
}

/* Улучшаем позиционирование select */
.gender-select :deep(.el-popper) {
  z-index: 2000 !important;
}

/* Увеличиваем z-index для редактируемых ячеек */
.editable-cell.editing {
  z-index: 1000;
  position: relative;
}

/* Кнопки действий */
.table-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(248, 250, 252, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.table-actions :deep(.el-button) {
  flex-shrink: 0;
}

/* Скролл для таблицы команд */
.teams-table-scroll {
  width: 100%;
  max-width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 600px;
  max-height: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* Стилизация скроллбара для таблицы команд */
.teams-table-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.teams-table-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.teams-table-scroll::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.teams-table-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.5);
}

.teams-table-scroll::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0.05);
}

/* Скролл для вложенной таблицы участников */
.table-scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 800px;
}

.table-scroll :deep(.el-table) {
  width: 100%;
}

.modern-table :deep(.cell),
.nested-table :deep(.cell) {
  white-space: normal;
  word-break: break-word;
}

.delete-btn {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.delete-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
}

/* Дополнительные стили для исправления проблем */
.nested-table {
  overflow: visible;
}

.nested-table :deep(.el-table__body) {
  overflow: visible;
}

.nested-table :deep(.el-table__body tr) {
  overflow: visible;
}

.nested-table :deep(.el-table__body td) {
  overflow: visible;
  position: relative;
}

/* Улучшаем отображение select */
.gender-select :deep(.el-select__wrapper) {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  box-shadow: none;
}

.gender-select :deep(.el-select__wrapper:hover) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.gender-select :deep(.el-select__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Улучшаем отображение input-number */
.age-input :deep(.el-input-number__input) {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  color: #059669;
  box-shadow: none;
}

.age-input :deep(.el-input-number__input:hover) {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.age-input :deep(.el-input-number__input:focus) {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

/* Адаптивность */
@media (max-width: 768px) {

  .modern-table :deep(.el-table__header th),
  .modern-table :deep(.el-table__body td) {
    padding: 8px 6px;
    font-size: 13px;
  }

  .nested-table :deep(.el-table__header th),
  .nested-table :deep(.el-table__body td) {
    padding: 6px 4px;
    font-size: 12px;
  }

  .table-actions {
    flex-direction: column;
    gap: 6px;
  }

  .table-scroll {
    min-width: 100%;
  }
}
</style>

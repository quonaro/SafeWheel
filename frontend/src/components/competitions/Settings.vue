<template>
    <div class="settings-container">
        <div class="settings-header">
            <h2 class="settings-title">
                <el-icon class="settings-icon">
                    <Setting />
                </el-icon>
                Настройки соревнования
            </h2>
            <p class="settings-description">
                Настройте параметры соревнования для корректного подсчета результатов
            </p>
        </div>

        <div class="settings-content">
            <el-card class="settings-card" shadow="never">
                <template #header>
                    <div class="card-header">
                        <el-icon class="card-icon">
                            <UserFilled />
                        </el-icon>
                        <span>Параметры команд</span>
                    </div>
                </template>

                <el-form :model="settingsForm" label-width="200px" class="settings-form">
                    <el-form-item label="Количество участников в команде">
                        <el-input-number v-model="settingsForm.maxParticipantsPerTeam" :min="1" :max="10" :step="1"
                            size="large" class="participants-input" />
                        <div class="form-help">
                            Команды с меньшим количеством участников будут автоматически размещены в конце списка
                            результатов
                        </div>
                    </el-form-item>

                    <el-form-item label="Критерии ранжирования">
                        <div class="ranking-criteria">
                            <div class="criteria-item">
                                <el-icon class="criteria-icon">
                                    <Trophy />
                                </el-icon>
                                <span>1. Время прохождения (меньше = лучше)</span>
                            </div>
                            <div class="criteria-item">
                                <el-icon class="criteria-icon">
                                    <Warning />
                                </el-icon>
                                <span>2. Штрафные очки (меньше = лучше)</span>
                            </div>
                            <div class="criteria-item">
                                <el-icon class="criteria-icon">
                                    <Calendar />
                                </el-icon>
                                <span>3. Возраст участников (младше = лучше)</span>
                            </div>
                            <div class="criteria-note">
                                <el-icon class="note-icon">
                                    <InfoFilled />
                                </el-icon>
                                <span>При равенстве времени и штрафов учитывается возраст - младший участник занимает
                                    более высокое
                                    место</span>
                            </div>
                        </div>
                    </el-form-item>
                </el-form>
            </el-card>

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, UserFilled, Trophy, Warning, Calendar, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
    competitionId: {
        type: Number,
        required: false
    }
})

const api = window.electronAPI?.database

const settingsForm = reactive({
    maxParticipantsPerTeam: 4
})


const loadSettings = async () => {
    if (!props.competitionId) return

    try {
        // Загружаем настройки соревнования
        const competition = await api.getCompetitionById(props.competitionId)
        if (competition && competition.settings) {
            const settings = JSON.parse(competition.settings)
            Object.assign(settingsForm, settings)
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error)
    }
}

const saveSettings = async () => {
    if (!props.competitionId) return

    try {
        const settings = JSON.stringify(settingsForm)
        await api.updateCompetition(props.competitionId, { settings })
        ElMessage.success('Настройки сохранены')
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error)
        ElMessage.error('Ошибка сохранения настроек')
    }
}


// Сохраняем настройки при изменении
watch(settingsForm, () => {
    saveSettings()
}, { deep: true })

watch(() => props.competitionId, () => {
    loadSettings()
}, { immediate: true })

onMounted(() => {
    loadSettings()
})
</script>

<style scoped>
.settings-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
    background: #f8fafc;
}

.settings-header {
    margin-bottom: 24px;
}

.settings-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 8px 0;
}

.settings-icon {
    font-size: 28px;
    color: #3b82f6;
}

.settings-description {
    color: #6b7280;
    font-size: 16px;
    margin: 0;
}

.settings-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
    flex: 1;
}

.settings-card {
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.settings-card :deep(.el-card__header) {
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    padding: 20px 24px;
    border-radius: 16px 16px 0 0;
}

.settings-card :deep(.el-card__body) {
    padding: 24px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
}

.card-icon {
    font-size: 20px;
    color: #3b82f6;
}

.settings-form {
    max-width: 600px;
}

.participants-input {
    width: 120px;
}

.participants-input :deep(.el-input-number__input) {
    text-align: center;
    font-weight: 600;
    font-size: 16px;
}

.form-help {
    margin-top: 8px;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.5;
}

.ranking-criteria {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
}

.criteria-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    font-size: 14px;
    color: #374151;
}

.criteria-icon {
    font-size: 16px;
    color: #3b82f6;
    flex-shrink: 0;
}

.criteria-note {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    background: #f0f9ff;
    border-radius: 8px;
    border: 1px solid #bae6fd;
    font-size: 13px;
    color: #0369a1;
    line-height: 1.5;
    margin-top: 8px;
}

.note-icon {
    font-size: 16px;
    color: #0284c7;
    flex-shrink: 0;
    margin-top: 2px;
}

.export-section {
    padding: 8px 0;
}

.export-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}

.export-btn {
    flex: 1;
    min-width: 200px;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    transition: all 0.3s ease;
}

.export-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.export-btn :deep(.el-icon) {
    margin-right: 8px;
    font-size: 18px;
}

/* Адаптивность */
@media (max-width: 768px) {
    .settings-container {
        padding: 16px;
    }

    .settings-title {
        font-size: 20px;
    }

    .settings-description {
        font-size: 14px;
    }

    .settings-form {
        max-width: 100%;
    }

    .export-buttons {
        flex-direction: column;
    }

    .export-btn {
        min-width: 100%;
    }

    .criteria-item {
        padding: 10px 12px;
        font-size: 13px;
    }
}
</style>

<template>
  <div class="competitions">
    <div class="content-container">
      <TeamsParticipants v-if="activeTab === 'teams'" :competition-id="currentCompetitionId"
        :refresh-counts="refreshCounts" />
      <StagesManager v-if="activeTab === 'stages'" :competition-id="currentCompetitionId"
        :refresh-counts="refreshCounts" />
      <ResultsInput v-if="activeTab === 'results'" :competition-id="currentCompetitionId"
        :refresh-counts="refreshCounts" />
      <StandingsTable v-if="activeTab === 'standings'" :competition-id="currentCompetitionId"
        :refresh-counts="refreshCounts" />
      <Settings v-if="activeTab === 'settings'" :competition-id="currentCompetitionId"
        :refresh-counts="refreshCounts" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'teams'
  },
  competitionId: {
    type: [String, Number],
    required: true
  },
  refreshCounts: {
    type: Function,
    default: () => { }
  }
})

const emit = defineEmits(['tab-change', 'back-to-selector'])

const competitions = ref([])
const currentCompetitionId = ref(props.competitionId)

const currentCompetition = computed(() => {
  return competitions.value.find(c => c.id === currentCompetitionId.value)
})

// Следим за изменениями activeTab и уведомляем родительский компонент
watch(() => props.activeTab, (newTab) => {
  // Можно добавить дополнительную логику при смене вкладки
}, { immediate: true })

// Следим за изменениями competitionId
watch(() => props.competitionId, (newId) => {
  currentCompetitionId.value = newId
}, { immediate: true })

const api = window.electronAPI?.database

const loadCompetitions = async () => {
  if (!api) return
  competitions.value = await api.listCompetitions()
}


const loadAll = async () => {
  // children react on prop
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
    StandingsTable: () => import('./competitions/StandingsTable.vue'),
    Settings: () => import('./competitions/Settings.vue')
  }
}
</script>

<style scoped>
.competitions {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #374151;
}



.content-container {
  flex: 1;
  overflow: hidden;
}
</style>

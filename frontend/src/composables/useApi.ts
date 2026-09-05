import { ref, type Ref } from 'vue'
import * as wails from '../../wailsjs/go/main/App'

export function useApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function call<T>(fn: () => Promise<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (e: any) {
      error.value = typeof e === 'string' ? e : e?.message || 'Unknown error'
      console.error(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    call,
  }
}

// Competitions
export function useCompetitions() {
  const competitions: Ref<any[]> = ref([])
  const { loading, error, call } = useApi()

  async function load() {
    const result = await call(() => wails.ListCompetitions())
    if (result) competitions.value = result
  }

  async function create(data: any) {
    return call(() => wails.CreateCompetition(data))
  }

  async function update(id: number, data: any) {
    return call(() => wails.UpdateCompetition(id, data))
  }

  async function remove(id: number) {
    return call(() => wails.DeleteCompetition(id))
  }

  async function getById(id: number) {
    return call(() => wails.GetCompetitionByID(id))
  }

  return { competitions, loading, error, load, create, update, remove, getById }
}

// Teams
export function useTeams() {
  const teams: Ref<any[]> = ref([])
  const { loading, error, call } = useApi()

  async function load(competitionId: number) {
    const result = await call(() => wails.ListTeams(competitionId))
    if (result) teams.value = result
  }

  async function create(competitionId: number, name: string) {
    return call(() => wails.CreateTeam(competitionId, name))
  }

  async function update(id: number, name: string) {
    return call(() => wails.UpdateTeam(id, name))
  }

  async function remove(id: number) {
    return call(() => wails.DeleteTeam(id))
  }

  return { teams, loading, error, load, create, update, remove }
}

// Participants
export function useParticipants() {
  const participants: Ref<any[]> = ref([])
  const { loading, error, call } = useApi()

  async function load(teamId: number) {
    const result = await call(() => wails.ListParticipants(teamId))
    if (result) participants.value = result
  }

  async function create(teamId: number, data: any) {
    return call(() => wails.CreateParticipant(teamId, data))
  }

  async function update(id: number, data: any) {
    return call(() => wails.UpdateParticipant(id, data))
  }

  async function remove(id: number) {
    return call(() => wails.DeleteParticipant(id))
  }

  return { participants, loading, error, load, create, update, remove }
}

// Stages
export function useStages() {
  const stages: Ref<any[]> = ref([])
  const { loading, error, call } = useApi()

  async function load(competitionId: number) {
    const result = await call(() => wails.ListStages(competitionId))
    if (result) stages.value = result
  }

  async function create(competitionId: number, name: string) {
    return call(() => wails.CreateStage(competitionId, name))
  }

  async function update(id: number, name: string) {
    return call(() => wails.UpdateStage(id, name))
  }

  async function remove(id: number) {
    return call(() => wails.DeleteStage(id))
  }

  return { stages, loading, error, load, create, update, remove }
}

// Results
export function useResults() {
  const { loading, error, call } = useApi()

  async function upsert(stageId: number, participantId: number, timeSeconds: number, penaltyPoints: number) {
    return call(() => wails.UpsertStageResult(stageId, participantId, timeSeconds, penaltyPoints))
  }

  async function getStageResults(stageId: number) {
    return call(() => wails.GetStageResults(stageId))
  }

  async function getParticipantsWithResults(competitionId: number, stageId: number) {
    return call(() => wails.GetParticipantsWithResults(competitionId, stageId))
  }

  return { loading, error, upsert, getStageResults, getParticipantsWithResults }
}

// Standings
export function useStandings() {
  const standings: Ref<any[]> = ref([])
  const stageStandings: Ref<any[]> = ref([])
  const { loading, error, call } = useApi()

  async function loadStandings(competitionId: number) {
    const result = await call(() => wails.ComputeStandings(competitionId))
    if (result) standings.value = result
  }

  async function loadStageStandings(competitionId: number) {
    const result = await call(() => wails.GetStageStandings(competitionId))
    if (result) stageStandings.value = result
  }

  async function getStageStandingsWithParticipants(competitionId: number) {
    return call(() => wails.GetStageStandingsWithParticipants(competitionId))
  }

  async function getParticipantResults(competitionId: number, participantId: number) {
    return call(() => wails.GetParticipantResults(competitionId, participantId))
  }

  return {
    standings,
    stageStandings,
    loading,
    error,
    loadStandings,
    loadStageStandings,
    getStageStandingsWithParticipants,
    getParticipantResults,
  }
}

// Export
export function useExport() {
  const { loading, error, call } = useApi()

  async function exportOverall(competitionId: number) {
    return call(() => wails.ExportOverallResults(competitionId))
  }

  async function exportStages(competitionId: number) {
    return call(() => wails.ExportStageResults(competitionId))
  }

  async function exportAll() {
    return call(() => wails.ExportAllCompetitionsResults())
  }

  return { loading, error, exportOverall, exportStages, exportAll }
}

// Utility
export function useFormat() {
  async function formatTime(seconds: number): Promise<string> {
    return wails.FormatTime(seconds)
  }

  async function parseTime(timeStr: string): Promise<number> {
    return wails.ParseTimeToSeconds(timeStr)
  }

  function formatTimeLocal(seconds: number): string {
    if (!seconds) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return { formatTime, parseTime, formatTimeLocal }
}

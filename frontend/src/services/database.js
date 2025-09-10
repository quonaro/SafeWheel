// Сервис для работы с базой данных через Electron API
class DatabaseService {
  constructor() {
    if (typeof window !== "undefined" && window.electronAPI) {
      this.api = window.electronAPI.database;
    } else {
      console.warn("⚠️ Electron API недоступен, используем заглушки");
      this.api = this.createMockAPI();
    }
  }

  createMockAPI() {
    return {
      // competitions
      listCompetitions: async () => [],
      getCompetitionById: async (id) => null,
      createCompetition: async (data) => ({ id: Date.now(), ...data }),
      updateCompetition: async (id, data) => ({ id, ...data }),
      deleteCompetition: async (id) => ({ id }),
      // teams
      listTeams: async (competitionId) => [],
      getTeamById: async (id) => null,
      createTeam: async (competitionId, name) => ({
        id: Date.now(),
        competition_id: competitionId,
        name,
      }),
      updateTeam: async (id, name) => ({ id, name }),
      deleteTeam: async (id) => ({ id }),
      // participants
      listParticipants: async (teamId) => [],
      getParticipantById: async (id) => null,
      createParticipant: async (teamId, payload) => ({
        id: Date.now(),
        team_id: teamId,
        ...payload,
      }),
      updateParticipant: async (id, payload) => ({ id, ...payload }),
      deleteParticipant: async (id) => ({ id }),
      // stages
      listStages: async (competitionId) => [],
      getStageById: async (id) => null,
      createStage: async (competitionId, payload) => ({
        id: Date.now(),
        competition_id: competitionId,
        ...payload,
      }),
      updateStage: async (id, payload) => ({ id, ...payload }),
      deleteStage: async (id) => ({ id }),
      // results
      upsertStageResult: async (stageId, participantId, payload) => ({
        id: Date.now(),
        stage_id: stageId,
        participant_id: participantId,
        ...payload,
      }),
      getStageResults: async (stageId) => [],
      computeStandings: async (competitionId) => [],
    };
  }

  // competitions
  listCompetitions() {
    return this.api.listCompetitions();
  }
  getCompetitionById(id) {
    return this.api.getCompetitionById(id);
  }
  createCompetition(data) {
    return this.api.createCompetition(data);
  }
  updateCompetition(id, data) {
    return this.api.updateCompetition(id, data);
  }
  deleteCompetition(id) {
    return this.api.deleteCompetition(id);
  }

  // teams
  listTeams(competitionId) {
    return this.api.listTeams(competitionId);
  }
  getTeamById(id) {
    return this.api.getTeamById(id);
  }
  createTeam(competitionId, name) {
    return this.api.createTeam(competitionId, name);
  }
  updateTeam(id, name) {
    return this.api.updateTeam(id, name);
  }
  deleteTeam(id) {
    return this.api.deleteTeam(id);
  }

  // participants
  listParticipants(teamId) {
    return this.api.listParticipants(teamId);
  }
  getParticipantById(id) {
    return this.api.getParticipantById(id);
  }
  createParticipant(teamId, payload) {
    return this.api.createParticipant(teamId, payload);
  }
  updateParticipant(id, payload) {
    return this.api.updateParticipant(id, payload);
  }
  deleteParticipant(id) {
    return this.api.deleteParticipant(id);
  }

  // stages
  listStages(competitionId) {
    return this.api.listStages(competitionId);
  }
  getStageById(id) {
    return this.api.getStageById(id);
  }
  createStage(competitionId, payload) {
    return this.api.createStage(competitionId, payload);
  }
  updateStage(id, payload) {
    return this.api.updateStage(id, payload);
  }
  deleteStage(id) {
    return this.api.deleteStage(id);
  }

  // results
  upsertStageResult(stageId, participantId, payload) {
    return this.api.upsertStageResult(stageId, participantId, payload);
  }
  getStageResults(stageId) {
    return this.api.getStageResults(stageId);
  }
  computeStandings(competitionId) {
    return this.api.computeStandings(competitionId);
  }
}

const databaseService = new DatabaseService();
export default databaseService;

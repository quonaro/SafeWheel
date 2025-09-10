const { contextBridge, ipcRenderer } = require("electron");

// Предоставляем безопасные API для рендерера
contextBridge.exposeInMainWorld("electronAPI", {
  // Здесь можно добавить API для взаимодействия с Electron
  platform: process.platform,
  versions: process.versions,

  // API для работы с базой данных
  database: {
    // Competitions
    listCompetitions: () => ipcRenderer.invoke("db:listCompetitions"),
    getCompetitionById: (id) => ipcRenderer.invoke("db:getCompetitionById", id),
    createCompetition: (data) =>
      ipcRenderer.invoke("db:createCompetition", data),
    updateCompetition: (id, data) =>
      ipcRenderer.invoke("db:updateCompetition", id, data),
    deleteCompetition: (id) => ipcRenderer.invoke("db:deleteCompetition", id),

    // Teams
    listTeams: (competitionId) =>
      ipcRenderer.invoke("db:listTeams", competitionId),
    getTeamById: (id) => ipcRenderer.invoke("db:getTeamById", id),
    createTeam: (competitionId, name) =>
      ipcRenderer.invoke("db:createTeam", competitionId, name),
    updateTeam: (id, name) => ipcRenderer.invoke("db:updateTeam", id, name),
    deleteTeam: (id) => ipcRenderer.invoke("db:deleteTeam", id),

    // Participants
    listParticipants: (teamId) =>
      ipcRenderer.invoke("db:listParticipants", teamId),
    getParticipantById: (id) => ipcRenderer.invoke("db:getParticipantById", id),
    createParticipant: (teamId, payload) =>
      ipcRenderer.invoke("db:createParticipant", teamId, payload),
    updateParticipant: (id, payload) =>
      ipcRenderer.invoke("db:updateParticipant", id, payload),
    deleteParticipant: (id) => ipcRenderer.invoke("db:deleteParticipant", id),

    // Stages
    listStages: (competitionId) =>
      ipcRenderer.invoke("db:listStages", competitionId),
    getStageById: (id) => ipcRenderer.invoke("db:getStageById", id),
    createStage: (competitionId, payload) =>
      ipcRenderer.invoke("db:createStage", competitionId, payload),
    updateStage: (id, payload) =>
      ipcRenderer.invoke("db:updateStage", id, payload),
    deleteStage: (id) => ipcRenderer.invoke("db:deleteStage", id),

    // Results
    upsertStageResult: (stageId, participantId, payload) =>
      ipcRenderer.invoke(
        "db:upsertStageResult",
        stageId,
        participantId,
        payload
      ),
    getStageResults: (stageId) =>
      ipcRenderer.invoke("db:getStageResults", stageId),
    computeStandings: (competitionId) =>
      ipcRenderer.invoke("db:computeStandings", competitionId),
  },

  // Пример API для работы с файлами (если понадобится)
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (content) => ipcRenderer.invoke("dialog:saveFile", content),

  // API для уведомлений
  showNotification: (title, body) =>
    ipcRenderer.invoke("notification:show", { title, body }),

  // API для получения информации о приложении
  getAppInfo: () => ipcRenderer.invoke("app:getInfo"),
});

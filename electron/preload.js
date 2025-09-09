const { contextBridge, ipcRenderer } = require("electron");

// Предоставляем безопасные API для рендерера
contextBridge.exposeInMainWorld("electronAPI", {
  // Здесь можно добавить API для взаимодействия с Electron
  platform: process.platform,
  versions: process.versions,

  // Пример API для работы с файлами (если понадобится)
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (content) => ipcRenderer.invoke("dialog:saveFile", content),

  // API для уведомлений
  showNotification: (title, body) =>
    ipcRenderer.invoke("notification:show", { title, body }),

  // API для получения информации о приложении
  getAppInfo: () => ipcRenderer.invoke("app:getInfo"),
});

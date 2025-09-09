const { contextBridge, ipcRenderer } = require("electron");

// Предоставляем безопасные API для рендерера
contextBridge.exposeInMainWorld("electronAPI", {
  // Здесь можно добавить API для взаимодействия с Electron
  platform: process.platform,
  versions: process.versions,

  // API для работы с базой данных
  database: {
    // Получить все колеса
    getAllWheels: () => ipcRenderer.invoke("db:getAllWheels"),
    
    // Получить колесо по ID
    getWheelById: (id) => ipcRenderer.invoke("db:getWheelById", id),
    
    // Создать новое колесо
    createWheel: (wheelData) => ipcRenderer.invoke("db:createWheel", wheelData),
    
    // Обновить колесо
    updateWheel: (id, wheelData) => ipcRenderer.invoke("db:updateWheel", id, wheelData),
    
    // Удалить колесо
    deleteWheel: (id) => ipcRenderer.invoke("db:deleteWheel", id),
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

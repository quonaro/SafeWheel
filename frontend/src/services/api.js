import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Интерцепторы для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export const wheelApi = {
  // Получить все колеса
  getWheels: () => api.get("/api/wheels"),

  // Получить колесо по ID
  getWheel: (id) => api.get(`/api/wheels/${id}`),

  // Создать новое колесо
  createWheel: (data) => api.post("/api/wheels", data),

  // Обновить колесо
  updateWheel: (id, data) => api.put(`/api/wheels/${id}`, data),

  // Удалить колесо
  deleteWheel: (id) => api.delete(`/api/wheels/${id}`),
};

export default api;

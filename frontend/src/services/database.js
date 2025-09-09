// Сервис для работы с базой данных через Electron API
class DatabaseService {
  constructor() {
    // Проверяем, что мы в Electron окружении
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.api = window.electronAPI.database;
    } else {
      console.warn('⚠️ Electron API недоступен, используем заглушки');
      this.api = this.createMockAPI();
    }
  }

  // Создаем заглушки для тестирования вне Electron
  createMockAPI() {
    return {
      getAllWheels: async () => {
        console.log('Mock: getAllWheels');
        return [];
      },
      getWheelById: async (id) => {
        console.log('Mock: getWheelById', id);
        return null;
      },
      createWheel: async (wheelData) => {
        console.log('Mock: createWheel', wheelData);
        return { id: Date.now(), ...wheelData };
      },
      updateWheel: async (id, wheelData) => {
        console.log('Mock: updateWheel', id, wheelData);
        return { id, ...wheelData };
      },
      deleteWheel: async (id) => {
        console.log('Mock: deleteWheel', id);
        return { id };
      }
    };
  }

  // Получить все колеса
  async getAllWheels() {
    try {
      const wheels = await this.api.getAllWheels();
      return wheels;
    } catch (error) {
      console.error('❌ Ошибка получения колес:', error);
      throw error;
    }
  }

  // Получить колесо по ID
  async getWheelById(id) {
    try {
      const wheel = await this.api.getWheelById(id);
      return wheel;
    } catch (error) {
      console.error('❌ Ошибка получения колеса:', error);
      throw error;
    }
  }

  // Создать новое колесо
  async createWheel(wheelData) {
    try {
      console.log('🔄 Frontend: Отправляем данные для создания колеса:', wheelData);
      // Vue может передавать реактивные Proxy — их нельзя клонировать через IPC.
      // Преобразуем в обычный плоский объект с нужными полями/типами.
      const payload = {
        name: String(wheelData.name ?? '').trim(),
        diameter: Number(wheelData.diameter),
        width: Number(wheelData.width),
        material: String(wheelData.material ?? '').trim(),
        condition: String(wheelData.condition ?? '').trim(),
      };
      const wheel = await this.api.createWheel(payload);
      console.log('✅ Frontend: Получен результат создания колеса:', wheel);
      return wheel;
    } catch (error) {
      console.error('❌ Frontend: Ошибка создания колеса:', error);
      throw error;
    }
  }

  // Обновить колесо
  async updateWheel(id, wheelData) {
    try {
      const payload = {
        name: String(wheelData.name ?? '').trim(),
        diameter: Number(wheelData.diameter),
        width: Number(wheelData.width),
        material: String(wheelData.material ?? '').trim(),
        condition: String(wheelData.condition ?? '').trim(),
      };
      const wheel = await this.api.updateWheel(id, payload);
      return wheel;
    } catch (error) {
      console.error('❌ Ошибка обновления колеса:', error);
      throw error;
    }
  }

  // Удалить колесо
  async deleteWheel(id) {
    try {
      const result = await this.api.deleteWheel(id);
      return result;
    } catch (error) {
      console.error('❌ Ошибка удаления колеса:', error);
      throw error;
    }
  }
}

// Создаем единственный экземпляр сервиса
const databaseService = new DatabaseService();

export default databaseService;

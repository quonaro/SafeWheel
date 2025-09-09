const axios = require("axios");

async function testApp() {
  console.log("🧪 Тестирование SafeWheel приложения...\n");

  // Тест 1: Проверка бэкенда
  try {
    console.log("1️⃣ Тестирование FastAPI бэкенда...");
    const response = await axios.get("http://localhost:8000/");
    console.log("✅ Бэкенд работает:", response.data.message);
  } catch (error) {
    console.log("❌ Бэкенд не отвечает:", error.message);
  }

  // Тест 2: Проверка API колес
  try {
    console.log("\n2️⃣ Тестирование API колес...");
    const response = await axios.get("http://localhost:8000/api/wheels");
    console.log("✅ API колес работает, найдено колес:", response.data.length);
  } catch (error) {
    console.log("❌ API колес не отвечает:", error.message);
  }

  // Тест 3: Создание тестового колеса
  try {
    console.log("\n3️⃣ Создание тестового колеса...");
    const testWheel = {
      name: "Тестовое колесо",
      diameter: 100.5,
      width: 25.0,
      material: "Резина",
      condition: "Отличное",
    };

    const response = await axios.post(
      "http://localhost:8000/api/wheels",
      testWheel
    );
    console.log("✅ Тестовое колесо создано:", response.data.data.name);
  } catch (error) {
    console.log("❌ Ошибка создания колеса:", error.message);
  }

  // Тест 4: Проверка фронтенда
  try {
    console.log("\n4️⃣ Тестирование Vue.js фронтенда...");
    const response = await axios.get("http://localhost:3000/");
    if (response.status === 200) {
      console.log("✅ Фронтенд работает на порту 3000");
    }
  } catch (error) {
    console.log("❌ Фронтенд не отвечает:", error.message);
  }

  console.log("\n🎉 Тестирование завершено!");
  console.log("\n📱 Откройте Electron приложение для полного тестирования UI");
}

// Запускаем тесты через 3 секунды после запуска
setTimeout(testApp, 3000);

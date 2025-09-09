const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Запуск SafeWheel в режиме разработки...");

// Функция для запуска процесса
function runProcess(command, args, cwd, name, options = {}) {
  console.log(`📦 Запуск ${name}...`);
  const process = spawn(command, args, {
    cwd: cwd || process.cwd(),
    stdio: "inherit",
    shell: true,
    ...options,
  });

  process.on("error", (err) => {
    console.error(`❌ Ошибка в ${name}:`, err);
  });

  return process;
}

// Запускаем только Electron, который сам управляет всеми процессами
console.log("🖥️  Запуск Electron...");
const electron = runProcess("electron", ["."], __dirname, "Electron", {
  env: { ...process.env, NODE_ENV: "development" },
});

// Обработка завершения процессов
process.on("SIGINT", () => {
  console.log("\n🛑 Остановка всех процессов...");
  process.exit(0);
});

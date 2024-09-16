import customtkinter
import time
import threading

class App(customtkinter.CTk):
    def __init__(self):
        super().__init__()

        self.title("Загрузка")
        self.geometry("400x200")

        # Создаем кнопку для запуска долгих действий
        self.start_button = customtkinter.CTkButton(self, text="Запустить", command=self.start_long_task)
        self.start_button.pack(pady=20)

        # Создаем индикатор загрузки
        self.progress_bar = customtkinter.CTkProgressBar(self)
        self.progress_bar.pack(pady=20, fill='x', padx=20)

    def long_task(self):
        for i in range(101):
            time.sleep(0.05)  # Симуляция долгой задачи
            self.progress_bar.set(i / 100)  # Обновляем индикатор загрузки

    def start_long_task(self):
        # Запускаем долгую задачу в отдельном потоке
        threading.Thread(target=self.long_task, daemon=True).start()

if __name__ == "__main__":
    app = App()
    app.mainloop()
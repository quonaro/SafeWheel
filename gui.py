import customtkinter as ctk
from tkinter import filedialog

def select_excel_file():
    # Открываем диалоговое окно для выбора файла
    file_path = filedialog.askopenfilename(
        title="Выберите файл Excel",
        filetypes=[("Excel files", "*.xls;*.xlsx")]  # Ограничиваем выбор только Excel файлами
    )
    if file_path:
        print(f"Выбранный файл: {file_path}")
    


# Создаем главное окно
app = ctk.CTk()
app.title("Выбор Excel файла")
app.resizable(False,False)
app.geometry('600x400')

# Кнопка для выбора файла
select_button = ctk.CTkButton(app, text="Выбрать файл Excel", command=select_excel_file)
select_button.pack(pady=20)

# Запускаем главный цикл приложения
app.mainloop()
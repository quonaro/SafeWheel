import customtkinter as ctk
from tkinter import filedialog
import openpyxl
from CTkListbox import CTkListbox
from tkinter import messagebox
import os



def center_window(window):
    window.update_idletasks()
    width = window.winfo_width()
    height = window.winfo_height()
    x = (window.winfo_screenwidth() - width) // 2
    y = (window.winfo_screenheight() - height) // 2
    window.geometry(f'+{x}+{y}')

class SafetyWheel2024(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Безопасное колесо 2024")
        self.resizable(False, False)
        self.geometry('300x400')
        self.listbox_visible = False
        
        # Центрируем кнопку выбора файла
        self.select_button = ctk.CTkButton(self, text="Выбрать файл Excel",height=50,command=self.select_excel_file,corner_radius=0)
        self.select_button.pack(pady=0, fill='x')
        
       
        
        # Создаем Listbox для отображения имен листов
        self.listbox = CTkListbox(self, multiple_selection=True)
        
        # Центрируем кнопку получения выбранных листов
        self.select_sheets_button = ctk.CTkButton(self, text="Получить выбранные листы", command=self.get_selected_sheets,corner_radius=0,fg_color='#ff033e')
        self.select_sheets_button.pack(side='bottom', fill='x')
        
        center_window(self)
        self.mainloop()
    
    def select_excel_file(self):
        file_path = filedialog.askopenfilename(
            title="Выберите файл Excel",
            filetypes=[("Таблица Excel", "*.xls;*.xlsx")]
        )
        if file_path:
            self.title(f"Безопасное колесо 2024 ({file_path})")
            workbook = openpyxl.load_workbook(file_path)
            sheet_names = workbook.sheetnames
            
            self.listbox.delete(0, ctk.END)  # Очищаем Listbox перед добавлением новых значений
            for name in sheet_names:
                self.listbox.insert(ctk.END, name)  # Добавляем имена листов в Listbox
            
            self.listbox.pack(padx=10, pady=5, fill='both', expand=True)  # Показываем Listbox
            self.listbox_visible = True
    
    def get_selected_sheets(self):
        if self.listbox_visible:
            selected_indices = self.listbox.curselection()  # Получаем индексы выбранных элементов
            if selected_indices:
                selected_sheets = [self.listbox.get(i) for i in selected_indices]  # Получаем имена выбранных листов
                print("Выбранные листы:", selected_sheets)
            else:
                messagebox.showwarning("Предупреждение", "Нужно выбрать хотя бы 1 лист")
                
        else:
            messagebox.showwarning("Предупреждение", "Сначала выберите файл Excel")

    # def open_folder():
    #     # Укажите путь к папке, которую нужно открыть
    #     folder_path = "C:/Users/YourUsername/Documents"
    #     os.startfile(folder_path)

if __name__ == "__main__":
    app = SafetyWheel2024()
    
    
import tkinter as tk
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
        self.listbox.pack(padx=10, pady=5, fill='both', expand=True)
        
        # Центрируем кнопку получения выбранных листов
        self.get_final_score = ctk.CTkButton(self, text="Получить итоговый результат листы", command=self.final_score,corner_radius=0)
        self.get_final_score.pack(side='bottom', fill='x')
        
        
        self.select_sheets_button = ctk.CTkButton(self, text="Получить выбранные листы", command=self.get_selected_sheets,corner_radius=0,fg_color='#881530')
        self.select_sheets_button.pack(side='bottom', fill='x')
        
        center_window(self)
        self.mainloop()
    
    def update_listbox(self):
        # Уничтожаем старый listbox, если он существует
        if self.listbox:
            self.listbox.destroy()

        # Создаем новый listbox
        self.listbox = CTkListbox(self, multiple_selection=True)
        self.listbox.pack(padx=10, pady=5, fill='both', expand=True)
        
        
    def final_score(self):
        from main import save_result
        try:
            save_result()
            messagebox.showinfo('Успех!', f"Результаты можно найти в файле на листе <<Итоговые результаты>>")
            
        except Exception as e:
            messagebox.showerror('Ошибка!', f"{e}\nЛист не подходит по формату, проверьте данные и колонки!")
            
        
    def select_excel_file(self):
        
        
        file_path = filedialog.askopenfilename(
            title="Выберите файл Excel",
            filetypes=[("Таблица Excel", "*.xls;*.xlsx")]
        )
        if file_path:
            self.update_listbox()
            self.listbox.pack(padx=10, pady=5, fill='both', expand=True)
            self.title(f"Безопасное колесо 2024 ({file_path})")
            self.workbook = openpyxl.load_workbook(file_path)
            sheet_names = self.workbook.sheetnames
            
            self.listbox.delete(0, ctk.END)  # Очищаем Listbox перед добавлением новых значений
            for name in sheet_names:
                self.listbox.insert(ctk.END, name)  # Добавляем имена листов в Listbox
            self.listbox_visible = True
    
    def get_selected_sheets(self):
        if self.listbox_visible:
            try:
                selected_indices = self.listbox.curselection()  # Получаем индексы выбранных элементов
            except tk.TclError:
                messagebox.showerror('Ошибка', 'Не удалось получить выбранные элементы: список был уничтожен.')
                return
            
            if selected_indices:
                selected_sheets = [self.listbox.get(i) for i in selected_indices]  # Получаем имена выбранных листов
                from main import save_final
                try:
                    save_final(self.workbook, selected_sheets)
                    messagebox.showinfo('Ура', f'Код завершился без ошибок!\nРезультаты в файле Результаты.xlsx')
                except Exception as e:
                    messagebox.showerror('Ошибка!', f"{e}\nЛист не подходит по формату, проверьте данные и колонки!")
                    
            else:
                messagebox.showwarning("Предупреждение", "Нужно выбрать хотя бы 1 лист")
        else:
            messagebox.showwarning("Предупреждение", "Сначала выберите файл Excel")


if __name__ == "__main__":
    app = SafetyWheel2024()
    
    
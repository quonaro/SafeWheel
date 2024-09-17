import tkinter as tk
import customtkinter as ctk
from tkinter import filedialog
import openpyxl
from CTkListbox import CTkListbox
from tkinter import messagebox
from customtkinter import CTkFont

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
        
        self.bfont = CTkFont(family="RobotoFlex", size=15,weight='bold')
        self.font = CTkFont(family="RobotoFlex", size=15,weight='normal')
        
        
        
        
        # Центрируем кнопку выбора файла
        self.select_button = ctk.CTkButton(self, text="Выбрать файл Excel",height=50,command=self.select_excel_file,corner_radius=0,fg_color="#9642f5",hover_color='#81139c',
                                           font=self.font)
        self.select_button.pack(pady=0, fill='x')
        
        self.get_final_score = ctk.CTkButton(self, text="Получить итоговый результат", command=self.final_score,corner_radius=0,state='disabled',fg_color='#4a39e9',hover_color='#115baf',font=self.font)
        self.get_final_score.pack(side='bottom', fill='x',pady=5)
        path = 'Результаты.xlsx'
        if os.path.exists(path) and os.path.isfile(path):
            self.result_exits = True
            self.get_final_score.configure(state='normal')
        else:
            self.result_exits = False
        
        self.select_sheets_button = ctk.CTkButton(self, text="Получить смежный результат\n(нужно выбрать листы в списке)",
                                                  command=self.get_selected_sheets,corner_radius=0, fg_color="#9642f5",hover_color='#81139c', state='disabled',font=self.font)
        self.select_sheets_button.pack(side='bottom', fill='x')
        
        self.listbox = CTkListbox(self, multiple_selection=True,border_width=0,justify='center',hover_color='#9642f5',highlight_color='#6520b4')
        self.listbox.pack(fill='both', expand=True)
        
        center_window(self)
        self.mainloop()
    
    def update_listbox(self):
        # Уничтожаем старый listbox, если он существует
        if self.listbox:
            self.listbox.destroy()

        # Создаем Listbox для отображения имен листов
        self.listbox = CTkListbox(self, multiple_selection=True,border_width=0,justify='center',hover_color='#9642f5',highlight_color='#6520b4')

        self.listbox.pack(fill='both', expand=True)
            
    def final_score(self):
        from main import save_result
        try:
            save_result()
            messagebox.showinfo('Успех!', f"Результаты можно найти в файле на листе <<Итоговые результаты>>")
        except PermissionError as e :
            messagebox.showerror('Ошибка!',"Доступ к файлу запрещён , возможно файл (Результаты.xlsx) используется другой программой")
            
            
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
            self.select_sheets_button.configure(state='normal')
    
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
                    self.get_final_score.configure(state='normal')
                
                except PermissionError as e :
                    messagebox.showerror('Ошибка!',"Доступ к файлу запрещён , возможно файл (Результаты.xlsx) используется другой программой")
                
                except Exception as e:
                    messagebox.showerror('Ошибка!', f"{e}\nЛист не подходит по формату, проверьте данные и колонки!")
                    
            else:
                messagebox.showwarning("Предупреждение", "Нужно выбрать хотя бы 1 лист")
        else:
            messagebox.showwarning("Предупреждение", "Сначала выберите файл Excel")


if __name__ == "__main__":
    app = SafetyWheel2024()
    
    
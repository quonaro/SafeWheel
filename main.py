import pprint
import re
from openpyxl import Workbook, load_workbook
from dataclasses import dataclass
import datetime
from datetime import timedelta
import os
from openpyxl.styles import Alignment

@dataclass
class Member:
    name : str
    time : timedelta
    penalty_point : int
    rank : int
    gender : str
    
@dataclass
class Command:
    name : str
    members : list[Member]
    time : datetime.time
    penalty_points: int
    rank: int = None
    
    
    def get_list(self):
        global_list = []
        for i,member in enumerate(self.members,start=1):
            
            global_list.append([
                self.name,
                member.name,
                member.gender,
                member.time,
                member.penalty_point,
                self.time,
                self.penalty_points,
                member.rank,
                self.rank
            ])
        return global_list
   
    
  
    
def clean_row(lst : list[str]) -> list :
    row = []
    for ellement in lst:
        if isinstance(ellement,str):
            ellement = ellement.strip()
            ellement = ellement.replace('\n','')
        row.append(ellement)
    return row

def time_to_timedelta(t):
    return timedelta(hours=t.hour, minutes=t.minute, seconds=t.second)

def remove_empty(ws):
        # Определение максимальных строк и столбцов
    max_row = ws.max_row
    max_column = ws.max_column

    # Удаление пустых строк
    for row in range(max_row, 0, -1):
        if all(ws.cell(row=row, column=col).value is None for col in range(1, max_column + 1)):
            ws.delete_rows(row)

    # Удаление пустых столбцов
    for col in range(max_column, 0, -1):
        if all(ws.cell(row=row, column=col).value is None for row in range(1, max_row + 1)):
            ws.delete_cols(col)
    return ws

def get_data(sheet) -> list[Command]:
    
    sheet = remove_empty(sheet)
    headers = [cell.value for cell in sheet[2]]
    data = list(sheet.iter_rows(values_only=True))[2:]
    
    # Получение данных в виде объектов датакласса
    member_index = 1
    command = ""
    result : list[Command] = []
    members : list[Member] = []
    
    # Разделение участников на девочек и мальчиков
    girls = [row for row in data if row[2].lower() == 'ж']  # Пол может быть в разных форматах, проверьте как он хранится
    boys = [row for row in data if row[2].lower() == 'м']

    # Сортировка девочек и мальчиков по времени и штрафным баллам
    sorted_girls = sorted(girls, key=lambda e: (e[4], time_to_timedelta(e[3]).total_seconds() + e[4]))
    sorted_boys = sorted(boys, key=lambda e: (e[4], time_to_timedelta(e[3]).total_seconds() + e[4]))

    # Присвоение рангов для девочек
    ranks_girls = {}
    for index, row in enumerate(sorted_girls, start=1):
        row = list(sorted_girls[index-1])
        row = clean_row(row)
        ranks_girls[row[1]] = index

    # Присвоение рангов для мальчиков
    ranks_boys = {}
    for index, row in enumerate(sorted_boys, start=1):
        row = list(sorted_boys[index-1])
        row = clean_row(row)
        ranks_boys[row[1]] = index

    # Сопоставление мест для каждого участника
    for row in data:
        row = clean_row(row)
        if row[2].lower() == 'ж':
            row[7] = ranks_girls[row[1]]
        elif row[2].lower() == 'м':
            row[7] = ranks_boys[row[1]]

        members.append(Member(row[1], time_to_timedelta(row[3]), row[4], row[7], row[2]))

        if member_index == 4:
            sum_of_penalty_point = sum([m.penalty_point for m in members])
            sum_of_time = sum([m.time for m in members], timedelta())
            result.append(Command(command, members, sum_of_time, sum_of_penalty_point))
            members = []
            member_index = 0
        elif member_index == 1:
            command = row[0]

        member_index += 1



    """Сортировка команд"""
    sort_result = sorted(result, key=lambda m: (m.penalty_points, m.time.total_seconds() + m.penalty_points))

    for i, cm in enumerate(sort_result):
        cm.rank = i

    return sort_result

def get_list_from_data(lst : list[Command]):
    bg_list = []
    for cmd in lst[1:]:
        bg_list.append(cmd)
    return bg_list

def save_final(wb,sheetnames):
    
    
    # Заполнение данными
    try:
        wb2 = load_workbook('Результаты.xlsx')
    except FileNotFoundError:
        wb2 = Workbook()
    del wb2[wb2.sheetnames[0]]
    for sheetname in sheetnames:
        new_sheet = wb2.create_sheet(title=f'{sheetname}_ИТОГ')
        old_sheet=wb[sheetname]
        d = get_list_from_data(get_data(old_sheet))
        new_sheet.append(['Команда','ФИО участника','Пол','Время участника','Кол-во штрафных баллов','Общее время','Общее кол-во штрафных баллов','Место в личном зачёте','Место команды'])
        
        data = []
        for command in d:
            for row in command.get_list():
                data.append(row)
                new_sheet.append(row)
        
    
    
        """--------------------------------------------"""
    
    
    
        # Устанавливаем выравнивание для первой строки (центрирование и перенос слов)
        for cell in new_sheet[1]:
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

        # Автоматически подгоняем ширину столбцов под содержимое
        for column in new_sheet.columns:
            max_length = max(len(str(cell.value)) for cell in column)
            adjusted_width = (max_length + 2)  
            new_sheet.column_dimensions[column[0].column_letter].width = adjusted_width

        # Объединяем каждые четыре строки в первой, пятой, шестой и восьмой колонках, начиная со второй строки
        total_rows = len(data) + 1 # +1 для учета заголовка

        for i in range(2, total_rows + 1, 4):  
            start_row = i
            end_row = min(i + 3, total_rows)  

            # Объединение для первой колонки
            new_sheet.merge_cells(start_row=start_row, start_column=1, end_row=end_row, end_column=1)
            
            # Объединение для пятой колонки
            new_sheet.merge_cells(start_row=start_row, start_column=6, end_row=end_row, end_column=6)

            # Объединение для шестой колонки
            new_sheet.merge_cells(start_row=start_row, start_column=7, end_row=end_row, end_column=7)

            # Объединение для восьмой колонки
            new_sheet.merge_cells(start_row=start_row, start_column=9, end_row=end_row, end_column=9)

            # Устанавливаем выравнивание для объединенных ячеек
            for col in [1, 6, 7, 9]:
                merged_cell = new_sheet.cell(row=start_row, column=col)
                merged_cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
    wb2.save(f'Результаты.xlsx')
    
def save_result():
    wb = load_workbook('Результаты.xlsx')
    list_of_sheets = wb.sheetnames
    result = {}  # Инициализируем словарь для накопления данных

    for sheetname in list_of_sheets:
        if sheetname.lower() != 'итоговый':
            sheet = wb[sheetname]

    def normalize_key(key):
        """Приведение ключа к нижнему регистру, без пробелов и вспомогательных знаков"""
        if key:
            key = key.lower()  # Приведение к нижнему регистру
            key = re.sub(r'\s+', '', key)  # Убираем пробелы
            key = re.sub(r'[^\w]', '', key)  # Убираем все символы, кроме букв и цифр
        return key

    # Загружаем файл Excel
    wb = load_workbook('Результаты.xlsx')
    list_of_sheets = wb.sheetnames
    list_of_sheets = [i for i in list_of_sheets if i != 'Итоговые результаты']
    result = {}  # Инициализируем словарь для накопления данных

    for sheetname in list_of_sheets:
        if  'итог' in sheetname.lower():
            sheet = wb[sheetname]

            # Получение значений из 1 и 7 колонки
            col1_values = [row[0].value for row in sheet.iter_rows(min_row=2)]  # Оригинальные значения
            col1_values_normalize = [normalize_key(i) for i in col1_values]  # Нормализованные значения
            col7_values = [row[6].value for row in sheet.iter_rows(min_row=2)]  # Значения из 7-й колонки

            # Создаем словарь, где ключ - нормализованное значение, а значения - оригинальные и данные
            for original, normalized, score in zip(col1_values, col1_values_normalize, col7_values):
                if normalized:  # Проверяем, что нормализованный ключ не None
                    if normalized not in result:

                        result[normalized] = [original]  # Инициализируем список, начиная с оригинального названия
                    
                    result[normalized].append(score)  # Добавляем данные в список
                
    
    
    # После завершения всех итераций, добавляем сумму значений
    for key in result:
        values = result[key][1:]  # Все значения, кроме первого
        if values:
            total_sum = sum(v for v in values if isinstance(v, (int, float)))  # Сумма числовых значений
            result[key].append(total_sum)  # Добавляем сумму как последний элемент
        
    
    result = list(result.values())
    result = sorted(result,key = lambda x : x[-1])
    
    
    # Запись в новый лист
    if 'Итоговые результаты' in wb.sheetnames:
        del wb['Итоговые результаты']
    new_sheet = wb.create_sheet(title='Итоговые результаты')
    new_sheet.append(
        ["Команда"] +
        [f"{i.replace('_ИТОГ','')} \nкол-во штрафных баллов" for i in list_of_sheets] + \
        ["Общее кол-во штрафных очков"]
        ) 
    
    for row in result:
        new_sheet.append(row)
    
    # Устанавливаем выравнивание для первой строки (центрирование и перенос слов)
    for cell in new_sheet[1]:
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    # Автоматически подгоняем ширину столбцов под содержимое
    for column in new_sheet.columns:
        max_length = max(len(str(cell.value)) for cell in column)
        adjusted_width = (max_length + 2)  
        new_sheet.column_dimensions[column[0].column_letter].width = adjusted_width
    
    
    wb.save('Результаты.xlsx')
    
    
if __name__ == "__main__":
    save_result()
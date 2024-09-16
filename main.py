from pprint import pprint
from openpyxl import Workbook, load_workbook
from dataclasses import dataclass
import datetime
from datetime import timedelta
import os

@dataclass
class Member:
    name : str
    time : timedelta
    penalty_point : int
    rank : int
    
    def __repr__(self):
        return f'{self.name}|{self.time}|{self.penalty_point}|{self.rank}' 
 
@dataclass
class Command:
    name : str
    members : list[Member]
    time : datetime.time
    penalty_points: int
    rank: int = None
    
   
    
  
    
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
    
    # Сопоставление мест для каждого участника
    
    sorted_data = sorted(data, key=lambda e: (time_to_timedelta(e[3]).total_seconds() + e[4], e[4]))
    
    ranks = {}
    for index, row in enumerate(sorted_data, start=1):
        row = list(sorted_data[index-1])
        row = clean_row(row)
        ranks[row[1]] = index
    
    
    
    for row in data:
        row = clean_row(row)
        row[7] = ranks[row[1]]
        members.append(Member(row[1], time_to_timedelta(row[3]), row[4],row[7]))
        
        
        if member_index == 4:
            sum_of_penalty_point = sum([m.penalty_point for m in members])
            sum_of_time = sum([m.time for m in members],timedelta())
            result.append(Command(command,members,sum_of_time,sum_of_penalty_point))
            members = []
            member_index = 0
        elif member_index == 1:
            command = row[0]
        
        member_index+=1
    
    sort_result = sorted(result, key= lambda m : (m.time.total_seconds() + m.penalty_points, m.penalty_points))
    
    for i,cm in enumerate(sort_result):
        cm.rank = i

    
    return headers + sort_result

def get_list_from_data(lst : list[Command]):
    bg_list = []
    for cmd in lst[1:]:
        bg_list.append(cmd)
    return bg_list


def save_final(wb,sheetnames):
    
    try:
        wb2 = load_workbook('Результаты.xlsx')
    except FileNotFoundError:
        wb2 = Workbook()
    del wb2[wb2.sheetnames[0]]
    for sheetname in sheetnames:
        new_sheet = wb2.create_sheet(title=f'{sheetname}_ИТОГ')
        sheet=wb[sheetname]
        print(get_list_from_data(get_data(sheet)))
        
        
        wb2.save(f'Результаты.xlsx')

    
    
    
if __name__ == "__main__":
    save_final(load_workbook('test.xlsx'),['МЕДИЦИНА'])
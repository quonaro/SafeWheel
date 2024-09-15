from pprint import pprint
from openpyxl import load_workbook
from dataclasses import dataclass
import datetime
from datetime import timedelta

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

def get_data(sheet) -> list[Command]:
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

    
    return sort_result

def get_final_results():
    ...





if __name__ == "__main__":
    # Загрузка рабочей книги
    workbook = load_workbook('test.xlsx',data_only=True)
    # Выбор активного листа
    sheet = workbook['МЕДИЦИНА']
    
    remove_empty(sheet)
    pprint(get_data(sheet))
    
    
    
    
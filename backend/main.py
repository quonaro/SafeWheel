from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn
from tortoise.contrib.fastapi import register_tortoise
from models import Wheel, WheelData, WheelResponse

app = FastAPI(title="SafeWheel API", version="1.0.0")

# Настройка CORS для работы с Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Регистрируем Tortoise ORM
register_tortoise(
    app,
    db_url="sqlite://./safewheel.db",
    modules={"models": ["models"]},
    generate_schemas=True,
    add_exception_handlers=True,
)


@app.get("/")
async def root():
    return {"message": "SafeWheel API работает!"}


@app.get("/api/wheels", response_model=List[WheelData])
async def get_wheels():
    """Получить список всех колес"""
    wheels = await Wheel.all()
    return [WheelData.from_orm(wheel) for wheel in wheels]


@app.get("/api/wheels/{wheel_id}", response_model=WheelData)
async def get_wheel(wheel_id: int):
    """Получить конкретное колесо по ID"""
    wheel = await Wheel.get_or_none(id=wheel_id)
    if not wheel:
        raise HTTPException(status_code=404, detail="Колесо не найдено")
    return WheelData.from_orm(wheel)


@app.post("/api/wheels", response_model=WheelResponse)
async def create_wheel(wheel: WheelData):
    """Создать новое колесо"""
    wheel_obj = await Wheel.create(
        name=wheel.name,
        diameter=wheel.diameter,
        width=wheel.width,
        material=wheel.material,
        condition=wheel.condition
    )
    wheel_data = WheelData.from_orm(wheel_obj)
    return WheelResponse(
        success=True, message="Колесо успешно создано", data=wheel_data
    )


@app.put("/api/wheels/{wheel_id}", response_model=WheelResponse)
async def update_wheel(wheel_id: int, wheel: WheelData):
    """Обновить колесо"""
    existing_wheel = await Wheel.get_or_none(id=wheel_id)
    if not existing_wheel:
        raise HTTPException(status_code=404, detail="Колесо не найдено")
    
    await existing_wheel.update_from_dict(wheel.dict())
    await existing_wheel.save()
    
    wheel_data = WheelData.from_orm(existing_wheel)
    return WheelResponse(
        success=True, message="Колесо успешно обновлено", data=wheel_data
    )


@app.delete("/api/wheels/{wheel_id}", response_model=WheelResponse)
async def delete_wheel(wheel_id: int):
    """Удалить колесо"""
    wheel = await Wheel.get_or_none(id=wheel_id)
    if not wheel:
        raise HTTPException(status_code=404, detail="Колесо не найдено")
    
    wheel_data = WheelData.from_orm(wheel)
    await wheel.delete()
    
    return WheelResponse(
        success=True, message="Колесо успешно удалено", data=wheel_data
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

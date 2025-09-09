from tortoise.models import Model
from tortoise import fields
from pydantic import BaseModel
from typing import Optional


class Wheel(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    diameter = fields.FloatField()
    width = fields.FloatField()
    material = fields.CharField(max_length=100)
    condition = fields.CharField(max_length=100)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "wheels"

    def __str__(self):
        return f"Wheel(id={self.id}, name='{self.name}')"


# Pydantic модели для API
class WheelData(BaseModel):
    id: Optional[int] = None
    name: str
    diameter: float
    width: float
    material: str
    condition: str

    class Config:
        from_attributes = True


class WheelResponse(BaseModel):
    success: bool
    message: str
    data: Optional[WheelData] = None

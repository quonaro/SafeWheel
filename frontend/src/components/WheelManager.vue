<template>
  <div class="wheel-manager">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span>Управление колесами</span>
          <el-button type="primary" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon>
            Добавить колесо
          </el-button>
        </div>
      </template>

      <!-- Таблица колес -->
      <el-table :data="wheels" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="Название" />
        <el-table-column prop="diameter" label="Диаметр (мм)" width="120" />
        <el-table-column prop="width" label="Ширина (мм)" width="120" />
        <el-table-column prop="material" label="Материал" width="120" />
        <el-table-column prop="condition" label="Состояние" width="120">
          <template #default="scope">
            <el-tag :type="getConditionType(scope.row.condition)">
              {{ scope.row.condition }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="200">
          <template #default="scope">
            <el-button size="small" @click="editWheel(scope.row)">
              <el-icon><Edit /></el-icon>
              Редактировать
            </el-button>
            <el-button size="small" type="danger" @click="deleteWheel(scope.row.id)">
              <el-icon><Delete /></el-icon>
              Удалить
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Диалог добавления/редактирования -->
    <el-dialog 
      v-model="showAddDialog" 
      :title="editingWheel ? 'Редактировать колесо' : 'Добавить колесо'"
      width="500px"
    >
      <el-form :model="wheelForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="Название" prop="name">
          <el-input v-model="wheelForm.name" placeholder="Введите название" />
        </el-form-item>
        <el-form-item label="Диаметр (мм)" prop="diameter">
          <el-input-number v-model="wheelForm.diameter" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="Ширина (мм)" prop="width">
          <el-input-number v-model="wheelForm.width" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="Материал" prop="material">
          <el-select v-model="wheelForm.material" placeholder="Выберите материал">
            <el-option label="Резина" value="Резина" />
            <el-option label="Пластик" value="Пластик" />
            <el-option label="Металл" value="Металл" />
            <el-option label="Композит" value="Композит" />
          </el-select>
        </el-form-item>
        <el-form-item label="Состояние" prop="condition">
          <el-select v-model="wheelForm.condition" placeholder="Выберите состояние">
            <el-option label="Отличное" value="Отличное" />
            <el-option label="Хорошее" value="Хорошее" />
            <el-option label="Удовлетворительное" value="Удовлетворительное" />
            <el-option label="Плохое" value="Плохое" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddDialog = false">Отмена</el-button>
        <el-button type="primary" @click="saveWheel">
          {{ editingWheel ? 'Обновить' : 'Добавить' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { wheelApi } from '../services/api'

const loading = ref(false)
const wheels = ref([])
const showAddDialog = ref(false)
const editingWheel = ref(null)
const formRef = ref()

const wheelForm = reactive({
  name: '',
  diameter: 0,
  width: 0,
  material: '',
  condition: ''
})

const rules = {
  name: [
    { required: true, message: 'Пожалуйста, введите название', trigger: 'blur' }
  ],
  diameter: [
    { required: true, message: 'Пожалуйста, введите диаметр', trigger: 'blur' }
  ],
  width: [
    { required: true, message: 'Пожалуйста, введите ширину', trigger: 'blur' }
  ],
  material: [
    { required: true, message: 'Пожалуйста, выберите материал', trigger: 'change' }
  ],
  condition: [
    { required: true, message: 'Пожалуйста, выберите состояние', trigger: 'change' }
  ]
}

const getConditionType = (condition) => {
  const types = {
    'Отличное': 'success',
    'Хорошее': 'info',
    'Удовлетворительное': 'warning',
    'Плохое': 'danger'
  }
  return types[condition] || 'info'
}

const loadWheels = async () => {
  try {
    loading.value = true
    const response = await wheelApi.getWheels()
    wheels.value = response.data
  } catch (error) {
    ElMessage.error('Ошибка при загрузке данных')
    console.error('Error loading wheels:', error)
  } finally {
    loading.value = false
  }
}

const editWheel = (wheel) => {
  editingWheel.value = wheel
  Object.assign(wheelForm, wheel)
  showAddDialog.value = true
}

const deleteWheel = async (id) => {
  try {
    await ElMessageBox.confirm('Вы уверены, что хотите удалить это колесо?', 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    
    await wheelApi.deleteWheel(id)
    ElMessage.success('Колесо успешно удалено')
    loadWheels()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Ошибка при удалении колеса')
      console.error('Error deleting wheel:', error)
    }
  }
}

const saveWheel = async () => {
  try {
    await formRef.value.validate()
    
    if (editingWheel.value) {
      await wheelApi.updateWheel(editingWheel.value.id, wheelForm)
      ElMessage.success('Колесо успешно обновлено')
    } else {
      await wheelApi.createWheel(wheelForm)
      ElMessage.success('Колесо успешно добавлено')
    }
    
    showAddDialog.value = false
    resetForm()
    loadWheels()
  } catch (error) {
    ElMessage.error('Ошибка при сохранении колеса')
    console.error('Error saving wheel:', error)
  }
}

const resetForm = () => {
  editingWheel.value = null
  Object.assign(wheelForm, {
    name: '',
    diameter: 0,
    width: 0,
    material: '',
    condition: ''
  })
  formRef.value?.resetFields()
}

onMounted(() => {
  loadWheels()
})
</script>

<style scoped>
.wheel-manager {
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 18px;
  font-weight: bold;
}
</style>

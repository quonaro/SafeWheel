<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";
import { IconPlus, IconTrash, IconPencil, IconFlag } from "@tabler/icons-vue";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStages } from "@/composables/useApi";
const props = defineProps<{ competitionId: number }>();

const { stages, load, create, update, remove } = useStages();

const showDialog = ref(false);
const editingStage = ref<any>(null);
const stageName = ref("");

onMounted(() => load(props.competitionId));
watch(
  () => props.competitionId,
  () => load(props.competitionId),
);

function openCreate() {
  editingStage.value = null;
  stageName.value = "";
  showDialog.value = true;
}

function openEdit(stage: any) {
  editingStage.value = stage;
  stageName.value = stage.name;
  showDialog.value = true;
}

async function save() {
  if (!stageName.value.trim()) return;
  const isEdit = !!editingStage.value;
  const result = isEdit
    ? await update(editingStage.value.id, stageName.value)
    : await create(props.competitionId, stageName.value);
  if (result === null) return;
  showDialog.value = false;
  await load(props.competitionId);
  toast.success(isEdit ? "Этап обновлён" : "Этап создан", {
    description: stageName.value,
  });
}

async function removeStage(stage: any) {
  const result = await remove(stage.id);
  if (result === null) return;
  await load(props.competitionId);
  toast.success("Этап удалён", { description: stage.name });
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Этапы соревнования</h2>
      <Button size="sm" @click="openCreate">
        <IconPlus class="mr-2 h-4 w-4" />
        Добавить этап
      </Button>
    </div>

    <div
      v-if="stages.length === 0"
      class="text-center py-12 text-muted-foreground"
    >
      <IconFlag class="mx-auto mb-3 h-12 w-12" />
      <p>Нет этапов. Создайте первый этап.</p>
    </div>

    <div v-else class="space-y-2">
      <Card v-for="(stage, idx) in stages" :key="stage.id">
        <CardContent class="flex items-center justify-between py-3">
          <div class="flex items-center gap-3">
            <Badge variant="secondary">{{ idx + 1 }}</Badge>
            <span class="font-medium">{{ stage.name }}</span>
          </div>
          <div class="flex gap-1">
            <Button variant="ghost" size="icon" @click="openEdit(stage)">
              <IconPencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" @click="removeStage(stage)">
              <IconTrash class="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            editingStage ? "Редактировать этап" : "Новый этап"
          }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Название этапа</Label>
            <Input v-model="stageName" placeholder="Название этапа" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">Отмена</Button>
          <Button @click="save">Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

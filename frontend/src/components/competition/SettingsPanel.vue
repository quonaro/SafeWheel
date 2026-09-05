<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";
import { IconDeviceFloppy } from "@tabler/icons-vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useCompetitions } from "@/composables/useApi";
const props = defineProps<{ competition: any }>();

const { update } = useCompetitions();

const name = ref("");
const description = ref("");
const maxParticipants = ref(4);

onMounted(() => {
  name.value = props.competition.name;
  description.value = props.competition.description;
  try {
    const settings = JSON.parse(props.competition.settings);
    if (settings.maxParticipantsPerTeam) {
      maxParticipants.value = settings.maxParticipantsPerTeam;
    }
  } catch {
    // use default
  }
});

watch(
  () => props.competition.id,
  () => {
    name.value = props.competition.name;
    description.value = props.competition.description;
    try {
      const settings = JSON.parse(props.competition.settings);
      if (settings.maxParticipantsPerTeam) {
        maxParticipants.value = settings.maxParticipantsPerTeam;
      }
    } catch {
      maxParticipants.value = 4;
    }
  },
);

async function save() {
  const settings = JSON.stringify({
    maxParticipantsPerTeam: maxParticipants.value,
  });
  await update(props.competition.id, {
    name: name.value,
    description: description.value,
    settings,
  });
}
</script>

<template>
  <div class="space-y-4 max-w-2xl">
    <h2 class="text-lg font-semibold">Настройки соревнования</h2>

    <Card>
      <CardHeader>
        <CardTitle>Основная информация</CardTitle>
        <CardDescription>Название и описание соревнования</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label>Название</Label>
          <Input v-model="name" placeholder="Название соревнования" />
        </div>
        <div class="space-y-2">
          <Label>Описание</Label>
          <Input v-model="description" placeholder="Описание" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Параметры</CardTitle>
        <CardDescription>Настройки формата соревнования</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label>Максимум участников в команде</Label>
          <Input v-model="maxParticipants" type="number" min="1" max="10" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Критерии ранжирования</CardTitle>
        <CardDescription
          >Порядок определения мест в турнирной таблице</CardDescription
        >
      </CardHeader>
      <CardContent>
        <ol class="space-y-2 text-sm text-muted-foreground">
          <li>1. Штрафные очки (по возрастанию)</li>
          <li>2. Время (по возрастанию)</li>
          <li>3. Средний возраст (по возрастанию)</li>
        </ol>
      </CardContent>
    </Card>

    <Button @click="save">
      <IconDeviceFloppy class="mr-2 h-4 w-4" />
      Сохранить
    </Button>
  </div>
</template>

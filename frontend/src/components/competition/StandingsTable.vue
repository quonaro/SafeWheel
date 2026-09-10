<script lang="ts" setup>
import { ref, watch, onMounted, computed } from "vue";
import { IconChartBar, IconFileDownload, IconTrophy } from "@tabler/icons-vue";
import { toast } from "@/composables/useToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useStandings, useExport, useFormat } from "@/composables/useApi";
import { useAppState } from "@/composables/useAppState";

const props = defineProps<{ competitionId: number }>();

const {
  standings,
  stageStandings,
  individualStandings,
  loadStandings,
  loadStageStandings,
  loadIndividualStandings,
} = useStandings();
const { exportOverall, exportStages, exportIndividual } = useExport();
const { formatTimeLocal } = useFormat();
const { state } = useAppState();

const view = ref<"overall" | "stages" | "individual">(
  state.standings?.[props.competitionId]?.view ?? "overall",
);

onMounted(() => {
  loadStandings(props.competitionId);
  loadStageStandings(props.competitionId);
  loadIndividualStandings(props.competitionId);
});

watch(
  () => props.competitionId,
  (competitionId) => {
    view.value = state.standings?.[competitionId]?.view ?? "overall";
    loadStandings(competitionId);
    loadStageStandings(competitionId);
    loadIndividualStandings(competitionId);
  },
);

watch(view, (value) => {
  if (!state.standings) state.standings = {};
  const current = state.standings[props.competitionId] ?? {};
  state.standings[props.competitionId] = { ...current, view: value };
});

const medalColors = ["text-yellow-500", "text-gray-400", "text-orange-400"];

async function handleExportOverall() {
  const result = await exportOverall(props.competitionId);
  if (result !== null) {
    toast.success("Экспорт завершён", {
      description: "Общие результаты сохранены в файл",
    });
  }
}

async function handleExportStages() {
  const result = await exportStages(props.competitionId);
  if (result !== null) {
    toast.success("Экспорт завершён", {
      description: "Результаты по этапам сохранены в файл",
    });
  }
}

async function handleExportIndividual() {
  const result = await exportIndividual(props.competitionId);
  if (result !== null) {
    toast.success("Экспорт завершён", {
      description: "Личное первенство сохранено в файл",
    });
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Турнирная таблица</h2>
      <div class="flex gap-2">
        <Button
          :variant="view === 'overall' ? 'default' : 'outline'"
          size="sm"
          @click="view = 'overall'"
        >
          Общие результаты
        </Button>
        <Button
          :variant="view === 'stages' ? 'default' : 'outline'"
          size="sm"
          @click="view = 'stages'"
        >
          По этапам
        </Button>
        <Button
          :variant="view === 'individual' ? 'default' : 'outline'"
          size="sm"
          @click="view = 'individual'"
        >
          Личное первенство
        </Button>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="handleExportOverall">
          <IconFileDownload class="h-4 w-4" />
          Общие результаты
        </Button>
        <Button variant="outline" size="sm" @click="handleExportStages">
          <IconFileDownload class="h-4 w-4" />
          По этапам
        </Button>
        <Button variant="outline" size="sm" @click="handleExportIndividual">
          <IconFileDownload class="h-4 w-4" />
          Личное
        </Button>
      </div>
    </div>

    <!-- Overall Standings -->
    <div v-if="view === 'overall'">
      <div
        v-if="standings.length === 0"
        class="text-center py-12 text-muted-foreground"
      >
        <IconChartBar class="mx-auto mb-3 h-12 w-12" />
        <p>Нет данных. Добавьте результаты.</p>
      </div>
      <Card v-else class="transition-all duration-200 hover:shadow-md">
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-16 text-center">Место</TableHead>
                <TableHead>Команда</TableHead>
                <TableHead class="text-center">Сумма всех мест</TableHead>
                <TableHead class="text-center">Сумма призовых мест</TableHead>
                <TableHead class="text-center">1-х мест</TableHead>
                <TableHead class="text-center">2-х мест</TableHead>
                <TableHead class="text-center">3-х мест</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="s in standings"
                :key="s.team_id"
                :class="s.out_of_competition ? 'text-muted-foreground' : ''"
              >
                <TableCell class="text-center">
                  <span
                    v-if="!s.out_of_competition"
                    :class="[
                      'inline-flex items-center gap-1 font-bold',
                      s.rank <= 3 ? medalColors[s.rank - 1] : '',
                    ]"
                  >
                    <IconTrophy v-if="s.rank <= 3" class="h-4 w-4" />
                    {{ s.rank }}
                  </span>
                  <span v-else class="font-bold">—</span>
                </TableCell>
                <TableCell class="font-medium">
                  {{ s.team_name }}
                  <Badge
                    v-if="s.out_of_competition"
                    variant="secondary"
                    class="ml-2 font-normal"
                    >вне конкурса</Badge
                  >
                </TableCell>
                <TableCell class="text-center font-bold">{{
                  s.total_place_points
                }}</TableCell>
                <TableCell class="text-center font-bold">{{
                  s.prize_place_sum
                }}</TableCell>
                <TableCell class="text-center">{{ s.first_places }}</TableCell>
                <TableCell class="text-center">{{ s.second_places }}</TableCell>
                <TableCell class="text-center">{{ s.third_places }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    <!-- Stage Standings -->
    <div v-else-if="view === 'stages'" class="space-y-4">
      <div
        v-if="stageStandings.length === 0"
        class="text-center py-12 text-muted-foreground"
      >
        <IconChartBar class="mx-auto mb-3 h-12 w-12" />
        <p>Нет данных по этапам</p>
      </div>
      <Card
        v-for="stage in stageStandings"
        :key="stage.stage_id"
        class="transition-all duration-200 hover:shadow-md"
      >
        <CardHeader class="py-3">
          <CardTitle class="text-sm">{{ stage.stage_name }}</CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-12 text-center">Место</TableHead>
                <TableHead>Команда</TableHead>
                <TableHead class="text-center">Штрафы</TableHead>
                <TableHead class="text-center">Время</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="r in stage.results"
                :key="r.team_id"
                :class="r.out_of_competition ? 'text-muted-foreground' : ''"
              >
                <TableCell class="text-center">
                  <span
                    v-if="!r.out_of_competition"
                    :class="[
                      'inline-flex items-center gap-1 font-bold',
                      r.rank <= 3 ? medalColors[r.rank - 1] : '',
                    ]"
                  >
                    <IconTrophy v-if="r.rank <= 3" class="h-4 w-4" />
                    {{ r.rank }}
                  </span>
                  <span v-else class="font-bold">—</span>
                </TableCell>
                <TableCell class="font-medium">
                  {{ r.team_name }}
                  <Badge
                    v-if="r.out_of_competition"
                    variant="secondary"
                    class="ml-2 font-normal"
                    >вне конкурса</Badge
                  >
                </TableCell>
                <TableCell class="text-center font-bold">{{
                  r.total_penalties
                }}</TableCell>
                <TableCell class="text-center font-mono">{{
                  formatTimeLocal(r.total_time)
                }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    <!-- Individual Standings -->
    <div v-else class="space-y-4">
      <div
        v-if="individualStandings.length === 0"
        class="text-center py-12 text-muted-foreground"
      >
        <IconChartBar class="mx-auto mb-3 h-12 w-12" />
        <p>Нет данных по личному первенству</p>
      </div>
      <Card
        v-for="stage in individualStandings"
        :key="stage.stage_id"
        class="transition-all duration-200 hover:shadow-md"
      >
        <CardHeader class="py-3">
          <CardTitle class="text-sm">{{ stage.stage_name }}</CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="text-xs font-semibold mb-2 text-muted-foreground">
                Юноши
              </h4>
              <Table v-if="stage.boys && stage.boys.length > 0">
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-12 text-center">Место</TableHead>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Команда</TableHead>
                    <TableHead class="text-center">Штрафы</TableHead>
                    <TableHead class="text-center">Время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="b in stage.boys" :key="b.participant_id">
                    <TableCell class="text-center">
                      <span
                        :class="[
                          'inline-flex items-center gap-1 font-bold',
                          b.rank <= 3 ? medalColors[b.rank - 1] : '',
                        ]"
                      >
                        <IconTrophy v-if="b.rank <= 3" class="h-4 w-4" />
                        {{ b.rank }}
                      </span>
                    </TableCell>
                    <TableCell class="font-medium">{{ b.full_name }}</TableCell>
                    <TableCell class="text-sm">{{ b.team_name }}</TableCell>
                    <TableCell class="text-center font-bold">{{
                      b.penalty_points
                    }}</TableCell>
                    <TableCell class="text-center font-mono">{{
                      formatTimeLocal(b.time_seconds)
                    }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p v-else class="text-sm text-muted-foreground py-2">
                Нет данных
              </p>
            </div>
            <div>
              <h4 class="text-xs font-semibold mb-2 text-muted-foreground">
                Девушки
              </h4>
              <Table v-if="stage.girls && stage.girls.length > 0">
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-12 text-center">Место</TableHead>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Команда</TableHead>
                    <TableHead class="text-center">Штрафы</TableHead>
                    <TableHead class="text-center">Время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="g in stage.girls" :key="g.participant_id">
                    <TableCell class="text-center">
                      <span
                        :class="[
                          'inline-flex items-center gap-1 font-bold',
                          g.rank <= 3 ? medalColors[g.rank - 1] : '',
                        ]"
                      >
                        <IconTrophy v-if="g.rank <= 3" class="h-4 w-4" />
                        {{ g.rank }}
                      </span>
                    </TableCell>
                    <TableCell class="font-medium">{{ g.full_name }}</TableCell>
                    <TableCell class="text-sm">{{ g.team_name }}</TableCell>
                    <TableCell class="text-center font-bold">{{
                      g.penalty_points
                    }}</TableCell>
                    <TableCell class="text-center font-mono">{{
                      formatTimeLocal(g.time_seconds)
                    }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p v-else class="text-sm text-muted-foreground py-2">
                Нет данных
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

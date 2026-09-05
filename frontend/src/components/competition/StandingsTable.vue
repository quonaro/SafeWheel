<script lang="ts" setup>
import { ref, watch, onMounted, computed } from "vue";
import { IconChartBar, IconFileDownload } from "@tabler/icons-vue";
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

const props = defineProps<{ competitionId: number }>();

const { standings, stageStandings, loadStandings, loadStageStandings } =
  useStandings();
const { exportOverall, exportStages } = useExport();
const { formatTimeLocal } = useFormat();

const view = ref<"overall" | "stages">("overall");

onMounted(() => {
  loadStandings(props.competitionId);
  loadStageStandings(props.competitionId);
});

watch(
  () => props.competitionId,
  () => {
    loadStandings(props.competitionId);
    loadStageStandings(props.competitionId);
  },
);

const medalColors = ["text-yellow-500", "text-gray-400", "text-orange-400"];
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
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
      </div>
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="exportOverall(competitionId)"
        >
          <IconFileDownload class="mr-2 h-4 w-4" />
          Экспорт
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="exportStages(competitionId)"
        >
          <IconFileDownload class="mr-2 h-4 w-4" />
          По этапам
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
      <Card v-else>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-16 text-center">Место</TableHead>
                <TableHead>Команда</TableHead>
                <TableHead class="text-center">Штрафы</TableHead>
                <TableHead class="text-center">Время</TableHead>
                <TableHead class="text-center">Участников</TableHead>
                <TableHead class="text-center">Ср. возраст</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="s in standings" :key="s.team_id">
                <TableCell class="text-center">
                  <span
                    :class="[
                      'font-bold',
                      s.rank <= 3 ? medalColors[s.rank - 1] : '',
                    ]"
                  >
                    {{ s.rank }}
                  </span>
                </TableCell>
                <TableCell class="font-medium">{{ s.team_name }}</TableCell>
                <TableCell class="text-center">{{
                  s.total_penalties
                }}</TableCell>
                <TableCell class="text-center font-mono">{{
                  formatTimeLocal(s.total_time)
                }}</TableCell>
                <TableCell class="text-center">
                  <Badge
                    :variant="
                      s.is_incomplete_team ? 'destructive' : 'secondary'
                    "
                  >
                    {{ s.participant_count }}
                  </Badge>
                </TableCell>
                <TableCell class="text-center">{{
                  s.avg_age ? s.avg_age.toFixed(1) : "-"
                }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    <!-- Stage Standings -->
    <div v-else class="space-y-4">
      <div
        v-if="stageStandings.length === 0"
        class="text-center py-12 text-muted-foreground"
      >
        <IconChartBar class="mx-auto mb-3 h-12 w-12" />
        <p>Нет данных по этапам</p>
      </div>
      <Card v-for="stage in stageStandings" :key="stage.stage_id">
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
              <TableRow v-for="r in stage.results" :key="r.team_id">
                <TableCell class="text-center">
                  <span
                    :class="[
                      'font-bold',
                      r.rank <= 3 ? medalColors[r.rank - 1] : '',
                    ]"
                  >
                    {{ r.rank }}
                  </span>
                </TableCell>
                <TableCell class="font-medium">{{ r.team_name }}</TableCell>
                <TableCell class="text-center">{{
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
  </div>
</template>

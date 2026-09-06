import { reactive, toRaw, watch } from "vue";

export type ActiveTab =
  "teams" | "stages" | "results" | "standings" | "statistics";
export type StandingsView = "overall" | "stages" | "individual";

export interface AppState {
  selectedCompetitionId?: number | null;
  activeTab?: ActiveTab;
  results?: Record<number, { selectedStageId?: number | null }>;
  standings?: Record<number, { view?: StandingsView }>;
  teams?: Record<number, { expandedTeam?: number | null }>;
}

const STORAGE_KEY = "safe-wheel-app-state";

const defaultState: AppState = {
  selectedCompetitionId: null,
  activeTab: "teams",
  results: {},
  standings: {},
  teams: {},
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed: AppState = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      results: { ...defaultState.results, ...parsed.results },
      standings: { ...defaultState.standings, ...parsed.standings },
      teams: { ...defaultState.teams, ...parsed.teams },
    };
  } catch {
    return defaultState;
  }
}

function save(value: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(value)));
  } catch {
    // Ignore storage errors (e.g. private mode).
  }
}

const state = reactive<AppState>(load());

watch(
  () => state,
  () => save(state),
  { deep: true, flush: "sync" },
);

export function useAppState() {
  return { state };
}

export interface SunatStatusFixtureOptions {
  finish: boolean;
  abandon: boolean;
  retainedState?: string | null;
  queryFails?: boolean;
  heartbeat?: boolean;
}

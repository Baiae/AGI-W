export type Vector2 = { x: number; y: number };

export enum Direction {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
}

// Matches python EnvData dictionary structure expected by the agent
export interface EnvData {
  food_dist: number;
  food_dir: number; // 0-3
  safe_marker_dist: number;
  safe_dir: number;
  danger_marker_dist: number;
  danger_dir: number;
  hazard_dist: number;
  hazard_dir: number;
  home_marker_dist: number;
  home_dir: number;
}

export interface BeliefData {
  key: string;
  description: string;
  samples: number;
  successes: number;
  confidence: number;
}

export interface SimulationState {
  agentPos: Vector2;
  foodPos: Vector2;
  hazardPos: Vector2;
  safeMarkers: Vector2[];
  dangerMarkers: Vector2[];
  homePos: Vector2;
  energy: number;
  turn: number;
}

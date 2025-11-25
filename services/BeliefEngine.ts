import { EnvData } from '../types';

export class Belief {
  description: string;
  samples: number;
  successes: number;
  confidence: number;

  constructor(description: string) {
    this.description = description;
    this.samples = 0;
    this.successes = 0;
    this.confidence = 0.5; // agnostic prior
  }

  verify(success: boolean) {
    this.samples += 1;
    if (success) {
      this.successes += 1;
    }
    // Bayesian update (Laplace / Beta(1,1))
    this.confidence = (this.successes + 1) / (this.samples + 2);
  }

  toString() {
    return `[${this.confidence.toFixed(2)}] ${this.description}`;
  }
}

export class BeliefEngine {
  beliefs: Map<string, Belief>;

  constructor() {
    this.beliefs = new Map();
    this._init_priors();
  }

  _init_priors() {
    // Marker priors (low-confidence meaning)
    this.beliefs.set("SAFE_MARKER_TOWARD", new Belief("SAFE markers lead to good things"));
    this.beliefs.set("DANGER_MARKER_AWAY", new Belief("Avoiding DANGER markers prevents harm"));
    // Explicit food prior (so salience scaling has a belief target immediately)
    this.beliefs.set("FOOD_APPROACH", new Belief("Approaching FOOD yields Energy"));
    // Initializing these early so they show up in UI even before interaction
    this.beliefs.set("DANGER_APPROACH", new Belief("Approaching DANGER causes Harm"));
  }

  get_belief(key: string): Belief {
    if (!this.beliefs.has(key)) {
      this.beliefs.set(key, new Belief(`Hypothesis: ${key}`));
    }
    return this.beliefs.get(key)!;
  }

  get_confidence(key: string): number {
    if (this.beliefs.has(key)) {
      return this.beliefs.get(key)!.confidence;
    }
    return 0.5;
  }

  /**
   * Return (belief_key, Belief) if this action tests a proposition.
   */
  form_hypothesis(env_data: EnvData, action_idx: number): [string, Belief] | null {
    // 1) FOOD
    if (env_data.food_dist < 3 && action_idx === env_data.food_dir) {
      return ["FOOD_APPROACH", this.get_belief("FOOD_APPROACH")];
    }

    // 2) SAFE marker following
    if (env_data.safe_marker_dist < 3 && action_idx === env_data.safe_dir) {
      return ["SAFE_MARKER_TOWARD", this.get_belief("SAFE_MARKER_TOWARD")];
    }

    // 3) DANGER marker logic
    if (env_data.danger_marker_dist < 3) {
      if (action_idx !== env_data.danger_dir) {
        return ["DANGER_MARKER_AWAY", this.get_belief("DANGER_MARKER_AWAY")];
      } else {
        return ["DANGER_APPROACH", this.get_belief("DANGER_APPROACH")];
      }
    }

    return null;
  }

  exapt_from_chaos() {
    const b = this.get_belief("CHAOS_TO_FOOD");
    b.description = "Chaos can disclose nourishment";
    b.verify(true);
    return b;
  }
}

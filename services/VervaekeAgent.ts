import { BeliefEngine, Belief } from './BeliefEngine';
import { EnvData } from '../types';

export class VervaekeAgent {
  belief_engine: BeliefEngine;
  vitality: { energy: number };
  active_hypothesis_key: string | null;

  constructor() {
    this.belief_engine = new BeliefEngine();
    this.vitality = { energy: 50 }; // Start mid-energy
    this.active_hypothesis_key = null;
  }

  /**
   * Calculates the salience (attractiveness) of each of the 4 directions.
   * Returns an array of 4 floats [N, E, S, W].
   */
  calculate_salience(env_data: EnvData): number[] {
    const scores = [0, 0, 0, 0]; // Up, Right, Down, Left (matches Direction enum)
    const urgency = Math.max(0.0, (80 - this.vitality.energy) / 80.0);

    // --- LOGOS INTEGRATION ---
    // Base drives scaled by propositional confidence.
    // 0.5 = neutral prior; >0.5 strengthens; <0.5 weakens/extinguishes.

    const conf_food = this.belief_engine.get_confidence("FOOD_APPROACH");
    const w_food = (1.0 + (urgency * 5.0)) * (conf_food * 2.0);

    const conf_safe = this.belief_engine.get_confidence("SAFE_MARKER_TOWARD");
    const w_safe = (0.5 + (urgency * 2.0)) * (conf_safe * 2.0);

    const conf_danger = this.belief_engine.get_confidence("DANGER_MARKER_AWAY");
    const w_danger = (-3.0 - (urgency * 2.0)) * (conf_danger * 2.0);

    const w_home = (this.vitality.energy < 30) ? (urgency * 10.0) : 0.1;

    // --- APPLY SCORES ---
    if (env_data.food_dist < 5) {
      scores[env_data.food_dir] += w_food / (env_data.food_dist + 1);
    }

    if (env_data.hazard_dist < 3) {
      scores[env_data.hazard_dir] += w_danger / (env_data.hazard_dist + 1);
    }

    if (env_data.safe_marker_dist < 4) {
      scores[env_data.safe_dir] += w_safe / (env_data.safe_marker_dist + 1);
    }

    if (env_data.danger_marker_dist < 3) {
      scores[env_data.danger_dir] += w_danger / (env_data.danger_marker_dist + 1);
    }

    if (env_data.home_marker_dist < 15) {
      scores[env_data.home_dir] += w_home / (env_data.home_marker_dist + 1);
    }

    return scores;
  }

  /**
   * Called after an action is taken and the environment responds with an energy delta.
   */
  verify_hypothesis(outcome_delta: number) {
    if (!this.active_hypothesis_key) {
      return;
    }

    const key = this.active_hypothesis_key;
    let success = false;

    if (key.includes("FOOD_APPROACH")) {
      success = (outcome_delta > 0);
    }
    else if (key.includes("SAFE_MARKER_TOWARD")) {
      // Success = did not get harmed; ideally should trend positive
      success = (outcome_delta >= 0);
    }
    else if (key.includes("DANGER_MARKER_AWAY")) {
      // Success = avoided harm
      success = (outcome_delta >= 0);
    }
    else if (key.includes("DANGER_APPROACH")) {
      // Success = confirming it hurts
      success = (outcome_delta < 0);
    }

    const belief = this.belief_engine.get_belief(key);
    belief.verify(success);
    this.active_hypothesis_key = null;
  }

  // Helper to act based on salience
  decide_action(env_data: EnvData): number {
    const scores = this.calculate_salience(env_data);
    
    // Softmax-like or Argmax selection?
    // For deterministic agent visualization, argmax is clearer, 
    // but let's add tiny noise or just pick max to show the "Salience Landscape" effect strictly.
    
    let maxScore = -Infinity;
    let maxIdx = 0;
    
    // Simple Argmax
    for(let i = 0; i < 4; i++) {
        if(scores[i] > maxScore) {
            maxScore = scores[i];
            maxIdx = i;
        }
    }
    
    // Check for Hypothesis Formation
    const hypothesis = this.belief_engine.form_hypothesis(env_data, maxIdx);
    if (hypothesis) {
        this.active_hypothesis_key = hypothesis[0];
    } else {
        this.active_hypothesis_key = null;
    }
    
    return maxIdx;
  }
}

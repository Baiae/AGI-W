import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VervaekeAgent } from './services/VervaekeAgent';
import { BeliefChart } from './components/BeliefChart';
import { GridMap } from './components/GridMap';
import { SaliencePanel } from './components/SaliencePanel';
import { EnvData, Direction, Vector2, BeliefData } from './types';
import { Play, Pause, RotateCcw, FastForward, Zap, Activity, Brain } from 'lucide-react';

// --- Simulation Constants ---
const GRID_SIZE = 15;
const METABOLISM_COST = 1;
const FOOD_VALUE = 30;
const HAZARD_DAMAGE = 20;

// Initial Positions
const INITIAL_POS = { x: 7, y: 7 };
const INITIAL_FOOD = { x: 2, y: 2 };
const INITIAL_HAZARD = { x: 12, y: 12 };
const INITIAL_SAFE_MARKERS = [
    {x: 7, y: 6}, {x: 6, y: 5}, {x: 5, y: 4}, {x: 4, y: 3}, {x: 3, y: 3}, {x: 2, y: 3} // Trail to food
];
const INITIAL_DANGER_MARKERS = [
    {x: 8, y: 8}, {x: 9, y: 9}, {x: 10, y: 10}, {x: 11, y: 11} // Trail to hazard
];

const App: React.FC = () => {
  // --- State ---
  // Simulation entities
  const [agentPos, setAgentPos] = useState<Vector2>(INITIAL_POS);
  const [foodPos, setFoodPos] = useState<Vector2>(INITIAL_FOOD);
  const [hazardPos, setHazardPos] = useState<Vector2>(INITIAL_HAZARD);
  
  // Agent Internal State
  const agentRef = useRef(new VervaekeAgent());
  const [energy, setEnergy] = useState(50);
  const [beliefs, setBeliefs] = useState<BeliefData[]>([]);
  const [salienceScores, setSalienceScores] = useState<number[]>([0, 0, 0, 0]);
  const [activeHypothesis, setActiveHypothesis] = useState<string | null>(null);

  // Loop Control
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [tickCount, setTickCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${tickCount}] ${msg}`, ...prev].slice(0, 10));
  };

  // --- Helpers ---
  const getDist = (a: Vector2, b: Vector2) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  
  const getDir = (from: Vector2, to: Vector2): number => {
    // Simple heuristic: prioritize horizontal or vertical based on largest diff
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? Direction.East : Direction.West;
    } else {
        return dy > 0 ? Direction.South : Direction.North;
    }
  };

  // Construct EnvData for the Agent
  const getEnvData = (): EnvData => {
    const fDist = getDist(agentPos, foodPos);
    const hDist = getDist(agentPos, hazardPos);
    
    // Find nearest markers
    let nearestSafeDist = 999;
    let nearestSafeDir = 0;
    INITIAL_SAFE_MARKERS.forEach(m => {
        const d = getDist(agentPos, m);
        if (d < nearestSafeDist) {
            nearestSafeDist = d;
            nearestSafeDir = getDir(agentPos, m);
        }
    });

    let nearestDangerDist = 999;
    let nearestDangerDir = 0;
    INITIAL_DANGER_MARKERS.forEach(m => {
        const d = getDist(agentPos, m);
        if (d < nearestDangerDist) {
            nearestDangerDist = d;
            nearestDangerDir = getDir(agentPos, m);
        }
    });

    return {
        food_dist: fDist,
        food_dir: getDir(agentPos, foodPos),
        hazard_dist: hDist,
        hazard_dir: getDir(agentPos, hazardPos),
        safe_marker_dist: nearestSafeDist,
        safe_dir: nearestSafeDir,
        danger_marker_dist: nearestDangerDist,
        danger_dir: nearestDangerDir,
        home_marker_dist: 20, // Far away
        home_dir: Direction.North
    };
  };

  // --- Simulation Step ---
  const tick = useCallback(() => {
    const agent = agentRef.current;
    
    // 1. Sync Vitality
    agent.vitality.energy = energy;

    // 2. Percieve
    const envData = getEnvData();

    // 3. Calculate Salience (Visual only update)
    const scores = agent.calculate_salience(envData);
    setSalienceScores(scores);

    // 4. Decide
    const actionDir = agent.decide_action(envData);
    setActiveHypothesis(agent.active_hypothesis_key);

    // 5. Act (Calculate new Pos)
    let newX = agentPos.x;
    let newY = agentPos.y;
    if (actionDir === Direction.North) newY = Math.max(0, agentPos.y - 1);
    if (actionDir === Direction.South) newY = Math.min(GRID_SIZE - 1, agentPos.y + 1);
    if (actionDir === Direction.East) newX = Math.min(GRID_SIZE - 1, agentPos.x + 1);
    if (actionDir === Direction.West) newX = Math.max(0, agentPos.x - 1);

    const newPos = { x: newX, y: newY };

    // 6. Calculate Consequence (Delta)
    let energyDelta = -METABOLISM_COST;
    let logMsg = "";

    // Food collision
    if (newPos.x === foodPos.x && newPos.y === foodPos.y) {
        energyDelta += FOOD_VALUE;
        logMsg = "Consumed FOOD (+30)";
        // Respawn food
        setFoodPos({ x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) });
    }

    // Hazard collision
    if (newPos.x === hazardPos.x && newPos.y === hazardPos.y) {
        energyDelta -= HAZARD_DAMAGE;
        logMsg = "Hit HAZARD (-20)";
        // Move hazard slightly
        setHazardPos(prev => ({...prev, x: Math.min(GRID_SIZE-1, prev.x+1)}));
    }

    // Marker "interaction" check for Verification logic
    // Note: The Python logic for SAFE_MARKER_TOWARD verifies on outcome_delta >= 0.
    // Simply walking consumes energy (-1), so it would fail unless we find food OR we treat standard movement cost as baseline 0 in verification.
    // However, strictly following the code: outcome_delta >= 0 means strictly non-negative.
    // So, walking on a safe path WITHOUT food actually reduces confidence slowly because delta is -1.
    // This is actually correct behavior: "This path promised safety/food, but I'm just losing energy!"
    // UNLESS the agent finds food, then delta is +29.
    
    if (logMsg) addLog(logMsg);

    // 7. Verify Hypothesis
    agent.verify_hypothesis(energyDelta);

    // 8. Update State
    setAgentPos(newPos);
    setEnergy(prev => Math.max(0, Math.min(100, prev + energyDelta)));
    setTickCount(t => t + 1);

    // 9. Update Belief UI
    const beliefList: BeliefData[] = [];
    agent.belief_engine.beliefs.forEach((b, k) => {
        beliefList.push({
            key: k,
            description: b.description,
            confidence: b.confidence,
            samples: b.samples,
            successes: b.successes
        });
    });
    setBeliefs(beliefList);

  }, [agentPos, energy, foodPos, hazardPos]);

  // --- Effects ---
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
        interval = setInterval(tick, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, tick]);

  // Initial Belief Load
  useEffect(() => {
      // Force initial render of beliefs
      const beliefList: BeliefData[] = [];
      agentRef.current.belief_engine.beliefs.forEach((b, k) => {
          beliefList.push({
              key: k,
              description: b.description,
              confidence: b.confidence,
              samples: b.samples,
              successes: b.successes
          });
      });
      setBeliefs(beliefList);
  }, []);

  // --- Handlers ---
  const handleReset = () => {
      setAgentPos(INITIAL_POS);
      setEnergy(50);
      setFoodPos(INITIAL_FOOD);
      setHazardPos(INITIAL_HAZARD);
      setTickCount(0);
      setIsPlaying(false);
      agentRef.current = new VervaekeAgent(); // Reset memory
      setLogs([]);
      // Reload beliefs
      const beliefList: BeliefData[] = [];
      agentRef.current.belief_engine.beliefs.forEach((b, k) => {
        beliefList.push({key: k, ...b} as any);
      });
      setBeliefs(beliefList);
  };

  return (
    <div className="min-h-screen bg-background text-slate-300 p-6 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Header & Controls */}
        <div className="lg:col-span-3 flex items-center justify-between bg-surface p-4 rounded-lg border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                    <Brain size={32} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Logos: Belief-Guided Agent</h1>
                    <p className="text-xs text-slate-400">v0.7.2 • Vervaeke Agent Simulation</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button onClick={() => setIsPlaying(!isPlaying)} className={`p-2 rounded transition-colors ${isPlaying ? 'bg-slate-700 text-yellow-400' : 'hover:bg-slate-800 text-primary'}`}>
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={handleReset} className="p-2 rounded hover:bg-slate-800 text-danger">
                        <RotateCcw size={20} />
                    </button>
                </div>
                <div className="flex flex-col w-32">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Sim Speed</label>
                    <input 
                        type="range" 
                        min="50" max="1000" step="50" 
                        value={1050 - speed} 
                        onChange={(e) => setSpeed(1050 - parseInt(e.target.value))}
                        className="h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>
            </div>
        </div>

        {/* Left Column: Visuals */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface rounded-xl border border-slate-700 p-1 shadow-2xl">
                <GridMap 
                    agentPos={agentPos} 
                    foodPos={foodPos} 
                    hazardPos={hazardPos} 
                    safeMarkers={INITIAL_SAFE_MARKERS} 
                    dangerMarkers={INITIAL_DANGER_MARKERS} 
                    homePos={{x: -1, y: -1}} // Hide home for simplicity
                    gridSize={GRID_SIZE} 
                    activeHypothesis={activeHypothesis}
                />
            </div>
            <SaliencePanel scores={salienceScores} />
        </div>

        {/* Middle Column: Stats & Beliefs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Vitality (Energy)</p>
                        <div className="text-2xl font-mono font-bold text-white flex items-center gap-2">
                            <Activity className={energy < 30 ? 'text-danger' : 'text-emerald-400'} size={20} />
                            {energy.toFixed(1)}
                        </div>
                    </div>
                    <div className="h-10 w-24 bg-slate-900 rounded-full overflow-hidden relative border border-slate-700">
                        <div 
                            className={`h-full transition-all duration-500 ${energy < 30 ? 'bg-danger' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, energy)}%` }} 
                        />
                    </div>
                </div>

                <div className="bg-surface p-4 rounded-lg border border-slate-700">
                     <p className="text-xs font-bold text-slate-500 uppercase">Active Hypothesis</p>
                     <div className="mt-1 h-8 flex items-center">
                        {activeHypothesis ? (
                            <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 rounded-full text-sm font-mono animate-pulse">
                                {activeHypothesis}
                            </span>
                        ) : (
                            <span className="text-slate-600 text-sm italic">None (Autopilot)</span>
                        )}
                     </div>
                </div>
            </div>

            {/* Belief Chart */}
            <BeliefChart beliefs={beliefs} />

            {/* Logs */}
            <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs overflow-hidden flex flex-col">
                <h3 className="text-slate-500 font-bold mb-2 uppercase border-b border-slate-800 pb-2">Activity Log</h3>
                <div className="flex-1 overflow-y-auto space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className="text-slate-400 border-l-2 border-slate-800 pl-2 py-0.5">
                            {log}
                        </div>
                    ))}
                    {logs.length === 0 && <span className="text-slate-700 italic">Simulation paused. Press Play.</span>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;

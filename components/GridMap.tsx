import React, { useMemo } from 'react';
import { Vector2 } from '../types';
import { Smile, Zap, Skull, AlertTriangle, MapPin, Home } from 'lucide-react';

interface Props {
  agentPos: Vector2;
  foodPos: Vector2;
  hazardPos: Vector2;
  safeMarkers: Vector2[];
  dangerMarkers: Vector2[];
  homePos: Vector2;
  gridSize: number;
  activeHypothesis: string | null;
}

export const GridMap: React.FC<Props> = ({
  agentPos, foodPos, hazardPos, safeMarkers, dangerMarkers, homePos, gridSize, activeHypothesis
}) => {
  
  // Render grid cells
  const cells = useMemo(() => {
    const grid = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const isAgent = x === agentPos.x && y === agentPos.y;
        const isFood = x === foodPos.x && y === foodPos.y;
        const isHazard = x === hazardPos.x && y === hazardPos.y;
        const isHome = x === homePos.x && y === homePos.y;
        const isSafeMarker = safeMarkers.some(p => p.x === x && p.y === y);
        const isDangerMarker = dangerMarkers.some(p => p.x === x && p.y === y);

        let content = null;
        let bgClass = "bg-slate-900";

        if (isHome) {
            content = <Home size={16} className="text-blue-400" />;
            bgClass = "bg-slate-800/50";
        }
        if (isSafeMarker) {
            content = <MapPin size={14} className="text-emerald-500/60" />;
        }
        if (isDangerMarker) {
            content = <MapPin size={14} className="text-rose-500/60" />;
        }
        if (isFood) {
            content = <Zap size={20} className="text-warning animate-pulse" />;
            bgClass = "bg-warning/10 ring-1 ring-warning/20";
        }
        if (isHazard) {
            content = <Skull size={20} className="text-danger" />;
            bgClass = "bg-danger/10 ring-1 ring-danger/20";
        }
        if (isAgent) {
            content = (
                <div className="relative">
                    <Smile size={24} className="text-white" strokeWidth={2.5} />
                    {activeHypothesis && (
                        <div className="absolute -top-6 -right-6 w-4 h-4">
                            <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></div>
                            <div className="relative inline-flex rounded-full h-4 w-4 bg-accent text-[8px] flex items-center justify-center text-white font-bold">?</div>
                        </div>
                    )}
                </div>
            );
            bgClass = "bg-primary/20 ring-2 ring-primary";
        }

        grid.push(
          <div
            key={`${x}-${y}`}
            className={`w-full h-full flex items-center justify-center border-[0.5px] border-slate-800/50 ${bgClass} transition-all duration-200`}
          >
            {content}
          </div>
        );
      }
    }
    return grid;
  }, [agentPos, foodPos, hazardPos, safeMarkers, dangerMarkers, homePos, gridSize, activeHypothesis]);

  return (
    <div className="aspect-square w-full max-w-[500px] mx-auto grid" style={{
      gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
    }}>
      {cells}
    </div>
  );
};

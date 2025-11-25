import React from 'react';
import { ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from 'lucide-react';

interface Props {
  scores: number[];
}

export const SaliencePanel: React.FC<Props> = ({ scores }) => {
  // Normalize scores for visualization alpha
  const maxScore = Math.max(...scores, 0.001);
  
  const renderDir = (label: string, idx: number, Icon: any) => {
    const score = scores[idx];
    const opacity = Math.max(0.2, Math.min(1, score / maxScore));
    const isMax = score === maxScore && score > 0;
    
    return (
        <div className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-300 ${isMax ? 'border-primary bg-primary/20 scale-110 shadow-lg shadow-primary/20' : 'border-slate-700 bg-slate-800'}`}>
            <Icon className={`mb-1 ${isMax ? 'text-white' : 'text-slate-400'}`} style={{ opacity }} />
            <span className="text-xs font-mono text-slate-300">{score.toFixed(2)}</span>
        </div>
    );
  };

  return (
    <div className="p-4 bg-surface rounded-lg border border-slate-700">
        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider text-center">Salience Landscape</h3>
        <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
            <div />
            {renderDir('N', 0, ArrowUp)}
            <div />
            {renderDir('W', 3, ArrowLeft)}
            <div className="flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-600" />
            </div>
            {renderDir('E', 1, ArrowRight)}
            <div />
            {renderDir('S', 2, ArrowDown)}
            <div />
        </div>
    </div>
  );
};

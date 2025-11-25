import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { BeliefData } from '../types';

interface Props {
  beliefs: BeliefData[];
}

export const BeliefChart: React.FC<Props> = ({ beliefs }) => {
  // Sort beliefs for consistent display
  const sortedBeliefs = [...beliefs].sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="h-64 w-full bg-surface rounded-lg p-4 border border-slate-700 shadow-lg">
        <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Belief Confidence (Bayesian)</h3>
        <ResponsiveContainer width="100%" height="100%">
        <BarChart
            data={sortedBeliefs}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" domain={[0, 1]} stroke="#94a3b8" fontSize={12} />
            <YAxis 
                type="category" 
                dataKey="key" 
                width={150} 
                stroke="#e2e8f0" 
                fontSize={10} 
                tickFormatter={(val) => val.replace(/_/g, ' ')}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                cursor={{fill: '#334155', opacity: 0.4}}
                formatter={(value: number) => [value.toFixed(3), 'Confidence']}
            />
            <ReferenceLine x={0.5} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar dataKey="confidence" radius={[0, 4, 4, 0]} barSize={20}>
                {sortedBeliefs.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.confidence > 0.5 ? '#10b981' : '#ef4444'} />
                ))}
            </Bar>
        </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

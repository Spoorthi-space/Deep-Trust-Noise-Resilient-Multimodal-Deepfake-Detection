import React from 'react';
import { Progress } from '@/components/ui/progress';

const ConfidenceGauge = ({ value }) => {
  const getColor = (val) => {
    if (val >= 80) return 'bg-green-600';
    if (val >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-2">
      <Progress value={value} className="h-3" indicatorClassName={getColor(value)} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
};

export default ConfidenceGauge;
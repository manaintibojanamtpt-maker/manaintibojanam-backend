import React from 'react';
import { Clock, Lightbulb } from 'lucide-react';
import type { StoreSetupStepDefinition } from '../../config/storeSetupSteps';

interface SetupStepInstructionsProps {
  step: StoreSetupStepDefinition;
}

export const SetupStepInstructions: React.FC<SetupStepInstructionsProps> = ({ step }) => (
  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
    <p className="text-sm text-orange-100/90 leading-relaxed">{step.instruction}</p>
    {step.tip && (
      <p className="text-xs text-white/45 flex items-start gap-2">
        <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
        {step.tip}
      </p>
    )}
    <p className="text-[11px] text-white/30 flex items-center gap-1.5">
      <Clock size={12} />
      About {step.estimatedMinutes} min
    </p>
  </div>
);

export default SetupStepInstructions;

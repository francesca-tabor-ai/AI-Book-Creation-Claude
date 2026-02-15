
import React from 'react';
import { CreationStep } from '../types';

interface ProgressBarProps {
  currentStep: CreationStep;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const steps = [
    { name: 'Setup', icon: 'fa-sliders' },
    { name: 'Expansion', icon: 'fa-wand-sparkles' },
    { name: 'Concept', icon: 'fa-lightbulb' },
    { name: 'Structure', icon: 'fa-diagram-project' },
    { name: 'Manuscript', icon: 'fa-feather-pointed' },
    { name: 'Identity', icon: 'fa-clapperboard' },
    { name: 'Finalize', icon: 'fa-circle-check' },
  ];

  return (
    <div className="w-full bg-white border-b border-slate-100 pt-8 pb-4">
      <div className="flex items-center justify-between max-w-5xl mx-auto px-6">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          
          return (
            <div key={idx} className="flex flex-col items-center flex-1 group">
              <div className="flex items-center w-full relative">
                {/* Connection Line */}
                {idx > 0 && (
                  <div className={`absolute left-[-50%] right-[50%] top-4 h-[1px] transition-colors duration-500 ${
                    idx <= currentStep ? 'bg-indigo-500' : 'bg-slate-100'
                  }`}></div>
                )}
                
                {/* Icon Circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 mx-auto transition-all duration-300 border ${
                  isActive 
                    ? 'signature-gradient text-white border-transparent scale-110 shadow-lg' 
                    : isCompleted 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                      : 'bg-white text-slate-300 border-slate-100'
                }`}>
                  <i className={`fas ${step.icon} text-[10px]`}></i>
                </div>
              </div>
              
              <span className={`text-[10px] mt-3 font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
                isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-500' : 'text-slate-300'
              }`}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;

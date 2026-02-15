
import React from 'react';
import { User, SubscriptionTier } from '../types';

interface BillingDashboardProps {
  user: User;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
}

const BillingDashboard: React.FC<BillingDashboardProps> = ({ user, onClose, onUpgrade }) => {
  const tiers: { name: SubscriptionTier; price: string; tokens: string; features: string[] }[] = [
    { name: 'Free', price: '£0', tokens: '50K', features: ['Single project', 'Standard speed', 'Community support'] },
    { name: 'Creator', price: '£29', tokens: '1M', features: ['Unlimited projects', 'Pro models', 'Priority queue', 'Export formats'] },
    { name: 'Pro Author', price: '£79', tokens: '5M', features: ['Custom style locking', 'Manuscript versioning', 'Team collaboration'] },
    { name: 'Studio', price: '£199', tokens: '20M', features: ['API Access', 'Custom fine-tuning', 'Dedicated account manager'] },
  ];

  const usagePercent = Math.min(100, (user.usage.tokensThisMonth / user.usage.tokenLimit) * 100);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col lg:flex-row overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors z-20"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        {/* Sidebar / Current Usage */}
        <div className="lg:w-80 bg-slate-50 border-r border-slate-100 p-10 flex flex-col">
          <div className="mb-12">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Current Plan</span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{user.tier}</h2>
          </div>

          <div className="space-y-8 flex-1">
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Token Quota</span>
                <span className="text-xs font-bold text-slate-900">{Math.round(user.usage.tokensThisMonth / 1000)}K / {user.usage.tokenLimit / 1000000}M</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full signature-gradient transition-all duration-1000" 
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Resets on March 1st, 2026</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Estimated Value</span>
              <p className="text-xl font-bold text-slate-900">£{((user.usage.tokensThisMonth / 100000) * 0.8).toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Based on platform average costs</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200">
            <button className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
              <i className="fas fa-receipt text-indigo-400"></i>
              Manage Payments
            </button>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="flex-1 p-10">
          <div className="mb-10">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">Upgrade Studio Capacity</h3>
            <p className="text-sm text-slate-400 mt-1">Scale your manuscript production with high-fidelity generation tiers.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {tiers.map((tier) => (
              <div 
                key={tier.name}
                className={`p-6 rounded-[2rem] border transition-all flex flex-col ${
                  user.tier === tier.name 
                    ? 'border-indigo-500 bg-indigo-50/30' 
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{tier.name}</h4>
                    <span className="text-2xl font-bold tracking-tight">{tier.price}<span className="text-sm font-medium text-slate-400">/mo</span></span>
                  </div>
                  <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                    {tier.tokens} Tokens
                  </span>
                </div>
                
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-center gap-2">
                      <i className="fas fa-check text-indigo-500 text-[8px]"></i>
                      {f}
                    </li>
                  ))}
                </ul>

                <button 
                  disabled={user.tier === tier.name}
                  onClick={() => onUpgrade(tier.name)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    user.tier === tier.name 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'signature-gradient text-white shadow-lg shadow-indigo-100 hover:scale-[1.02]'
                  }`}
                >
                  {user.tier === tier.name ? 'Active Plan' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;

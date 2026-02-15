
import React, { useEffect, useState } from 'react';
import { InfoPageType } from '../types';

interface InfoPageProps {
  page: InfoPageType;
  onBack: () => void;
}

const InfoPage: React.FC<InfoPageProps> = ({ page, onBack }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [page]);

  const renderContent = () => {
    switch (page) {
      case 'enterprise':
        return (
          <div className="space-y-16">
            <header className="space-y-6 max-w-3xl">
              <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100">B2B Solutions</span>
              <h1 className="text-6xl font-bold tracking-tight serif leading-tight text-slate-900">Enterprise Scale Content Architecture</h1>
              <p className="text-xl text-slate-500 leading-relaxed">Dedicated infrastructure for publishing houses, academic institutions, and global content studios.</p>
            </header>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Content Studio', price: 'POA', icon: 'fa-building-columns', features: ['Custom Style Locking', 'Bulk Manuscript Export', 'API Whitelabeling'] },
                { title: 'Academic Hub', price: 'POA', icon: 'fa-graduation-cap', features: ['Fact-Checking Engine', 'Shared Research Repos', 'Faculty Admin Controls'] },
                { title: 'Publishing House', price: 'POA', icon: 'fa-newspaper', features: ['Multi-Tenant Rights', 'Automated EPUB/PDF', 'Custom Model Training'] }
              ].map((tier, i) => (
                <div key={i} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl text-indigo-500 mb-8 group-hover:signature-gradient group-hover:text-white transition-all">
                    <i className={`fas ${tier.icon}`}></i>
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-slate-900">{tier.title}</h3>
                  <div className="text-sm font-bold text-indigo-600 mb-8">{tier.price}</div>
                  <ul className="space-y-4 mb-10">
                    {tier.features.map((f, j) => (
                      <li key={j} className="text-sm text-slate-500 flex items-center gap-3">
                        <i className="fas fa-check text-indigo-400 text-[10px]"></i> {f}
                      </li>
                    ))}
                  </ul>
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-colors shadow-lg">Request Consultation</button>
                </div>
              ))}
            </div>

            <section className="bg-slate-950 text-white p-16 rounded-[4rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full group-hover:scale-150 transition-transform duration-[3000ms]"></div>
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl font-bold mb-8 serif">Security & Governance</h2>
                <p className="text-lg text-slate-400 leading-relaxed mb-10">All enterprise-tier data resides in isolated VPCs. We provide full manuscript sovereignty—your content is never used to train global LLMs.</p>
                <div className="flex flex-wrap gap-4">
                  <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/50">SOC2 Type II</div>
                  <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/50">GDPR Compliant</div>
                  <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/50">ISO 27001</div>
                </div>
              </div>
            </section>
          </div>
        );
      case 'api':
        return (
          <div className="space-y-16">
            <header className="space-y-6 max-w-3xl">
              <span className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100">For Developers</span>
              <h1 className="text-6xl font-bold tracking-tight serif leading-tight text-slate-900">Unified Publishing API</h1>
              <p className="text-xl text-slate-500 leading-relaxed">Power your applications with the world's most advanced book orchestration engine.</p>
            </header>

            <div className="bg-slate-950 p-1 rounded-[3rem] shadow-2xl relative">
              <div className="absolute top-8 right-8 flex gap-3 z-20">
                 <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
              </div>
              <div className="bg-slate-900/50 rounded-[2.8rem] p-12 overflow-x-auto">
                <pre className="text-indigo-300 font-mono text-sm leading-relaxed">
{`// Initialize Book Orchestration
const project = await studio.projects.create({
  keyword: "The Quantum Frontier",
  style: "academic-accessible",
  output_format: "epub"
});

// Chain synthesis steps
await project.expand();
await project.structure();
const manuscript = await project.draft({
  chapter_id: "chap_01",
  thinking_budget: 4000
});`}
                </pre>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
               <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-2xl font-bold mb-4">RESTful Architecture</h3>
                  <p className="text-slate-600 leading-relaxed">Our API follows clean REST principles, providing predictable resource-oriented URLs and standard HTTP codes.</p>
               </div>
               <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-2xl font-bold mb-4">Webhooks & Real-time</h3>
                  <p className="text-slate-600 leading-relaxed">Subscribe to events like synthesis completion, cover rendering, and quota alerts via secure webhooks.</p>
               </div>
            </div>
          </div>
        );
      case 'metering':
        return (
          <div className="space-y-16">
            <header className="space-y-6 max-w-3xl">
              <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">Efficiency Tracking</span>
              <h1 className="text-6xl font-bold tracking-tight serif leading-tight text-slate-900">Intelligent Metering</h1>
              <p className="text-xl text-slate-500 leading-relaxed">Granular visibility into every token consumed by the orchestration engine.</p>
            </header>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-10 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-xl font-bold">Standard Stage Weighting</h3>
                <p className="text-sm text-slate-400 mt-1">Estimates based on typical 40K word manuscript.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">Prompt Module</th>
                      <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">Model Depth</th>
                      <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">Avg. Token Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[
                      { module: 'Topic Expansion', model: 'Flash 3.0', tokens: '~5,000' },
                      { module: 'Positioning Engine', model: 'Flash 3.0', tokens: '~10,000' },
                      { module: 'TOC Synthesis', model: 'Pro 3.0', tokens: '~11,000' },
                      { module: 'Chapter Narrative', model: 'Pro 3.0 (Thinking)', tokens: '45,000 - 65,000' },
                      { module: 'Visual Identity', model: 'Flash 3.0', tokens: '~7,000' }
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-8 font-bold text-slate-900">{row.module}</td>
                        <td className="p-8 text-slate-500 text-sm">{row.model}</td>
                        <td className="p-8 font-mono text-indigo-600 text-sm">{row.tokens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-indigo-50 p-12 rounded-[3rem] border border-indigo-100">
               <h3 className="text-2xl font-bold text-slate-900 mb-4">Daily Consumption Guardrails</h3>
               <p className="text-slate-600 leading-relaxed">Protect your account from runaway costs. Users can set hard and soft ceilings in the billing dashboard, triggering automated synthesis pauses when thresholds are met.</p>
            </div>
          </div>
        );
      case 'billing':
        return (
          <div className="space-y-16">
            <header className="space-y-6 max-w-3xl">
              <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-200">Financial Transparency</span>
              <h1 className="text-6xl font-bold tracking-tight serif leading-tight text-slate-900">Billing Protocols</h1>
              <p className="text-xl text-slate-500 leading-relaxed">Automated cycles, fair proration, and clear overage logic.</p>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
               <div className="p-12 bg-white border border-slate-100 rounded-[3rem] space-y-4">
                  <h3 className="text-2xl font-bold">Subscription Terms</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">Monthly plans are billed in advance. Annual plans offer a 20% discount and are non-refundable after the 14-day grace period. Upgrades mid-cycle are prorated immediately.</p>
               </div>
               <div className="p-12 bg-white border border-slate-100 rounded-[3rem] space-y-4">
                  <h3 className="text-2xl font-bold">Token Overages</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">Beyond your tier's included allowance, tokens are billed in arrears at £0.80 per 100K units. Overages are compiled and billed on the first of each month.</p>
               </div>
               <div className="p-12 bg-white border border-slate-100 rounded-[3rem] space-y-4">
                  <h3 className="text-2xl font-bold">Refund Policy</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">Due to the variable cost of GPU compute and API token load, we do not offer refunds on consumed credits. Platform fees can be refunded if zero synthesis actions have occurred within 7 days.</p>
               </div>
               <div className="p-12 bg-slate-50 border border-slate-100 rounded-[3rem] flex flex-col justify-center items-center text-center">
                  <i className="fas fa-file-invoice-dollar text-3xl text-slate-300 mb-4"></i>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Connect with Stripe for invoicing</p>
               </div>
            </div>
          </div>
        );
      case 'rights':
        return (
          <div className="space-y-16">
            <header className="space-y-6 max-w-3xl">
              <span className="bg-yellow-50 text-yellow-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-yellow-100">IP Ownership</span>
              <h1 className="text-6xl font-bold tracking-tight serif leading-tight text-slate-900">Your Intellectual Sovereignty</h1>
              <p className="text-xl text-slate-500 leading-relaxed">BookStudio acts as an orchestrator for your ideas. You retain 100% of the value you create.</p>
            </header>

            <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-xl border-t-8 border-t-indigo-600">
               <div className="max-w-3xl">
                  <h2 className="text-3xl font-bold mb-8 serif text-slate-900">Ownership Clauses</h2>
                  <div className="space-y-10">
                     <div className="flex gap-6">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                        <div>
                           <h4 className="text-xl font-bold mb-2">Full Copyright Transfer</h4>
                           <p className="text-slate-600 leading-relaxed">Upon generation, all intellectual property rights for the manuscript, chapter outlines, and cover prompts transfer immediately and irrevocably to the user.</p>
                        </div>
                     </div>
                     <div className="flex gap-6">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                        <div>
                           <h4 className="text-xl font-bold mb-2">Zero Royalty Claim</h4>
                           <p className="text-slate-600 leading-relaxed">BookStudio (or its parent entity) holds no claim to future revenues, licensing deals, or commercial royalties derived from works created on the platform.</p>
                        </div>
                     </div>
                     <div className="flex gap-6">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                        <div>
                           <h4 className="text-xl font-bold mb-2">Attribution-Free Publishing</h4>
                           <p className="text-slate-600 leading-relaxed">Users are not required to attribute the work to BookStudio. You may list yourself as the sole author or use a pseudonym of your choosing.</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-16">
            <header className="space-y-6 max-w-3xl">
              <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-100">Data Protection</span>
              <h1 className="text-6xl font-bold tracking-tight serif leading-tight text-slate-900">Privacy & GDPR Integrity</h1>
              <p className="text-xl text-slate-500 leading-relaxed">Your research and manuscripts are treated with the highest security protocols.</p>
            </header>

            <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-sm prose prose-slate max-w-none">
              <h3 className="serif text-3xl font-bold text-slate-900">1. Data Storage & Encryption</h3>
              <p className="text-slate-600 leading-relaxed">All manuscripts and project data are encrypted at rest using AES-256 and in transit via TLS 1.3. Your content is stored in regional data centers as per your preference (US/EU/UK).</p>
              
              <h3 className="serif text-3xl font-bold text-slate-900 mt-12">2. No Model Training</h3>
              <p className="text-slate-600 leading-relaxed">Your intellectual assets are never fed back into public model training loops. The intelligence used for your project is isolated to your session context.</p>

              <h3 className="serif text-3xl font-bold text-slate-900 mt-12">3. Your GDPR Rights</h3>
              <ul className="text-slate-600 space-y-4">
                <li><strong>Right to Erasure:</strong> Account deletion purges all project data from our primary clusters within 30 days.</li>
                <li><strong>Portability:</strong> Export your full project history in Markdown or JSON format at any time.</li>
                <li><strong>Auditability:</strong> Request a full processing log of your data usage.</li>
              </ul>

              <div className="mt-16 p-8 bg-slate-950 rounded-[2rem] text-white flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xl mb-1">DPO Contact</h4>
                  <p className="text-slate-400 text-sm">privacy@bookstudio.ai</p>
                </div>
                <button className="px-8 py-3 bg-white text-slate-950 rounded-xl font-bold text-sm">Request Audit</button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-white transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <nav className="h-20 border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-[0.2em] transition-all group"
        >
          <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
          Back to Studio
        </button>
        <div className="flex items-center gap-2">
          <div className="signature-gradient w-8 h-8 rounded-lg flex items-center justify-center text-white">
            <i className="fas fa-book text-xs"></i>
          </div>
          <span className="font-bold tracking-tight text-slate-900">BookStudio <span className="text-slate-300 font-medium">Docs</span></span>
        </div>
        <div className="w-24"></div>
      </nav>

      <main className="max-w-6xl mx-auto px-10 py-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {renderContent()}
      </main>

      <footer className="py-24 border-t border-slate-50 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-10 flex flex-col items-center gap-8">
          <div className="signature-gradient w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <i className="fas fa-book-open"></i>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">AI Book Creation Studio v1.0</p>
          <p className="text-slate-300 text-[10px]">Secure Intellectual Asset Management — Built for Authors, Experts, and Teams.</p>
        </div>
      </footer>
    </div>
  );
};

export default InfoPage;

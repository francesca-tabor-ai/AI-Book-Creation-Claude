
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { CreationStep, BookProject, BookConcept, Chapter, User, SubscriptionTier, TOKEN_ESTIMATES, AppView, InfoPageType, CoverStyle } from './types';
import ProgressBar from './components/ProgressBar';
import AuthOverlay from './components/AuthOverlay';
import BillingDashboard from './components/BillingDashboard';
import { supabase } from './lib/supabase';
import { getCurrentAppUser, signOut } from './services/authService';
import * as AI from './services/aiService';
import * as DB from './services/database';

// Lazy loading the info page for better initial performance
const InfoPage = lazy(() => import('./components/InfoPage'));

interface SavedProjectEntry {
  project: BookProject;
  concepts: BookConcept[];
  step: CreationStep;
  lastSaved: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [view, setView] = useState<AppView>('editor');
  const [infoPage, setInfoPage] = useState<InfoPageType>('enterprise');
  const [isNavigating, setIsNavigating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [step, setStep] = useState<CreationStep>(CreationStep.SETUP);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [project, setProject] = useState<BookProject>({
    id: crypto.randomUUID(),
    keyword: '',
    description: '',
    genre: 'Non-Fiction',
    audience: 'Professional Leaders',
    style: 'Formal',
    coverStyle: 'Minimalist',
    wordCountGoal: 30000,
    manuscript: {},
    chapterWordCounts: {}
  });

  const [concepts, setConcepts] = useState<BookConcept[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProjectEntry[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  // Supabase auth state management
  useEffect(() => {
    let cancelled = false;

    // Safety timeout — if auth never resolves, show the login screen
    const timeout = setTimeout(() => {
      if (!cancelled) setAuthLoading(false);
    }, 5000);

    // Use onAuthStateChange as the single source of truth
    // It fires INITIAL_SESSION on setup, then SIGNED_IN/SIGNED_OUT on changes
    // Initialize auth: get session first, then listen for changes
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          const appUser = await getCurrentAppUser(session.user);
          if (!cancelled) {
            setUser(appUser);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
          clearTimeout(timeout);
        }
      }
    };
    initAuth();

    // Listen for subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return;
        if (event === 'SIGNED_IN') {
          const authUser = session?.user;
          if (authUser) {
            setTimeout(async () => {
              if (cancelled) return;
              try {
                const appUser = await getCurrentAppUser(authUser);
                if (!cancelled) setUser(appUser);
              } catch (err) {
                console.error('Failed to load user profile:', err);
              }
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Load saved projects from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    loadSavedProjects();
  }, [user?.id]);

  const loadSavedProjects = async () => {
    if (!user) return;
    try {
      const dbProjects = await DB.getUserProjects(user.id);
      console.log('[DEBUG] dbProjects raw:', JSON.stringify(dbProjects?.map(p => ({
        id: p.id, title: p.title, current_step: p.current_step,
        book_concepts: p.book_concepts,
      }))));
      if (dbProjects) {
        const entries: SavedProjectEntry[] = dbProjects.map(p => {
          const bookConcept = (p.book_concepts as Record<string, unknown>[])?.[0];
          const conceptsJson = (bookConcept?.concepts_json ?? []) as BookConcept[];
          console.log('[DEBUG] project', p.title, 'bookConcept:', JSON.stringify(bookConcept), 'conceptsJson:', JSON.stringify(conceptsJson));
          return {
            project: DB.dbToBookProject(p as NonNullable<typeof p>),
            concepts: Array.isArray(conceptsJson) ? conceptsJson : [],
            step: p.current_step as CreationStep,
            lastSaved: p.updated_at,
          };
        });
        setSavedProjects(entries);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  // Scroll to top on step or view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, view]);

  const refreshUserUsage = async () => {
    if (!user) return;
    try {
      const usage = await DB.refreshUserUsage(user.id);
      if (usage) {
        setUser(prev => prev ? {
          ...prev,
          tier: usage.subscription_tier as SubscriptionTier,
          usage: {
            tokensUsed: usage.tokens_used,
            tokenLimit: usage.token_limit,
            tokensThisMonth: usage.tokens_this_month,
            projectCount: usage.project_count,
          }
        } : null);
      }
    } catch (e) {
      console.error('Failed to refresh usage:', e);
    }
  };

  const handleSaveProject = async () => {
    if (!project.dbId) return;
    setSaveStatus('saving');
    try {
      await DB.saveProjectStep(project.dbId, step);
      await loadSavedProjects();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('idle');
    }
  };

  const handleLoadProject = (entry: SavedProjectEntry) => {
    console.log('[DEBUG] handleLoadProject entry.concepts:', JSON.stringify(entry.concepts), 'step:', entry.step);
    setProject(entry.project);
    setConcepts(entry.concepts);
    setStep(entry.step);
    if (entry.project.outline && entry.project.outline.length > 0) {
      setActiveChapterId(entry.project.outline[0].id);
    }
  };

  const handleDeleteSavedProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await DB.softDeleteProject(id);
      setSavedProjects(prev => prev.filter(p => p.project.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setShowAccountSettings(false);
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!user) return;
    try {
      await DB.updateUserTier(user.id, tier);
      await refreshUserUsage();
      setShowBilling(false);
    } catch (e) {
      console.error('Upgrade failed:', e);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action is irreversible.')) {
      handleLogout();
    }
  };

  const navigateToInfo = (page: InfoPageType) => {
    setIsNavigating(true);
    setTimeout(() => {
      setInfoPage(page);
      setView('info');
      setIsNavigating(false);
    }, 400);
  };

  const returnToEditor = () => {
    setIsNavigating(true);
    setTimeout(() => {
      setView('editor');
      setIsNavigating(false);
    }, 400);
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleStartBrainstorm = async () => {
    if (!user) return;
    setLoadingStep('Synthesizing Intellectual Foundation...');
    try {
      // Create project in DB first
      const dbId = await DB.createProject(user.id, project);
      const updatedProject = { ...project, dbId, id: dbId };
      setProject(updatedProject);

      // Call Edge Function for brainstorming
      const data = await AI.brainstormTopic(dbId);
      setProject(p => ({ ...p, brainstormData: data }));
      await refreshUserUsage();
      nextStep();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Project failed to initialize.';
      alert(message);
      console.error(e);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleGenerateConcepts = async () => {
    if (!project.dbId) return;
    setLoadingStep('Generating Market Positioning Concepts...');
    try {
      const results = await AI.generateConcepts(project.dbId);
      // Ensure results is an array (Edge Function may return wrapped object)
      const conceptsArray = Array.isArray(results) ? results : (results as Record<string, unknown>)?.concepts as BookConcept[] ?? [];
      setConcepts(conceptsArray);
      await refreshUserUsage();
      nextStep();
    } catch (e) {
      console.error(e);
      alert('Failed to generate concepts. Please try again.');
    } finally {
      setLoadingStep(null);
    }
  };

  const handleSelectConcept = async (concept: BookConcept) => {
    if (!project.dbId) return;
    setLoadingStep('Architecting Manuscript Structure...');
    try {
      const conceptIndex = concepts.indexOf(concept);
      const toc = await AI.generateTOC(project.dbId, conceptIndex >= 0 ? conceptIndex : 0);

      const wordCounts: Record<string, number> = {};
      toc.forEach(chap => { wordCounts[chap.id] = 2000; });

      setProject(p => ({
        ...p,
        selectedConcept: concept,
        outline: toc,
        chapterWordCounts: wordCounts
      }));
      await refreshUserUsage();
      nextStep();
    } catch (e) {
      console.error(e);
      alert('Failed to generate table of contents. Please try again.');
    } finally {
      setLoadingStep(null);
    }
  };

  const handleGenerateChapter = async (chapter: Chapter) => {
    setLoadingStep(`Drafting: ${chapter.title}...`);
    try {
      const { content } = await AI.generateChapterContent(chapter.id);
      setProject(p => ({
        ...p,
        manuscript: { ...p.manuscript, [chapter.id]: content }
      }));
      await refreshUserUsage();
      setActiveChapterId(chapter.id);
    } catch (e) {
      console.error(e);
      alert("Failed to synthesize chapter content. Ensure you have sufficient token reserves.");
    } finally {
      setLoadingStep(null);
    }
  };

  const handleGenerateCover = async () => {
    if (!project.dbId) return;
    setLoadingStep('Generating Visual Identity...');
    try {
      const { imageUrl, prompt } = await AI.generateCover(project.dbId);
      setProject(p => ({ ...p, coverPrompt: prompt, coverImage: imageUrl }));
      await refreshUserUsage();
    } catch (e) {
      console.error(e);
      alert("Failed to generate cover identity. Please retry.");
    } finally {
      setLoadingStep(null);
    }
  };

  const handleStyleSelect = (style: CoverStyle) => {
    setProject(prev => ({ ...prev, coverStyle: style }));
    // Update style in DB if project exists
    if (project.dbId) {
      DB.updateProject(project.dbId, { cover_style: style }).catch(console.error);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
        <div className="signature-gradient w-12 h-12 rounded-[1.5rem] animate-spin shadow-xl mb-6"></div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initializing Studio</p>
      </div>
    );
  }

  if (!user) {
    return <AuthOverlay />;
  }

  if (isNavigating) {
    return (
      <div className="fixed inset-0 bg-white z-[300] flex flex-col items-center justify-center animate-out fade-out duration-300">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Routing Studio</p>
      </div>
    );
  }

  if (view === 'info') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <InfoPage page={infoPage} onBack={returnToEditor} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-100 relative animate-in fade-in duration-700 bg-[#fcfcfd]">
      {showBilling && (
        <BillingDashboard
          user={user}
          onClose={() => setShowBilling(false)}
          onUpgrade={handleUpgrade}
        />
      )}

      {showAccountSettings && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 overflow-hidden relative">
            <button
              onClick={() => setShowAccountSettings(false)}
              className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 serif">Studio Profile</h2>
              <p className="text-sm text-slate-400 mt-2 font-medium">Manage your creative identity and protocols.</p>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-8 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-2 border-white shadow-lg" />
                ) : (
                  <div className="signature-gradient w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {user.name?.charAt(0) || user.email.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Active Credentials</p>
                  <p className="text-xl font-bold text-slate-900 truncate max-w-[200px]">{user.name || user.email}</p>
                  <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{user.email}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-bold uppercase tracking-widest">{user.tier} Tier</span>
                    <button onClick={() => { setShowBilling(true); setShowAccountSettings(false); }} className="text-[9px] font-bold text-slate-400 underline hover:text-indigo-600 uppercase tracking-widest transition-colors">Adjust Plan</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="p-5 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex flex-col items-center gap-3 group">
                  <i className="fas fa-key text-indigo-400 text-sm group-hover:scale-110 transition-transform"></i>
                  Update Password
                </button>
                <button className="p-5 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex flex-col items-center gap-3 group">
                  <i className="fas fa-envelope text-indigo-400 text-sm group-hover:scale-110 transition-transform"></i>
                  Change Email
                </button>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col gap-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-black transition-all"
                >
                  Terminate Session
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-4 text-red-500 hover:bg-red-50 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all"
                >
                  Purge Data & Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.reload()}>
          <div className="signature-gradient w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
            <i className="fas fa-book text-xs"></i>
          </div>
          <span className="font-bold tracking-tight text-slate-900">BookStudio <span className="text-slate-400 font-medium">1.0</span></span>
        </div>

        <div className="flex items-center gap-6">
          {project.dbId && (
            <button
              onClick={handleSaveProject}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                saveStatus === 'saved' ? 'bg-green-50 text-green-600' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {saveStatus === 'saving' ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : saveStatus === 'saved' ? (
                <i className="fas fa-check"></i>
              ) : (
                <i className="fas fa-save"></i>
              )}
              <span>{saveStatus === 'saved' ? 'Saved' : 'Save State'}</span>
            </button>
          )}

          <div className="h-6 w-[1px] bg-slate-100"></div>

          <button
            onClick={() => setShowBilling(true)}
            className="hidden md:flex flex-col items-end gap-1 hover:bg-slate-50 px-3 py-1 rounded-lg transition-all"
          >
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Token Reserve</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full signature-gradient transition-all duration-1000"
                  style={{ width: `${Math.min((user.usage.tokensThisMonth / user.usage.tokenLimit) * 100, 100)}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-bold text-slate-900">{Math.round((user.usage.tokenLimit - user.usage.tokensThisMonth) / 1000)}K</span>
            </div>
          </button>

          <button
            onClick={() => navigateToInfo('enterprise')}
            className="flex items-center gap-2 text-indigo-500 hover:text-indigo-600 transition-colors p-2"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <i className="fas fa-info text-xs"></i>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Info</span>
          </button>

          <button
            onClick={() => setShowAccountSettings(true)}
            className="flex items-center gap-3 p-1 pr-4 bg-white border border-slate-100 rounded-full hover:bg-slate-50 hover:shadow-sm transition-all group"
          >
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-indigo-100 shadow-sm" />
            ) : (
              <div className="w-8 h-8 rounded-full signature-gradient flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-sm">
                {user.email.charAt(0)}
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
              {user.name?.split(' ')[0] || user.email.split('@')[0]}
            </span>
          </button>
        </div>
      </nav>

      <ProgressBar currentStep={step} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-16">
        {loadingStep && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="signature-gradient w-16 h-16 rounded-[2rem] animate-spin shadow-2xl mb-12"></div>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 text-center px-8 animate-pulse serif">{loadingStep}</h2>
            <p className="mt-4 text-slate-500 font-medium uppercase tracking-[0.3em] text-[10px]">Orchestrating Intellectual Assets</p>
          </div>
        )}

        {/* Step 0: Setup */}
        {step === CreationStep.SETUP && (
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 animate-in fade-in duration-1000">
            <div className="flex-1 max-w-2xl">
              <div className="mb-14">
                <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-6">Bring your expertise to life.</p>
                <h1 className="text-2xl font-medium tracking-tight mb-6 text-slate-500 leading-relaxed">Turn a single concept into a publishable manuscript using orchestrator models.</h1>
              </div>

              <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)] space-y-12">
                <div className="space-y-5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Primary Keyword / Theme</label>
                  <input
                    type="text"
                    className="w-full text-slate-900 bg-white border border-slate-100 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all"
                    placeholder="Enter main theme..."
                    value={project.keyword}
                    onChange={e => setProject({...project, keyword: e.target.value})}
                    autoFocus
                  />
                </div>

                <div className="space-y-5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Detailed Description / Vision</label>
                  <textarea
                    rows={6}
                    className="w-full text-slate-900 bg-white border border-slate-100 rounded-[1.5rem] p-5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all resize-none leading-relaxed"
                    placeholder="Describe your vision..."
                    value={project.description}
                    onChange={e => setProject({...project, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-10 py-4">
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Genre</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none bg-white border border-slate-100 rounded-xl p-4 pr-10 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                        value={project.genre}
                        onChange={e => setProject({...project, genre: e.target.value as BookProject['genre']})}
                      >
                        <option>Non-Fiction</option>
                        <option>Business</option>
                        <option>Self-Help</option>
                        <option>Academic</option>
                        <option>Fiction</option>
                      </select>
                      <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-xs"></i>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Writing Style</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none bg-white border border-slate-100 rounded-xl p-4 pr-10 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                        value={project.style}
                        onChange={e => setProject({...project, style: e.target.value as BookProject['style']})}
                      >
                        <option>Formal</option>
                        <option>Conversational</option>
                        <option>Academic</option>
                        <option>Inspirational</option>
                        <option>Technical</option>
                      </select>
                      <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-xs"></i>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Primary Audience</label>
                  <input
                    type="text"
                    className="w-full text-slate-900 bg-white border border-slate-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                    placeholder="E.g., Professional Leaders..."
                    value={project.audience}
                    onChange={e => setProject({...project, audience: e.target.value})}
                  />
                </div>

                <div className="flex flex-col items-center gap-6 pt-6">
                  <button
                    onClick={handleStartBrainstorm}
                    disabled={!project.keyword || !project.description}
                    className={`w-full py-6 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-4 ${
                      (project.keyword && project.description)
                        ? 'signature-gradient text-white shadow-2xl shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99]'
                        : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                    }`}
                  >
                    <span>Initialize Orchestration</span>
                    <i className="fas fa-chevron-right text-xs opacity-60"></i>
                  </button>
                </div>
              </div>
            </div>

            <aside className="lg:w-80 space-y-10 animate-in slide-in-from-right-8 duration-1000">
              <div className="flex items-center gap-3">
                <i className="fas fa-history text-indigo-400 text-sm"></i>
                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">Draft Repository</h3>
              </div>
              <div className="space-y-6">
                {savedProjects.length > 0 ? (
                  savedProjects.map((entry) => (
                    <div
                      key={entry.project.id}
                      onClick={() => handleLoadProject(entry)}
                      className="group bg-white p-7 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative"
                    >
                      <button
                        onClick={(e) => handleDeleteSavedProject(entry.project.id, e)}
                        className="absolute top-6 right-6 text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </button>
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                          {entry.project.genre}
                        </span>
                        <h4 className="font-bold text-slate-900 truncate text-lg serif">
                          {entry.project.selectedConcept?.title || entry.project.keyword || "Untitled Project"}
                        </h4>
                        <div className="flex items-center justify-between mt-5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                            Phase {entry.step + 1}
                          </span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                            {new Date(entry.lastSaved).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-16 border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-center bg-white shadow-sm hover:border-indigo-100 transition-colors group">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <i className="fas fa-folder-open text-slate-200 text-3xl"></i>
                    </div>
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">No previous orchestrations</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Step 1: Brainstorm */}
        {step === CreationStep.BRAINSTORM && project.brainstormData && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
            <div className="text-center">
              <span className="signature-text-gradient font-bold uppercase tracking-[0.2em] text-xs">Phase 1: Intellectual Expansion</span>
              <h2 className="text-4xl font-bold mt-4 tracking-tight serif">Structuring the Thesis</h2>
            </div>
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-500">
               <div className="flex items-start gap-8 mb-12">
                 <div className="signature-gradient w-16 h-16 rounded-3xl flex-shrink-0 flex items-center justify-center text-white text-2xl animate-pulse shadow-lg shadow-indigo-100">
                    <i className="fas fa-university"></i>
                 </div>
                 <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Core Manuscript Thesis</h3>
                    <p className="text-2xl font-medium leading-snug italic text-slate-800 italic serif">
                      "{project.brainstormData.thesis}"
                    </p>
                 </div>
               </div>
               <div className="grid md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600">Thematic Landscape</h4>
                    <div className="flex flex-wrap gap-3">
                      {project.brainstormData.topics.map((t, i) => (
                        <span key={i} className="bg-white px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-100 hover:shadow-sm transition-all cursor-default">
                          {t}
                        </span>
                      ))}
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-600">Foundation Questions</h4>
                    <ul className="space-y-4">
                      {project.brainstormData.researchQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-slate-500 font-medium flex gap-3 italic group">
                          <span className="text-indigo-300 font-bold group-hover:text-indigo-600 transition-colors">Q{i+1}.</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                 </div>
               </div>
            </div>
            <div className="flex justify-between items-center pt-8">
              <button onClick={prevStep} className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
                <i className="fas fa-arrow-left mr-2"></i> Reset
              </button>
              <div className="flex flex-col items-end gap-2">
                <button onClick={handleGenerateConcepts} className="px-10 py-4 signature-gradient text-white rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all active:scale-95">
                  Synthesize Concepts
                </button>
                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Est: {TOKEN_ESTIMATES.CONCEPT / 1000}K Tokens</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Concept Selection */}
        {step === CreationStep.CONCEPT && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
            <div className="text-center">
              <span className="signature-text-gradient font-bold uppercase tracking-[0.2em] text-xs">Phase 2: Narrative Positioning</span>
              <h2 className="text-4xl font-bold mt-4 tracking-tight serif">Select Your Book Concept</h2>
              <p className="text-slate-500 mt-4 max-w-xl mx-auto font-medium">We've synthesized 3 unique paths for your manuscript. Choose the one that resonates with your vision.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {concepts.map((concept, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectConcept(concept)}
                  className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex flex-col"
                >
                  <div className="mb-6 flex-1">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">{concept.targetMarket}</span>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight serif">{concept.title}</h3>
                    <p className="text-sm font-bold text-slate-400 mb-6 italic leading-relaxed">"{concept.tagline}"</p>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-6">{concept.description}</p>
                  </div>
                  <button className="w-full py-4 bg-slate-50 group-hover:signature-gradient group-hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-all">
                    Select Identity
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-start">
              <button onClick={prevStep} className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
                <i className="fas fa-arrow-left mr-2"></i> Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Outline / Structure */}
        {step === CreationStep.OUTLINE && project.outline && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
            <div className="text-center">
              <span className="signature-text-gradient font-bold uppercase tracking-[0.2em] text-xs">Phase 3: Architectural Logic</span>
              <h2 className="text-4xl font-bold mt-4 tracking-tight serif">Table of Contents</h2>
              <p className="text-slate-500 mt-4 font-medium italic">"{project.selectedConcept?.title}"</p>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 serif">Draft Structure</h3>
                <span className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100">
                  {project.outline.length} Chapters
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {project.outline.map((chap, idx) => (
                  <div key={chap.id} className="p-8 hover:bg-slate-50 transition-colors group">
                    <div className="flex gap-8">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-bold text-xs flex-shrink-0 group-hover:scale-110 transition-transform">
                        {idx + 1}
                      </div>
                      <div className="space-y-4 flex-1">
                        <h4 className="text-lg font-bold text-slate-900 serif">{chap.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">{chap.summary}</p>
                        <div className="flex flex-wrap gap-2">
                          {chap.sections.map((sec, sIdx) => (
                            <span key={sIdx} className="bg-white border border-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {sec}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-8">
              <button onClick={prevStep} className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
                <i className="fas fa-arrow-left mr-2"></i> Refine Concept
              </button>
              <div className="flex flex-col items-end gap-2">
                <button onClick={nextStep} className="px-10 py-4 signature-gradient text-white rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all active:scale-95">
                  Begin Writing Phase
                </button>
                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Requires significant token reserve</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Manuscript Synthesis (WRITING) */}
        {step === CreationStep.WRITING && project.outline && (
          <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
             <div className="flex flex-col md:flex-row gap-12 items-start">
                {/* Sidebar: Chapter List */}
                <div className="w-full md:w-80 space-y-4 sticky top-24">
                   <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                      <i className="fas fa-feather-pointed text-indigo-400"></i>
                      Draft Progress
                   </h3>
                   <div className="space-y-2">
                      {project.outline.map((chap, idx) => {
                         const isDrafted = !!project.manuscript[chap.id];
                         const isActive = activeChapterId === chap.id;
                         return (
                            <button
                               key={chap.id}
                               onClick={() => setActiveChapterId(chap.id)}
                               className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                                  isActive
                                    ? 'bg-white border-indigo-200 shadow-md ring-2 ring-indigo-50'
                                    : 'bg-white border-slate-100 hover:border-indigo-100 text-slate-500'
                               }`}
                            >
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isDrafted
                                    ? 'bg-green-100 text-green-600'
                                    : isActive ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'
                               }`}>
                                  {isDrafted ? <i className="fas fa-check"></i> : idx + 1}
                               </div>
                               <span className={`text-xs font-bold truncate flex-1 ${isActive ? 'text-slate-900' : ''}`}>{chap.title}</span>
                            </button>
                         );
                      })}
                   </div>
                   <div className="pt-8 space-y-4">
                      <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                         <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Writing Intelligence</p>
                         <p className="text-xs text-indigo-900 font-medium leading-relaxed">Synthesis uses 'Pro' logic with thinking cycles for depth.</p>
                      </div>
                      <button
                        onClick={nextStep}
                        className="w-full py-4 signature-gradient text-white rounded-[2rem] font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all"
                      >
                         Proceed to Identity
                      </button>
                   </div>
                </div>

                {/* Main Content: Chapter Drafting */}
                <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)] min-h-[700px] flex flex-col relative overflow-hidden">
                   {activeChapterId ? (() => {
                      const chapter = project.outline!.find(c => c.id === activeChapterId)!;
                      const draftedText = project.manuscript[activeChapterId];
                      return (
                        <div className="flex flex-col h-full animate-in fade-in duration-500">
                           <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                              <div>
                                 <h2 className="text-2xl font-bold text-slate-900 serif leading-tight">{chapter.title}</h2>
                                 <p className="text-xs text-slate-400 font-medium mt-1">Status: {draftedText ? 'Manifested' : 'Synthesizing Placeholder'}</p>
                              </div>
                              {!draftedText && (
                                 <button
                                    onClick={() => handleGenerateChapter(chapter)}
                                    className="px-8 py-3 signature-gradient text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg transition-all"
                                 >
                                    Generate Chapter
                                 </button>
                              )}
                           </div>
                           <div className="flex-1 p-12 overflow-y-auto max-h-[800px] bg-white scroll-smooth prose prose-slate max-w-none">
                              {draftedText ? (
                                 <div className="whitespace-pre-wrap leading-[2] text-slate-700 font-medium text-lg serif selection:bg-indigo-100">
                                    {draftedText}
                                 </div>
                              ) : (
                                 <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-24">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 text-slate-200 text-3xl">
                                       <i className="fas fa-feather-pointed"></i>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 serif">Empty Manuscript Plate</h3>
                                    <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Trigger the orchestration engine to synthesize this chapter's narrative content.</p>
                                 </div>
                              )}
                           </div>
                        </div>
                      );
                   })() : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-30">
                        <i className="fas fa-arrow-left text-4xl mb-8 animate-bounce-x"></i>
                        <h2 className="text-3xl font-bold text-slate-900 serif">Select a Chapter</h2>
                        <p className="text-lg text-slate-500 mt-4">Begin the narrative orchestration sequence.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Step 5: Identity Design (DESIGN) */}
        {step === CreationStep.DESIGN && (
          <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
             <div className="text-center mb-16">
                <span className="signature-text-gradient font-bold uppercase tracking-[0.2em] text-xs">Phase 5: Visual Manifestation</span>
                <h2 className="text-4xl font-bold mt-4 tracking-tight serif">Identity & Cover Design</h2>
                <p className="text-slate-500 mt-4 max-w-xl mx-auto font-medium">Orchestrate a visual language that communicates the depth of your research.</p>
             </div>

             <div className="flex flex-col lg:flex-row gap-16 items-start">
                <div className="flex-1 space-y-12">
                   <section className="space-y-6">
                      <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                         <i className="fas fa-palette text-indigo-400"></i>
                         Select Visual Tone
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                         {(['Minimalist', 'Vibrant', 'Classic', 'Dark & Moody', 'High-Tech'] as CoverStyle[]).map((style) => (
                            <button
                               key={style}
                               onClick={() => handleStyleSelect(style)}
                               className={`p-6 rounded-2xl border text-left transition-all ${
                                  project.coverStyle === style
                                    ? 'bg-white border-indigo-500 shadow-xl ring-2 ring-indigo-50'
                                    : 'bg-white border-slate-100 hover:border-indigo-100 text-slate-500'
                               }`}
                            >
                               <span className={`text-xs font-bold block ${project.coverStyle === style ? 'text-indigo-600' : 'text-slate-900'}`}>{style}</span>
                               <span className="text-[10px] text-slate-400 mt-2 block font-medium">Manifesting {style.toLowerCase()} aesthetic principles.</span>
                            </button>
                         ))}
                      </div>
                   </section>

                   <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                      <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                         <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
                         Synthesis Protocol
                      </h3>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-xs text-slate-600 leading-relaxed font-medium italic">
                            "System will synthesize a unique visual identity including custom high-resolution cover backgrounds tailored to your thesis: {project.selectedConcept?.title}"
                         </p>
                      </div>
                      <button
                        onClick={handleGenerateCover}
                        className="w-full py-5 signature-gradient text-white rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                      >
                         <i className="fas fa-image text-xs"></i>
                         Orchestrate Visual Identity
                      </button>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center">CONSUMES IMAGE GENERATION QUOTA</p>
                   </section>
                </div>

                {/* Visual Preview */}
                <div className="lg:w-[400px] flex-shrink-0 sticky top-24">
                   <div className="relative group perspective-1000">
                      <div className={`w-full aspect-[3/4] bg-slate-100 rounded-[2rem] border-8 border-white shadow-[0_48px_96px_-24px_rgba(0,0,0,0.12)] overflow-hidden relative transition-transform duration-700 preserve-3d group-hover:rotate-y-6 ${!project.coverImage ? 'flex items-center justify-center' : ''}`}>
                         {project.coverImage ? (
                            <>
                               <img src={project.coverImage} className="w-full h-full object-cover" alt="Cover background" />
                               {/* Typography Overlay */}
                               <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-between p-12 text-center">
                                  <div className="space-y-4 pt-12">
                                     <h1 className="text-3xl font-bold text-white serif leading-tight drop-shadow-lg">{project.selectedConcept?.title}</h1>
                                     <div className="w-12 h-[1px] bg-white/50 mx-auto"></div>
                                     <p className="text-[10px] font-bold text-white/90 uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">{project.selectedConcept?.tagline}</p>
                                  </div>
                                  <div className="pb-12">
                                     <p className="text-xs font-bold text-white tracking-[0.3em] uppercase">{user.name || "AUTHOR NAME"}</p>
                                  </div>
                               </div>
                            </>
                         ) : (
                            <div className="text-center p-12 space-y-4">
                               <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto text-slate-200 text-2xl shadow-sm">
                                  <i className="fas fa-image"></i>
                               </div>
                               <h4 className="text-lg font-bold text-slate-400 serif">Identity Pending</h4>
                               <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">Synthesis of visual metadata has not yet been initiated.</p>
                            </div>
                         )}
                      </div>
                      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-50 rotate-12">
                         <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">PRO 3.0</span>
                      </div>
                   </div>

                   {project.coverImage && (
                      <div className="mt-14 space-y-4">
                        <button
                           onClick={nextStep}
                           className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 group"
                        >
                           Manifest Final Publication
                           <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                        </button>
                        <button onClick={handleGenerateCover} className="w-full py-3 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors">
                           Refine Visual Prompt
                        </button>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Final Step */}
        {step === CreationStep.FINALIZE && (
          <div className="max-w-3xl mx-auto text-center py-24 animate-in zoom-in-95 duration-1000">
             <div className="signature-gradient w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto mb-14 text-4xl text-white shadow-2xl animate-bounce">
               <i className="fas fa-check"></i>
             </div>
             <h2 className="text-7xl font-bold tracking-tight mb-6 serif text-slate-900 leading-tight">Manuscript Synthesized.</h2>
             <p className="text-xl text-slate-500 mb-14 font-medium leading-relaxed max-w-xl mx-auto">Your orchestration has been fully manifested. The literature is ready for publication.</p>
             <div className="flex flex-col gap-5 max-w-sm mx-auto">
               <button onClick={() => window.location.reload()} className="px-12 py-6 signature-gradient text-white rounded-[2rem] font-bold shadow-2xl hover:scale-[1.05] transition-all">Launch New Orchestration</button>
               <button className="px-12 py-6 bg-white border border-slate-100 text-slate-700 rounded-[2rem] font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-4 shadow-sm">
                 <i className="fas fa-download text-xs text-indigo-500"></i> Export Comprehensive Package
               </button>
             </div>
          </div>
        )}
      </main>

      <footer className="py-24 px-12 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-16 text-slate-400 bg-white">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white w-8 h-8 border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-book text-[10px]"></i>
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">BookStudio AI</span>
          </div>
          <p className="text-sm font-medium leading-relaxed max-w-xs">Professional-grade literature orchestration for authors and experts.</p>
          <p className="text-[11px] font-bold uppercase tracking-widest mt-4">© 2026 Studio Protocols. All rights reserved.</p>
        </div>

        <div className="flex gap-24">
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">Foundation</h4>
            <ul className="text-xs space-y-3 font-semibold">
              <li><button onClick={() => navigateToInfo('enterprise')} className="hover:text-indigo-600 transition-all hover:translate-x-1 inline-block">Enterprise Solutions</button></li>
              <li><button onClick={() => navigateToInfo('api')} className="hover:text-indigo-600 transition-all hover:translate-x-1 inline-block">Orchestration API</button></li>
              <li><button onClick={() => navigateToInfo('metering')} className="hover:text-indigo-600 transition-all hover:translate-x-1 inline-block">Consumption Logic</button></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">Governance</h4>
            <ul className="text-xs space-y-3 font-semibold">
              <li><button onClick={() => navigateToInfo('billing')} className="hover:text-indigo-600 transition-all hover:translate-x-1 inline-block">Payment Terms</button></li>
              <li><button onClick={() => navigateToInfo('rights')} className="hover:text-indigo-600 transition-all hover:translate-x-1 inline-block">IP Sovereignty</button></li>
              <li><button onClick={() => navigateToInfo('privacy')} className="hover:text-indigo-600 transition-all hover:translate-x-1 inline-block">Data Integrity</button></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

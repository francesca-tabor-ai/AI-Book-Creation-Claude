
export type BookGenre = 'Non-Fiction' | 'Fiction' | 'Academic' | 'Business' | 'Self-Help' | 'Textbook';
export type WritingStyle = 'Formal' | 'Conversational' | 'Academic' | 'Narrative' | 'Technical' | 'Inspirational';
export type CoverStyle = 'Minimalist' | 'Vibrant' | 'Classic' | 'Dark & Moody' | 'High-Tech';

export type SubscriptionTier = 'Free' | 'Creator' | 'Pro Author' | 'Studio' | 'Enterprise';

export type AppView = 'editor' | 'info';
export type InfoPageType = 'enterprise' | 'api' | 'metering' | 'billing' | 'rights' | 'privacy';

export interface UsageStats {
  tokensUsed: number;
  tokenLimit: number;
  tokensThisMonth: number;
  projectCount: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  isVerified: boolean;
  provider: 'email' | 'google';
  createdAt: string;
  tier: SubscriptionTier;
  usage: UsageStats;
}

export type AuthMode = 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' | 'VERIFY_EMAIL';

export interface BookProject {
  id: string;
  dbId?: string;
  keyword: string;
  description: string;
  genre: BookGenre;
  audience: string;
  style: WritingStyle;
  coverStyle: CoverStyle;
  wordCountGoal: number;

  // Progress Data
  brainstormData?: {
    topics: string[];
    researchQuestions: string[];
    thesis: string;
  };

  selectedConcept?: BookConcept;
  outline?: Chapter[];
  manuscript: Record<string, string>; // chapterId -> text
  chapterWordCounts: Record<string, number>; // chapterId -> target word count
  coverPrompt?: string;
  coverImage?: string;
}

export interface BookConcept {
  title: string;
  tagline: string;
  description: string;
  targetMarket: string;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  sections: string[];
}

export enum CreationStep {
  SETUP = 0,
  BRAINSTORM = 1,
  CONCEPT = 2,
  OUTLINE = 3,
  WRITING = 4,
  DESIGN = 5,
  FINALIZE = 6
}

export const TOKEN_ESTIMATES = {
  BRAINSTORM: 5000,
  CONCEPT: 10000,
  TOC: 11000,
  CHAPTER: 45000,
  COVER: 7000
};

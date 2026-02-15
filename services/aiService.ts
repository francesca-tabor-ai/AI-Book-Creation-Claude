import { supabase } from '../lib/supabase';
import type { BookConcept, Chapter } from '../types';

// Helper function to ensure user is authenticated before calling Edge Functions
async function ensureAuthenticated(): Promise<void> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('You must be signed in to use this feature. Please sign in and try again.');
  }
}

export async function brainstormTopic(projectId: string): Promise<{
  thesis: string;
  topics: string[];
  researchQuestions: string[];
}> {
  await ensureAuthenticated();
  const { data, error } = await supabase.functions.invoke('brainstorm', {
    body: { projectId },
  });
  if (error) {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Authentication failed. Please sign in again and try again.');
    }
    throw new Error(error.message || 'Brainstorm generation failed');
  }
  return data;
}

export async function generateConcepts(projectId: string): Promise<BookConcept[]> {
  await ensureAuthenticated();
  const { data, error } = await supabase.functions.invoke('generate-concepts', {
    body: { projectId },
  });
  if (error) {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Authentication failed. Please sign in again and try again.');
    }
    throw new Error(error.message || 'Concept generation failed');
  }
  return data;
}

export async function generateTOC(projectId: string, conceptIndex: number): Promise<Chapter[]> {
  await ensureAuthenticated();
  const { data, error } = await supabase.functions.invoke('generate-toc', {
    body: { projectId, conceptIndex },
  });
  if (error) {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Authentication failed. Please sign in again and try again.');
    }
    throw new Error(error.message || 'TOC generation failed');
  }
  return data;
}

export async function generateChapterContent(chapterId: string): Promise<{
  content: string;
  wordCount: number;
}> {
  await ensureAuthenticated();
  const { data, error } = await supabase.functions.invoke('generate-chapter', {
    body: { chapterId },
  });
  if (error) {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Authentication failed. Please sign in again and try again.');
    }
    throw new Error(error.message || 'Chapter generation failed');
  }
  return data;
}

export async function generateCover(projectId: string): Promise<{
  imageUrl: string;
  prompt: string;
}> {
  await ensureAuthenticated();
  const { data, error } = await supabase.functions.invoke('generate-cover', {
    body: { projectId },
  });
  if (error) {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error('Authentication failed. Please sign in again and try again.');
    }
    throw new Error(error.message || 'Cover generation failed');
  }
  return data;
}

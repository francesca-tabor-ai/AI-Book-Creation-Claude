import { supabase } from '../lib/supabase';
import type { BookConcept, Chapter } from '../types';

export async function brainstormTopic(projectId: string): Promise<{
  thesis: string;
  topics: string[];
  researchQuestions: string[];
}> {
  const { data, error } = await supabase.functions.invoke('brainstorm', {
    body: { projectId },
  });
  if (error) throw new Error(error.message || 'Brainstorm generation failed');
  return data;
}

export async function generateConcepts(projectId: string): Promise<BookConcept[]> {
  const { data, error } = await supabase.functions.invoke('generate-concepts', {
    body: { projectId },
  });
  if (error) throw new Error(error.message || 'Concept generation failed');
  return data;
}

export async function generateTOC(projectId: string, conceptIndex: number): Promise<Chapter[]> {
  const { data, error } = await supabase.functions.invoke('generate-toc', {
    body: { projectId, conceptIndex },
  });
  if (error) throw new Error(error.message || 'TOC generation failed');
  return data;
}

export async function generateChapterContent(chapterId: string): Promise<{
  content: string;
  wordCount: number;
}> {
  const { data, error } = await supabase.functions.invoke('generate-chapter', {
    body: { chapterId },
  });
  if (error) throw new Error(error.message || 'Chapter generation failed');
  return data;
}

export async function generateCover(projectId: string): Promise<{
  imageUrl: string;
  prompt: string;
}> {
  const { data, error } = await supabase.functions.invoke('generate-cover', {
    body: { projectId },
  });
  if (error) throw new Error(error.message || 'Cover generation failed');
  return data;
}

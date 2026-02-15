import { supabase } from '../lib/supabase';
import type { BookProject, BookConcept, Chapter, SubscriptionTier } from '../types';

// ============================================================
// PROJECTS
// ============================================================

export async function createProject(userId: string, project: BookProject): Promise<string> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      seed_keyword: project.keyword,
      description: project.description,
      genre: project.genre,
      target_audience: project.audience,
      writing_style: project.style,
      cover_style: project.coverStyle,
      word_count_goal: project.wordCountGoal,
      current_step: 0,
      status: 'setup',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getUserProjects(userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      book_concepts (*),
      chapters (*, order_index),
      cover_designs (*)
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      book_concepts (*),
      chapters (*),
      cover_designs (*)
    `)
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(projectId: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId);

  if (error) throw error;
}

export async function saveProjectStep(projectId: string, step: number) {
  const statusMap: Record<number, string> = {
    0: 'setup', 1: 'brainstorm', 2: 'concept', 3: 'outline',
    4: 'writing', 5: 'design', 6: 'finalize'
  };

  await updateProject(projectId, {
    current_step: step,
    status: statusMap[step] || 'setup',
  });
}

export async function softDeleteProject(projectId: string) {
  await updateProject(projectId, { deleted_at: new Date().toISOString() });
}

// ============================================================
// BOOK CONCEPTS
// ============================================================

export async function saveBrainstormData(
  projectId: string,
  brainstormData: { thesis: string; topics: string[]; researchQuestions: string[] }
) {
  const { data: existing } = await supabase
    .from('book_concepts')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('book_concepts')
      .update({
        thesis_statement: brainstormData.thesis,
        brainstorm_map: brainstormData as unknown as Record<string, unknown>,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('book_concepts')
      .insert({
        project_id: projectId,
        thesis_statement: brainstormData.thesis,
        brainstorm_map: brainstormData as unknown as Record<string, unknown>,
      });
    if (error) throw error;
  }
}

export async function saveConcepts(projectId: string, concepts: BookConcept[]) {
  const { error } = await supabase
    .from('book_concepts')
    .update({ concepts_json: concepts as unknown as Record<string, unknown>[] })
    .eq('project_id', projectId);

  if (error) throw error;
}

export async function saveSelectedConcept(projectId: string, concept: BookConcept) {
  const { error } = await supabase
    .from('book_concepts')
    .update({
      selected_title: concept.title,
      selected_tagline: concept.tagline,
      selected_description: concept.description,
      market_positioning: concept.targetMarket,
    })
    .eq('project_id', projectId);

  if (error) throw error;
}

// ============================================================
// CHAPTERS
// ============================================================

export async function saveChapters(projectId: string, chapters: Chapter[]): Promise<{ id: string; order_index: number }[]> {
  // Delete existing chapters for this project first (upsert on composite key)
  await supabase.from('chapters').delete().eq('project_id', projectId);

  const rows = chapters.map((ch, idx) => ({
    project_id: projectId,
    title: ch.title,
    order_index: idx,
    summary_context: ch.summary,
    sections: ch.sections as unknown as string[],
    status: 'draft' as const,
    target_word_count: 2000,
  }));

  const { data, error } = await supabase
    .from('chapters')
    .insert(rows)
    .select('id, order_index');

  if (error) throw error;
  return data;
}

export async function saveChapterContent(chapterId: string, content: string) {
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const { error } = await supabase
    .from('chapters')
    .update({
      content_markdown: content,
      word_count: wordCount,
      status: 'generated',
    })
    .eq('id', chapterId);

  if (error) throw error;
}

export async function getProjectChapters(projectId: string) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data;
}

// ============================================================
// COVER DESIGNS
// ============================================================

export async function saveCoverDesign(
  projectId: string,
  prompt: string,
  imageUrl: string,
  storagePath: string,
  styleVariant: string
) {
  const { error } = await supabase
    .from('cover_designs')
    .insert({
      project_id: projectId,
      image_prompt: prompt,
      image_url: imageUrl,
      storage_path: storagePath,
      style_variant: styleVariant,
    });

  if (error) throw error;
}

export async function uploadCoverImage(
  userId: string,
  projectId: string,
  imageBlob: Blob
): Promise<{ url: string; path: string }> {
  const filename = `cover_${Date.now()}.png`;
  const storagePath = `${userId}/${projectId}/${filename}`;

  const { error } = await supabase.storage
    .from('covers')
    .upload(storagePath, imageBlob, { contentType: 'image/png' });

  if (error) throw error;

  const { data } = supabase.storage.from('covers').getPublicUrl(storagePath);

  return { url: data.publicUrl, path: storagePath };
}

// ============================================================
// USAGE TRACKING
// ============================================================

export async function trackTokenUsage(userId: string, tokens: number) {
  const { error } = await supabase.rpc('increment_token_usage', {
    p_user_id: userId,
    p_tokens: tokens,
  });

  if (error) throw error;
}

export async function updateUserTier(userId: string, tier: SubscriptionTier) {
  const limits: Record<SubscriptionTier, number> = {
    Free: 50000,
    Creator: 1000000,
    'Pro Author': 5000000,
    Studio: 20000000,
    Enterprise: 100000000,
  };

  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      token_limit: limits[tier],
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function refreshUserUsage(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('tokens_used, tokens_this_month, token_limit, project_count, subscription_tier')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// HELPER: Reconstitute BookProject from DB data
// ============================================================

export function dbToBookProject(dbProject: NonNullable<Awaited<ReturnType<typeof getProject>>>): BookProject & { dbId: string } {
  const concept = dbProject.book_concepts?.[0];
  const chapters = (dbProject.chapters || [])
    .sort((a, b) => a.order_index - b.order_index);
  const latestCover = dbProject.cover_designs?.[dbProject.cover_designs.length - 1];

  const brainstormMap = concept?.brainstorm_map as { thesis?: string; topics?: string[]; researchQuestions?: string[] } | null;
  const conceptsJson = concept?.concepts_json as BookConcept[] | null;

  const manuscript: Record<string, string> = {};
  const chapterWordCounts: Record<string, number> = {};
  for (const ch of chapters) {
    if (ch.content_markdown) {
      manuscript[ch.id] = ch.content_markdown;
    }
    chapterWordCounts[ch.id] = ch.target_word_count;
  }

  return {
    dbId: dbProject.id,
    id: dbProject.id,
    keyword: dbProject.seed_keyword,
    description: dbProject.description || '',
    genre: dbProject.genre as BookProject['genre'],
    audience: dbProject.target_audience,
    style: dbProject.writing_style as BookProject['style'],
    coverStyle: dbProject.cover_style as BookProject['coverStyle'],
    wordCountGoal: dbProject.word_count_goal,
    brainstormData: brainstormMap?.thesis ? {
      thesis: brainstormMap.thesis,
      topics: brainstormMap.topics || [],
      researchQuestions: brainstormMap.researchQuestions || [],
    } : undefined,
    selectedConcept: concept?.selected_title ? {
      title: concept.selected_title,
      tagline: concept.selected_tagline || '',
      description: concept.selected_description || '',
      targetMarket: concept.market_positioning || '',
    } : (conceptsJson && conceptsJson.length > 0 ? undefined : undefined),
    outline: chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      summary: ch.summary_context || '',
      sections: (ch.sections as string[]) || [],
    })),
    manuscript,
    chapterWordCounts,
    coverPrompt: latestCover?.image_prompt || undefined,
    coverImage: latestCover?.image_url || undefined,
  };
}

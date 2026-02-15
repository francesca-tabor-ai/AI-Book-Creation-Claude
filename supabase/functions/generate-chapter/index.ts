import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { generateWithAI } from '../_shared/openai.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { chapterId } = await req.json();

    // Fetch chapter + parent project
    const { data: chapter } = await supabase
      .from('chapters')
      .select('*, projects(*, book_concepts(*))')
      .eq('id', chapterId)
      .single();

    if (!chapter) {
      return new Response(JSON.stringify({ error: 'Chapter not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const project = (chapter as Record<string, unknown>).projects as Record<string, unknown>;
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, tokens_this_month, token_limit')
      .eq('auth_id', user.id)
      .single();

    if (!profile || profile.tokens_this_month + 45000 > profile.token_limit) {
      return new Response(JSON.stringify({ error: 'Token limit exceeded. Please upgrade your plan.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark chapter as generating
    await supabase.from('chapters').update({ status: 'generating' }).eq('id', chapterId);

    // Get previous chapter summary for continuity
    let previousSummary = '';
    if (chapter.order_index > 0) {
      const { data: prevChapter } = await supabase
        .from('chapters')
        .select('summary_context, content_markdown')
        .eq('project_id', chapter.project_id)
        .eq('order_index', chapter.order_index - 1)
        .single();

      if (prevChapter?.summary_context) {
        previousSummary = prevChapter.summary_context;
      }
    }

    const bookConcepts = (project as Record<string, unknown>).book_concepts as Array<Record<string, unknown>>;
    const selectedTitle = bookConcepts?.[0]?.selected_title || '';
    const targetWordCount = Math.min(chapter.target_word_count || 2000, 3000); // Enforce 3000 word max
    const sections = (chapter.sections as string[]) || [];

    const systemPrompt = `You are a professional book-writing AI producing publication-quality chapters.
Incorporate the user's original context and description into the narrative flow where appropriate.

Chapter Generation Rules:
1. Opening: Hook/framing idea, context, and why this chapter matters.
2. Core: Subsections expanded with theory, application, and examples.
3. Insight: Include a deep reflection or contrarian perspective.
4. Close: Summary of insights and bridge to the next chapter.

Standards:
- Word count: Aim for approximately ${targetWordCount} words of rich, high-density content.
- Depth: Provide thorough analysis for each subsection to meet the word count target without using filler.
- Continuity: Maintain terminology and argument consistency.
- Formatting: Use Markdown headers (##) and clear paragraphs.
- No fluff: Avoid generic filler phrases.`;

    const userPrompt = `Book: ${selectedTitle}
Original Context: ${(project as Record<string, unknown>).description || ''}
Chapter Title: ${chapter.title}
Subsections: ${sections.join(', ')}
Style: ${(project as Record<string, unknown>).writing_style}
Audience: ${(project as Record<string, unknown>).target_audience}
Target Word Count: ${targetWordCount} words
${previousSummary ? `\nPrevious Chapter Summary (for continuity): ${previousSummary}` : ''}`;

    const content = await generateWithAI(systemPrompt, userPrompt, {
      maxTokens: 8000,
      model: 'gpt-4o',
      temperature: 0.7,
    });

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    // Save chapter content
    await supabase.from('chapters').update({
      content_markdown: content,
      word_count: wordCount,
      status: 'generated',
    }).eq('id', chapterId);

    // Update project step if still on writing
    await supabase.from('projects').update({
      current_step: 4,
      status: 'writing',
    }).eq('id', chapter.project_id);

    // Track usage
    await supabase.rpc('increment_token_usage', {
      p_user_id: profile.id,
      p_tokens: 45000,
    });

    return new Response(JSON.stringify({ content, wordCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Generate chapter error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

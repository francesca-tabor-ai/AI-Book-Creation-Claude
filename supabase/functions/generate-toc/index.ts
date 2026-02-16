import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { generateWithAI } from '../_shared/openai.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { projectId, conceptIndex } = await req.json();

    // Fetch project + concepts
    const { data: project } = await supabase
      .from('projects')
      .select('*, book_concepts(*)')
      .eq('id', projectId)
      .single();

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

    if (!profile || profile.tokens_this_month + 11000 > profile.token_limit) {
      return new Response(JSON.stringify({ error: 'Token limit exceeded. Please upgrade your plan.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bookConcept = project.book_concepts?.[0];
    const rawConcepts = bookConcept?.concepts_json;
    // Handle concepts_json being a single object or an array
    let conceptsArray: Array<{
      title: string;
      tagline: string;
      description: string;
      targetMarket: string;
    }>;
    if (Array.isArray(rawConcepts)) {
      conceptsArray = rawConcepts;
    } else if (rawConcepts && typeof rawConcepts === 'object' && (rawConcepts as Record<string, unknown>).title) {
      conceptsArray = [rawConcepts as { title: string; tagline: string; description: string; targetMarket: string }];
    } else {
      conceptsArray = [];
    }
    const selectedConcept = conceptsArray[conceptIndex] || conceptsArray[0];

    if (!selectedConcept) {
      return new Response(JSON.stringify({ error: 'No concept found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save selected concept
    if (bookConcept) {
      await supabase.from('book_concepts').update({
        selected_title: selectedConcept.title,
        selected_tagline: selectedConcept.tagline,
        selected_description: selectedConcept.description,
        market_positioning: selectedConcept.targetMarket,
      }).eq('id', bookConcept.id);
    }

    const systemPrompt = `You are an academic synthesis + publishing structure architect.
Generate a professional Table of Contents for the selected book concept, keeping in mind the user's original detailed description.

Structural Integrity Rules:
- 8-12 Chapters total.
- Flow logically: Foundations -> Complexity -> Application -> Future.
- Reflect academic grounding AND reader accessibility.
- Each chapter needs 3-6 specific subsections.
- Show a clear narrative or intellectual progression.
- Avoid generic chapter naming (e.g., 'Introduction' should be thematic).

You MUST respond with valid JSON as an array:
[
  {
    "id": "ch1",
    "title": "Chapter title",
    "summary": "Chapter narrative goal and summary.",
    "sections": ["Subsection 1", "Subsection 2", ...]
  }
]`;

    const userPrompt = `Selected Concept: ${selectedConcept.title}
Tagline: ${selectedConcept.tagline}
Original Vision: ${project.description || ''}
Concept Summary: ${selectedConcept.description}`;

    const resultText = await generateWithAI(systemPrompt, userPrompt, {
      jsonSchema: {},
      maxTokens: 4000,
      model: 'gpt-4o',
      temperature: 0.7,
    });

    const chapters = JSON.parse(resultText);

    // Delete existing chapters and insert new ones
    await supabase.from('chapters').delete().eq('project_id', projectId);

    const chapterRows = chapters.map((ch: { id: string; title: string; summary: string; sections: string[] }, idx: number) => ({
      project_id: projectId,
      title: ch.title,
      order_index: idx,
      summary_context: ch.summary,
      sections: ch.sections,
      status: 'draft',
      target_word_count: 2000,
    }));

    const { data: insertedChapters } = await supabase
      .from('chapters')
      .insert(chapterRows)
      .select('id, title, order_index, summary_context, sections');

    // Update project step
    await supabase.from('projects').update({
      title: selectedConcept.title,
      current_step: 3,
      status: 'outline',
    }).eq('id', projectId);

    // Track usage
    await supabase.rpc('increment_token_usage', {
      p_user_id: profile.id,
      p_tokens: 11000,
    });

    // Return chapters in frontend-expected format
    const result = (insertedChapters || []).map((ch) => ({
      id: ch.id,
      title: ch.title,
      summary: ch.summary_context || '',
      sections: ch.sections || [],
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Generate TOC error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

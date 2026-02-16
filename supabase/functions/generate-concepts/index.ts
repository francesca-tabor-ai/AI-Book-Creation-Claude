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

    const { projectId } = await req.json();

    // Fetch project + brainstorm data
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

    if (!profile || profile.tokens_this_month + 10000 > profile.token_limit) {
      return new Response(JSON.stringify({ error: 'Token limit exceeded. Please upgrade your plan.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const concept = project.book_concepts?.[0];
    const brainstormMap = concept?.brainstorm_map as Record<string, unknown> | null;

    const systemPrompt = `You are a hybrid academic synthesis + publishing concept assistant.
Convert research questions, thesis, and the initial description into 3-5 distinct book concepts.
Each concept must bridge academic thinking with commercially viable positioning while honoring the user's original vision.

Requirements:
- Memphis/Memorable Titles
- Value-driven Taglines (5-15 words)
- Clear Style Category (e.g., Popular Science, Thought Leadership, Strategy)
- Specific Audience Segmentation (Education level, reading motivation, knowledge level)

Avoid generic titles. Mix Provocative, Intellectual Prestige, and Commercial Appeal.

You MUST respond with valid JSON as an array of objects:
[
  {
    "title": "...",
    "tagline": "...",
    "description": "Detailed book concept description.",
    "targetMarket": "Target persona and knowledge level."
  }
]`;

    const userPrompt = `Keyword: ${project.seed_keyword}
Description: ${project.description || ''}
Existing Thesis: ${brainstormMap?.thesis || ''}
Research Questions: ${(brainstormMap?.researchQuestions as string[] || []).join('\n')}`;

    const resultText = await generateWithAI(systemPrompt, userPrompt, {
      jsonSchema: {},
      maxTokens: 3000,
      temperature: 0.7,
    });

    let concepts = JSON.parse(resultText);
    // Ensure concepts is always an array
    if (!Array.isArray(concepts)) {
      if (concepts && typeof concepts === 'object') {
        // If AI returned an object with a concepts/data key, extract it
        concepts = concepts.concepts || concepts.data || [concepts];
      } else {
        concepts = [];
      }
    }

    // Save concepts
    if (concept) {
      await supabase.from('book_concepts').update({
        concepts_json: concepts,
      }).eq('id', concept.id);
    }

    // Update project step
    await supabase.from('projects').update({
      current_step: 2,
      status: 'concept',
    }).eq('id', projectId);

    // Track usage
    await supabase.rpc('increment_token_usage', {
      p_user_id: profile.id,
      p_tokens: 10000,
    });

    return new Response(JSON.stringify(concepts), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Generate concepts error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    const { projectId } = await req.json();

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile for usage tracking
    const { data: profile } = await supabase
      .from('users')
      .select('id, tokens_this_month, token_limit')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check token budget
    if (profile.tokens_this_month + 5000 > profile.token_limit) {
      return new Response(JSON.stringify({ error: 'Token limit exceeded. Please upgrade your plan.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input sanitization
    const keyword = (project.seed_keyword || '').slice(0, 500);
    const description = (project.description || '').slice(0, 2000);

    const systemPrompt = `You are a creative brainstorming assistant and academic research specialist.
Your job is to expand a keyword and a detailed description into a multi-angle idea exploration and generate thesis-level research questions.

1. Association Expansion: Related concepts, industries, emotions, and trends based on the provided description.
2. Idea Generation: Business, content, and innovation opportunities.
3. Academic Framing: Define the keyword and description in an academic context and identify relevant disciplines.
4. Research Question Generation: Generate 5-10 rigorous questions (Exploratory, Analytical, Comparative, Applied, and Future-Oriented).

Style: Expansive, formal yet creative, specific and focused.

You MUST respond with valid JSON in this exact format:
{
  "thesis": "A core academic thesis statement",
  "topics": ["topic1", "topic2", ...],
  "researchQuestions": ["question1", "question2", ...]
}`;

    const userPrompt = `Keyword: ${keyword}
Detailed Description: ${description}
Genre: ${project.genre}
Audience: ${project.target_audience}
Style: ${project.writing_style}`;

    const resultText = await generateWithAI(systemPrompt, userPrompt, {
      jsonSchema: {},
      maxTokens: 2000,
      temperature: 0.7,
    });

    const result = JSON.parse(resultText);

    // Save brainstorm data
    const { data: existingConcept } = await supabase
      .from('book_concepts')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (existingConcept) {
      await supabase.from('book_concepts').update({
        thesis_statement: result.thesis,
        brainstorm_map: result,
      }).eq('id', existingConcept.id);
    } else {
      await supabase.from('book_concepts').insert({
        project_id: projectId,
        thesis_statement: result.thesis,
        brainstorm_map: result,
      });
    }

    // Update project step
    await supabase.from('projects').update({
      current_step: 1,
      status: 'brainstorm',
    }).eq('id', projectId);

    // Track token usage
    await supabase.rpc('increment_token_usage', {
      p_user_id: profile.id,
      p_tokens: 5000,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Brainstorm error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { generateWithAI, generateImage } from '../_shared/openai.ts';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User-scoped client for auth
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service role client for storage uploads (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { projectId } = await req.json();

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

    if (!profile || profile.tokens_this_month + 7000 > profile.token_limit) {
      return new Response(JSON.stringify({ error: 'Token limit exceeded. Please upgrade your plan.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bookConcept = project.book_concepts?.[0];

    // Step 1: Generate cover prompt
    const promptSystemInstruction = `You are a book cover concept designer and AI image prompt engineer.
Generate a high-detail, production-ready Front Cover image prompt, inspired by the book's core vision, genre, and the user's chosen aesthetic style (${project.cover_style}).

Aesthetic Guidelines for "${project.cover_style}":
- Minimalist: Simple, clean, large whitespace, single powerful icon or symbol, muted colors.
- Vibrant: High saturation, dynamic shapes, energetic colors, eye-catching gradients.
- Classic: Timeless typography, traditional layouts, elegant textures (like paper or canvas), rich but sophisticated palette.
- Dark & Moody: High contrast, deep shadows, atmospheric, dramatic lighting, intense emotional tone.
- High-Tech: Futuristic, digital textures, neon accents, crisp lines, complex technical patterns.

Interpretation:
- Analyze theme, emotional tone, and market shelf category.
- Identify visual symbolism opportunities.
- Style: Ensure it strictly adheres to the requested "${project.cover_style}" aesthetic.
- Composition: Center focus, rule of thirds, specific lighting.

Output ONLY a single, high-quality descriptive prompt for a text-to-image AI model. Do not include book title text in the image generation prompt as it will be overlaid by UI.`;

    const promptUserInput = `Title: ${bookConcept?.selected_title || ''}
Tagline: ${bookConcept?.selected_tagline || ''}
Original Vision: ${project.description || ''}
Genre: ${project.genre}
Desired Cover Aesthetic: ${project.cover_style}`;

    const coverPrompt = await generateWithAI(promptSystemInstruction, promptUserInput, {
      maxTokens: 500,
      temperature: 0.7,
    });

    // Step 2: Generate cover image
    const imageBytes = await generateImage(
      `Generate a professional book cover background based on this concept: ${coverPrompt}. The image should be artistic, high-resolution, and suit a professional book. No text.`
    );

    // Step 3: Upload to Supabase Storage
    const filename = `cover_${Date.now()}.png`;
    const storagePath = `${profile.id}/${projectId}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('covers')
      .upload(storagePath, imageBytes, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('covers')
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;

    // Step 4: Save cover design record
    await supabase.from('cover_designs').insert({
      project_id: projectId,
      image_prompt: coverPrompt,
      image_url: imageUrl,
      storage_path: storagePath,
      style_variant: project.cover_style,
    });

    // Update project step
    await supabase.from('projects').update({
      current_step: 5,
      status: 'design',
    }).eq('id', projectId);

    // Track usage
    await supabase.rpc('increment_token_usage', {
      p_user_id: profile.id,
      p_tokens: 7000,
    });

    return new Response(JSON.stringify({ imageUrl, prompt: coverPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Generate cover error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

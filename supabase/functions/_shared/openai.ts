export interface AIGenerateOptions {
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  model?: string;
  temperature?: number;
}

export async function generateWithAI(
  systemPrompt: string,
  userPrompt: string,
  options: AIGenerateOptions = {}
): Promise<string> {
  const {
    maxTokens = 2000,
    model = 'gpt-4o',
    temperature = 0.7,
    jsonSchema,
  } = options;

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  // Try OpenAI first
  if (openaiKey) {
    try {
      return await callOpenAI(openaiKey, systemPrompt, userPrompt, {
        model,
        maxTokens,
        temperature,
        jsonSchema,
      });
    } catch (err) {
      console.error('OpenAI failed, trying Anthropic fallback:', err);
    }
  }

  // Fallback to Anthropic
  if (anthropicKey) {
    return await callAnthropic(anthropicKey, systemPrompt, userPrompt, {
      maxTokens,
      temperature,
    });
  }

  throw new Error('No AI API keys configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY secrets.');
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  opts: { model: string; maxTokens: number; temperature: number; jsonSchema?: Record<string, unknown> }
): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  if (opts.jsonSchema) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens: number; temperature: number }
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function generateImage(prompt: string): Promise<Uint8Array> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('OPENAI_API_KEY required for image generation');

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1792',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Image API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const b64 = data.data[0].b64_json;

  // Convert base64 to Uint8Array
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

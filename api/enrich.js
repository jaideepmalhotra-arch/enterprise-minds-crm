export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are a B2B company research assistant for Enterprise Minds, an AI and digital transformation consulting firm.
Given a company name and website, research the company and return ONLY a JSON object with this exact structure:
{
  "overview": "2-3 sentence description of what the company does and their market position",
  "industry": "primary industry sector",
  "size": "estimated employee count or range e.g. 500-1000 or 10,000+",
  "headquarters": "City, Country",
  "tech_stack": ["specific", "technologies", "tools", "platforms", "they", "use"],
  "tech_categories": ["Cloud", "ERP", "CRM", "AI/ML", "etc"],
  "digital_maturity": "Low or Medium or High",
  "summary": "2-3 sentence sales note: what they do, their tech landscape, and why Enterprise Minds AI and digital transformation services could be relevant to them"
}
Return ONLY valid JSON. No markdown backticks, no explanation, no extra text.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { company, website } = await req.json();
    if (!company || !website) {
      return new Response(JSON.stringify({ error: 'company and website required' }), { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
    }

    const prompt = `Research this company and return a JSON profile:
Company: ${company}
Website: ${website}

Search the web to find current accurate information about their technology stack, company size, headquarters, and digital operations.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || `Anthropic API error ${response.status}` }), { status: response.status });
    }

    const data = await response.json();
    const textBlock = data.content.find(b => b.type === 'text');
    if (!textBlock) {
      return new Response(JSON.stringify({ error: 'No text in AI response' }), { status: 500 });
    }

    let text = textBlock.text.trim();
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return new Response(JSON.stringify({ error: 'Could not parse AI response', raw: text }), { status: 500 });
    }

    return new Response(JSON.stringify(parsed), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

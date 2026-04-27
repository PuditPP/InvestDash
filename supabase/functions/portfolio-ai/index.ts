
// This is a Supabase Edge Function that acts as a secure proxy.
// It hides your API keys from the browser.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in Supabase secrets');
    }

    const { action, payload } = await req.json()

    const getSystemContent = () => {
      if (action === 'summarize') return "You are a senior financial analyst. Provide a 1-sentence summary of the investment impact of news. Be concise and professional.";
      if (action === 'ask') return "You are a professional investment analyst. Answer user questions about their portfolio with high-signal, concise financial insights.";
      return "You are a senior equity analyst at Seeking Alpha. Provide a professional 'Key Takeaways' summary. No intro, no filler, no bolding. Just high-signal financial analysis.";
    };

    const getUserContent = () => {
      if (action === 'summarize') return `Analyze this news: Headline: ${payload.headline}. Summary: ${payload.content}. What is the short-term investment impact?`;
      return payload.prompt;
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: getSystemContent() },
          { role: "user", content: getUserContent() }
        ],
        max_tokens: action === 'summarize' ? 150 : 500,
        temperature: 0.4
      }),
    })

    const data = await response.json()
    
    // If OpenAI returned an error, return it with a 400 status so the frontend knows it failed
    if (data.error) {
      return new Response(JSON.stringify(data), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify(data), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: { message: error.message } }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

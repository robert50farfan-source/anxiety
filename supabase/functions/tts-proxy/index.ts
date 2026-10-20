import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY') ?? ''
const ELEVENLABS_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') ?? '0wc8O2YR1sPXOcb27h7k'

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar auth — rechaza llamadas sin sesión válida (protege créditos de ElevenLabs)
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return jsonError('No autorizado', 401)

    // La voz solo se usa en el chat, exclusivo del grupo experimental
    const { data: participacion } = await supabase
      .from('mi_participacion')
      .select('grupo_interno, estado')
      .maybeSingle()
    if (participacion?.grupo_interno !== 'experimental' || participacion?.estado === 'retirado') {
      return jsonError('No disponible para este participante', 403)
    }

    const { text } = await req.json()
    if (!text || typeof text !== 'string') return jsonError('text is required', 400)

    // Limit text length to control costs (~500 chars max per request)
    const trimmed = text.slice(0, 500)

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: trimmed,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('ElevenLabs error:', response.status, err)
      return jsonError('tts-failed', 502)
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('tts-proxy error:', e)
    return jsonError('internal', 500)
  }
})

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    console.error("TTS: Missing ELEVENLABS_VOICE_ID or ELEVENLABS_API_KEY");
    return Response.json({ error: "TTS not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`TTS: ElevenLabs returned ${response.status}:`, errorBody);
      return Response.json(
        { error: `ElevenLabs error: ${response.status}`, detail: errorBody },
        { status: response.status }
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("TTS: Fetch to ElevenLabs failed:", err);
    return Response.json(
      { error: "Failed to reach ElevenLabs" },
      { status: 502 }
    );
  }
}

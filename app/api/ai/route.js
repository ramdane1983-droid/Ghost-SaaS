import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const maxDuration = 60; 

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const userEmail = formData.get('email');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email manquant' }, { status: 400 });
    }

    // 1. VÉRIFICATION DES CRÉDITS (Version robuste)
    const { data: creditData, error: dbError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    // Si pas de ligne en base ou crédits à 0 => On renvoie 402 (Déclenche Stripe)
    if (!creditData || creditData.credits_remaining <= 0) {
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 });
    }

    // 2. TRANSCRIPTION
    let transcript = "";
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioFile = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      transcript = transcription.text;
    }

    // 3. GÉNÉRATION GHOSTWRITER
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Tu es un Ghostwriter d'élite. Style direct." },
        { role: "user", content: `Transcript: ${transcript}` }
      ],
    });

    // 4. DÉBIT DU CRÉDIT
    await supabase
      .from('credits')
      .update({ credits_remaining: creditData.credits_remaining - 1 })
      .eq('user_email', userEmail);

    return NextResponse.json({
      transcript,
      text: completion.choices[0].message.content,
      credits_remaining: creditData.credits_remaining - 1
    });

  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
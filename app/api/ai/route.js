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

    // 1. VÉRIFICATION OU CRÉATION DES CRÉDITS
    let { data: creditData, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    // Si l'utilisateur n'existe pas, on le crée ici
    if (!creditData) {
      const { data: newEntry, error: insertError } = await supabase
        .from('credits')
        .insert([{ user_email: userEmail, credits_remaining: 3, plan: 'free' }])
        .select()
        .single();
      
      creditData = newEntry;
    }

    if (creditData.credits_remaining <= 0) {
      return NextResponse.json({ error: 'PLUS_DE_CREDITS' }, { status: 402 });
    }

    // 2. TRANSCRIPTION
    let transcript = "";
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioFile = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      transcript = transcription.text;
    }

    // 3. GÉNÉRATION (PROMPT ÉLITE)
    const systemBase = `Tu es le Ghostwriter d'élite. Style : Brut, Phrases courtes, Impact maximum.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemBase },
        { role: "user", content: `Transforme ce transcript :\n${transcript}` }
      ],
    });

    // 4. MISE À JOUR CRÉDITS
    await supabase
      .from('credits')
      .update({ credits_remaining: creditData.credits_remaining - 1 })
      .eq('user_email', userEmail);

    return NextResponse.json({
      transcript,
      credits_remaining: creditData.credits_remaining - 1,
      text: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
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

    // 1. VÉRIFICATION OU CRÉATION AUTOMATIQUE DES CRÉDITS
    let { data: creditData } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    // SI L'UTILISATEUR N'EXISTE PAS, ON LE CRÉE AVEC 3 CRÉDITS
    if (!creditData) {
      const { data: newEntry, error: insertError } = await supabase
        .from('credits')
        .insert([{ user_email: userEmail, credits_remaining: 3, plan: 'free' }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      creditData = newEntry;
    }

    if (creditData.credits_remaining <= 0) {
      return NextResponse.json({ error: 'PLUS_DE_CREDITS' }, { status: 402 });
    }

    // 2. TRANSCRIPTION
    let transcript = "Texte test sans audio";
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
        { role: "system", content: "Tu es un Ghostwriter d'élite. Style direct et brutal." },
        { role: "user", content: `Transcript: ${transcript}` }
      ],
    });

    // 4. MISE À JOUR DES CRÉDITS (-1)
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
    console.error('Erreur API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
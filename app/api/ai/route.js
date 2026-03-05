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
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    // 1. VÉRIFICATION OU CRÉATION DE L'UTILISATEUR
    // .maybeSingle() évite l'erreur si l'email n'existe pas encore
    let { data: creditData, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    // Si l'utilisateur est inconnu, on le crée immédiatement
    if (!creditData) {
      const { data: newEntry, error: insertError } = await supabase
        .from('credits')
        .insert([{ 
          user_email: userEmail, 
          credits_remaining: 3, 
          plan: 'free' 
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      creditData = newEntry;
    }

    // Vérification des crédits restants
    if (creditData.credits_remaining <= 0) {
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 });
    }

    // 2. TRANSCRIPTION WHISPER
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

    // 3. GÉNÉRATION DES 3 ANGLES (GHOSTWRITER MODE)
    const systemBase = `Tu es le Ghostwriter d'élite des fondateurs SaaS B2B.
Ton objectif : Transformer un transcript en une pièce d'autorité brute.
- Pas d'introduction polie. Phrases courtes. Impact maximum.
- Utilise le "Je". Un saut de ligne entre chaque phrase.
STRUCTURE : Accroche choc > Preuve concrète > Conseil actionnable > Question ouverte.`;

    const [rant, lesson, vision] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\nAngle: RANT (Provocateur et brutal).` },
          { role: "user", content: `Transcript:\n${transcript}` }
        ],
        temperature: 0.9,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\nAngle: LESSON (Éducatif et valeur).` },
          { role: "user", content: `Transcript:\n${transcript}` }
        ],
        temperature: 0.7,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\nAngle: VISION (Leadership et futur).` },
          { role: "user", content: `Transcript:\n${transcript}` }
        ],
        temperature: 0.8,
      }),
    ]);

    // 4. MISE À JOUR DES CRÉDITS (-1)
    await supabase
      .from('credits')
      .update({ credits_remaining: creditData.credits_remaining - 1 })
      .eq('user_email', userEmail);

    return NextResponse.json({
      transcript,
      credits_remaining: creditData.credits_remaining - 1,
      angles: {
        rant: rant.choices[0].message.content,
        lesson: lesson.choices[0].message.content,
        vision: vision.choices[0].message.content,
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
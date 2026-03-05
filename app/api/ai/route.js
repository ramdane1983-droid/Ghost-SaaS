//Mise à jour pour activation Stripe
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const maxDuration = 60; // Important pour éviter les coupures Vercel

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const userEmail = formData.get('email');

    // 1. VÉRIFICATION DES CRÉDITS
    let { data: creditData } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (!creditData) {
      const { data: newCredit } = await supabase
        .from('credits')
        .insert([{ user_email: userEmail, credits_remaining: 3, plan: 'free' }])
        .select()
        .single();
      creditData = newCredit;
    }

    if (creditData.credits_remaining <= 0 && creditData.plan === 'free') {
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

    // 3. GÉNÉRATION 3 ANGLES (PROMPT ÉLITE)
    const systemBase = `Tu es le Ghostwriter d'élite des fondateurs SaaS B2B à succès.
Ton objectif : Transformer un transcript en une pièce d'autorité brute et clivante.
- Pas d'introduction polie.
- Phrases courtes. Rythme saccadé. Impact maximum.
- Utilise le "Je".
- Un saut de ligne entre chaque phrase.
STRUCTURE : Accroche choc > Preuve concrète du transcript > Conseil actionnable > Question ouverte.`;

    const [rant, lesson, vision] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\nAngle: RANT (Provocateur, brutal, contre-courant).` },
          { role: "user", content: `Transcript:\n${transcript}` }
        ],
        temperature: 0.9,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\nAngle: LESSON (Éducatif, étape par étape, valeur pure).` },
          { role: "user", content: `Transcript:\n${transcript}` }
        ],
        temperature: 0.7,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\nAngle: VISION (Inspirant, futur du marché, leadership).` },
          { role: "user", content: `Transcript:\n${transcript}` }
        ],
        temperature: 0.8,
      }),
    ]);

    // 4. DÉCRÉMENTER LES CRÉDITS
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
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

    if (!userEmail) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    // 1. RÉCUPÉRATION OU CRÉATION (LE CADEAU DE BIENVENUE)
    let { data: creditData } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    // SI NOUVEL UTILISATEUR : On crée ses 3 essais gratuits direct en base
    if (!creditData) {
      const { data: newUser, error: createError } = await supabase
        .from('credits')
        .insert([{ 
          user_email: userEmail, 
          credits_remaining: 3, 
          plan: 'Starter' 
        }])
        .select()
        .single();
      
      if (createError) throw createError;
      creditData = newUser;
    }

    // 2. VÉRIFICATION DES CRÉDITS RESTANTS
    if (creditData.credits_remaining <= 0) {
      // C'est seulement ICI qu'on déclenche Stripe
      return NextResponse.json({ error: 'UPGRADE_REQUIRED' }, { status: 402 });
    }

    // 3. LOGIQUE IA (Transcription + Ghostwriting)
    let transcript = "Test sans audio";
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Tu es GhostSaaS.ai. Ton style est tranchant, direct, sans gras. Narratif SaaS B2B." },
        { role: "user", content: `Transforme ce transcript en autorité :\n${transcript}` }
      ],
    });

    // 4. DÉBIT DU CRÉDIT ET RÉPONSE
    const { error: updateError } = await supabase
      .from('credits')
      .update({ credits_remaining: creditData.credits_remaining - 1 })
      .eq('user_email', userEmail);

    return NextResponse.json({
      text: completion.choices[0].message.content,
      credits_remaining: creditData.credits_remaining - 1
    });

  } catch (error) {
    console.error('Crash API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
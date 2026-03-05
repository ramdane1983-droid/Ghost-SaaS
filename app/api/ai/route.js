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

    if (!userEmail) return NextResponse.json({ error: 'Email manquant' }, { status: 400 });

    let { data: creditData } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

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
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 });
    }

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Tu es GhostSaaS.ai, un Ghostwriter d'élite pour fondateurs SaaS B2B. Style direct et percutant." },
        { role: "user", content: `Transforme ce transcript :\n${transcript}` }
      ],
    });

    const { error: updateError } = await supabase
      .from('credits')
      .update({ credits_remaining: creditData.credits_remaining - 1 })
      .eq('user_email', userEmail);

    if (updateError) throw updateError;

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
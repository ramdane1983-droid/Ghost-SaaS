import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const userEmail = formData.get('email');

    // 1. VÉRIFICATION DES CRÉDITS
    let { data: creditData, error: creditError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // Si l'utilisateur n'existe pas encore → on lui crée 3 crédits
    if (!creditData) {
      const { data: newCredit } = await supabase
        .from('credits')
        .insert([{ user_email: userEmail, credits_remaining: 3, plan: 'free' }])
        .select()
        .single();
      creditData = newCredit;
    }

    // Si 0 crédits → on bloque
    if (creditData.credits_remaining <= 0 && creditData.plan === 'free') {
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 });
    }

    // 2. TRANSCRIPTION WHISPER
    let transcript = "";
    if (file) {
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
      });
      transcript = transcription.text;
    }

    // 3. GÉNÉRATION 3 ANGLES
    const [rant, lesson, vision] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Elite ghostwriter for B2B SaaS founders. Write a RANT. Brutal, provocative, contrarian. One sentence per line. Zero emojis." },
          { role: "user", content: `Transform into LinkedIn RANT: ${transcript}` }
        ],
        temperature: 0.9,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Elite ghostwriter for B2B SaaS founders. Write a LESSON. Educational, actionable, clear. Make the founder look smart." },
          { role: "user", content: `Transform into LinkedIn LESSON: ${transcript}` }
        ],
        temperature: 0.7,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Elite ghostwriter for B2B SaaS founders. Write a VISION. Bold, forward-thinking, inspiring. Make them look visionary." },
          { role: "user", content: `Transform into LinkedIn VISION: ${transcript}` }
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
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
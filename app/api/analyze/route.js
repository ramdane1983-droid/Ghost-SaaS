import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEwOTUzNiwiZXhwIjoyMDg3Njg1NTM2fQ.Z2WF1be5gp00z1w5wtZppv4832m8RKws-87Ju4pw1rM"
);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const userEmail = formData.get('email');

    if (!userEmail) {
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    // 1. VÉRIFICATION DES CRÉDITS
    let { data: creditData, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    console.log('Credit fetch:', JSON.stringify(creditData), JSON.stringify(fetchError));

    if (!creditData) {
      const { data: newCredit, error: insertError } = await supabase
        .from('credits')
        .insert([{ user_email: userEmail, credits_remaining: 3, plan: 'free' }])
        .select()
        .single();

      console.log('Credit insert:', JSON.stringify(newCredit), JSON.stringify(insertError));

      if (insertError || !newCredit) {
        return NextResponse.json({
          error: 'Impossible de créer les crédits: ' + (insertError?.message || 'null result'),
        }, { status: 500 });
      }

      creditData = newCredit;
    }

    if (creditData.credits_remaining <= 0) {
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 });
    }

    // 2. TRANSCRIPTION WHISPER
    let transcript = "";
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioFile = new File([buffer], 'audio.mp4', { type: 'video/mp4' });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      transcript = transcription.text;
    }

    // 3. GÉNÉRATION 3 ANGLES
    const systemBase = `You are an elite ghostwriter for B2B SaaS founders on LinkedIn.
Your posts are viral, authentic, and position the founder as an authority.
Rules:
- One sentence per line maximum
- Short punchy paragraphs
- No emojis
- No hashtags
- Hook must stop the scroll in the first line
- End with a question or strong CTA
- Write in first person as the founder`;

    const [rant, lesson, vision] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\n\nWrite a RANT angle. Brutal, provocative, contrarian. Challenge the status quo.` },
          { role: "user", content: `Transform this transcript into a LinkedIn RANT post:\n\n${transcript}` }
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\n\nWrite a LESSON angle. Educational, actionable, step-by-step insight.` },
          { role: "user", content: `Transform this transcript into a LinkedIn LESSON post:\n\n${transcript}` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\n\nWrite a VISION angle. Bold, forward-thinking, inspiring. Paint a picture of the future.` },
          { role: "user", content: `Transform this transcript into a LinkedIn VISION post:\n\n${transcript}` }
        ],
        temperature: 0.8,
        max_tokens: 500,
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
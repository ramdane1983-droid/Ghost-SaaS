import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY
);

export const maxDuration = 60;

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

    // 2. TRANSCRIPTION WHISPER (audio + vidéo)
    let transcript = "";
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileName = file.name || 'audio.mp4';
      const mimeType = file.type || 'audio/mp4';

      const blob = new Blob([buffer], { type: mimeType });
      const audioFile = new File([blob], fileName, { type: mimeType });

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
          { role: "system", content: `${systemBase}\n\nWrite a RANT angle. Brutal, provocative, contrarian. Challenge the status quo. Make people uncomfortable in a good way.` },
          { role: "user", content: `Transform this transcript into a LinkedIn RANT post:\n\n${transcript}` }
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\n\nWrite a LESSON angle. Educational, actionable, step-by-step insight. Make the founder look brilliant and generous.` },
          { role: "user", content: `Transform this transcript into a LinkedIn LESSON post:\n\n${transcript}` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `${systemBase}\n\nWrite a VISION angle. Bold, forward-thinking, inspiring. Paint a picture of the future. Make the founder look visionary.` },
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
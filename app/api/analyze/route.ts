import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { fileUrl, email } = await req.json();
    if (!fileUrl || !email) {
      return NextResponse.json({ error: 'Missing fileUrl or email' }, { status: 400 });
    }

    // 1. Vérifier les crédits dans la table CREDITS
    let { data: user } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('credits')
        .insert([{ user_email: email, credits_remaining: 3, plan: 'free' }])
        .select()
        .single();
      if (insertError) throw new Error('Failed to create user: ' + insertError.message);
      user = newUser;
    }

    if (!user) throw new Error('User creation failed');

    // 2. Bloquer si free et plus de crédits
    if (user.plan !== 'pro' && user.credits_remaining <= 0) {
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 200 });
    }

    // 3. Télécharger le fichier
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to fetch file from storage');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Détecter l'extension
    const urlParts = fileUrl.split('.');
    const ext = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4', 'mov': 'video/mp4',
      'mp3': 'audio/mpeg', 'wav': 'audio/wav',
      'm4a': 'audio/mp4', 'webm': 'audio/webm',
    };
    const mimeType = mimeTypes[ext] || 'audio/mpeg';
    const fileName = `audio.${ext === 'mov' ? 'mp4' : ext}`;

    // 5. Transcrire avec Whisper
    const file = new File([buffer], fileName, { type: mimeType });
    const transcription = await openai.audio.transcriptions.create({
      file, model: 'whisper-1', language: 'fr',
    });
    const transcript = transcription.text;

    // 6. Générer 3 angles avec GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a world-class LinkedIn ghostwriter for SaaS founders. 
Generate 3 distinct strategic LinkedIn post angles from the transcript.
Respond ONLY with valid JSON, no markdown, no backticks.
Format: {"rant": "post text", "lesson": "post text", "vision": "post text"}
RANT: Provocative, contrarian, challenges conventional wisdom. Start with a bold statement.
LESSON: Educational, actionable, teaches something specific. Use numbered insights.
VISION: Inspirational, future-focused, paints a picture of what's possible.
Each post: 150-250 words, LinkedIn-optimized, engaging hook, no hashtags.`
        },
        { role: 'user', content: `Transform this transcript into 3 LinkedIn angles:\n\n${transcript}` }
      ],
      temperature: 0.8, max_tokens: 2000,
    });

    const raw = completion.choices[0].message.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const angles = JSON.parse(clean);

    // 7. Décrémenter les crédits seulement si FREE
    if (user.plan !== 'pro') {
      await supabase
        .from('credits')
        .update({ credits_remaining: user.credits_remaining - 1 })
        .eq('user_email', email);
    }

    return NextResponse.json({
      transcript,
      angles,
      credits_remaining: user.plan === 'pro' ? 999 : user.credits_remaining - 1,
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
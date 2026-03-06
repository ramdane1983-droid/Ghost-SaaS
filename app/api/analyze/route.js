import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEwOTUzNiwiZXhwIjoyMDg3Njg1NTM2fQ.Z2WF1be5gp00z1w5wtZppv4832m8RKws-87Ju4pw1rM"
);

export async function POST(req) {
  try {
    const { fileUrl, email } = await req.json();

    if (!fileUrl || !email) {
      return NextResponse.json({ error: 'Missing fileUrl or email' }, { status: 400 });
    }

    // 1. Vérifier les crédits
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ email, credits: 3 }])
        .select()
        .single();

      if (insertError) throw new Error('Failed to create user: ' + insertError.message);
      user = newUser;
    }

    if (!user) throw new Error('User creation failed');

    if (user.credits <= 0 && !user.is_pro) {
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 200 });
    }

    // 2. Télécharger le fichier depuis Supabase Storage
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to fetch file from storage');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Détecter l'extension
    const urlParts = fileUrl.split('.');
    const ext = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();

    const mimeTypes = {
      'mp4': 'video/mp4',
      'mov': 'video/mp4',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'webm': 'audio/webm',
    };

    const mimeType = mimeTypes[ext] || 'audio/mpeg';
    const fileName = `audio.${ext === 'mov' ? 'mp4' : ext}`;

    // 4. Créer un File object pour Whisper
    const file = new File([buffer], fileName, { type: mimeType });

    // 5. Transcrire avec Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'fr',
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
        {
          role: 'user',
          content: `Transform this transcript into 3 LinkedIn angles:\n\n${transcript}`
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const raw = completion.choices[0].message.content;
    const clean = raw.replace(/```json|```/g, '').trim();
    const angles = JSON.parse(clean);

    // 7. Décrémenter les crédits
    if (!user.is_pro) {
      await supabase
        .from('users')
        .update({ credits: user.credits - 1 })
        .eq('email', email);
    }

    return NextResponse.json({
      transcript,
      angles,
      credits_remaining: user.is_pro ? 999 : user.credits - 1,
    });

  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
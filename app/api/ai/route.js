import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ----------------------------- ENV CHECK ----------------------------- */

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL");
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_KEY");
}

/* ----------------------------- CLIENTS ----------------------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ----------------------------- API ----------------------------- */

export async function POST(req) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const email = formData.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "EMAIL_REQUIRED" },
        { status: 400 }
      );
    }

    /* ------------------ CHECK USER CREDITS ------------------ */

    let { data: credits } = await supabase
      .from("credits")
      .select("*")
      .eq("user_email", email)
      .maybeSingle();

    if (!credits) {
      const { data } = await supabase
        .from("credits")
        .insert([
          {
            user_email: email,
            credits_remaining: 3,
            plan: "free",
          },
        ])
        .select()
        .single();

      credits = data;
    }

    if (credits.credits_remaining <= 0) {
      return NextResponse.json(
        { error: "NO_CREDITS" },
        { status: 402 }
      );
    }

    /* ------------------ AUDIO TRANSCRIPTION ------------------ */

    let transcript = "";

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());

      const transcription =
        await openai.audio.transcriptions.create({
          file: buffer,
          model: "whisper-1",
        });

      transcript = transcription.text;
    }

    /* ------------------ GPT ANALYSIS ------------------ */

    const ai = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content:
            "Tu es GhostSaaS.ai. Analyse les idées et reformule de façon directe et percutante.",
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const output = ai.output_text;

    /* ------------------ UPDATE CREDITS ------------------ */

    await supabase
      .from("credits")
      .update({
        credits_remaining: credits.credits_remaining - 1,
      })
      .eq("user_email", email);

    /* ------------------ RESPONSE ------------------ */

    return NextResponse.json({
      transcript,
      text: output,
      credits_remaining: credits.credits_remaining - 1,
    });
  } catch (error) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
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

    // 1. RECHERCHE DE L'UTILISATEUR
    let { data: creditData, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    // 2. SI INEXISTANT : TENTATIVE DE CRÉATION AVEC LOG D'ERREUR
    if (!creditData) {
      console.log("Tentative de création pour:", userEmail);
      const { data: newEntry, error: insertError } = await supabase
        .from('credits')
        .insert([{ 
          user_email: userEmail, 
          credits_remaining: 3, 
          plan: 'free' 
        }])
        .select()
        .single();
      
      if (insertError) {
        // C'EST ICI QUE ÇA COINCE SUREMENT
        console.error("ERREUR SUPABASE INSERTION:", insertError);
        return NextResponse.json({ error: `Erreur base de données: ${insertError.message}` }, { status: 500 });
      }
      creditData = newEntry;
    }

    // 3. VÉRIFICATION FINALE AVANT UTILISATION
    if (!creditData) {
      return NextResponse.json({ error: "Impossible de créer ou trouver l'utilisateur" }, { status: 500 });
    }

    if (creditData.credits_remaining <= 0) {
      return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 });
    }

    // ... (Le reste du code transcription/IA est identique)
    // Assure-toi de bien garder la fin du code avec le bloc 'return NextResponse.json'
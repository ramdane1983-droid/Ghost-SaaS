import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  try {
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email;

      // On active le plan Pro (20 crédits par exemple)
      await supabase
        .from('credits')
        .update({ plan: 'pro', credits_remaining: 20 })
        .eq('user_email', email);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
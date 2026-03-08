import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.CheckoutSession;
      const email = session.customer_email || session.customer_details?.email;

      console.log('📧 Email reçu:', email);

      if (!email) {
        return NextResponse.json({ error: 'No email found' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('credits')
        .update({ plan: 'pro', credits_remaining: 999 })
        .eq('user_email', email)
        .select();

      console.log('✅ Supabase data:', JSON.stringify(data));
      console.log('❌ Supabase error:', JSON.stringify(error));
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
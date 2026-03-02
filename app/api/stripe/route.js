import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { email } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'GhostSaaS Growth',
              description: 'Unlimited authority content for B2B SaaS Founders',
            },
            unit_amount: 29900,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/dashboard?upgraded=true',
      cancel_url: 'http://localhost:3000/dashboard',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
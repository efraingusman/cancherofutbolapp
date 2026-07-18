// Webhook MercadoPago — activa la suscripción cuando llega 'approved'
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();

  try {
    const { type, data } = req.body || {};
    if(type !== 'payment' || !data?.id) return res.status(200).json({ ok:true });

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers:{ 'Authorization':`Bearer ${token}` }
    });
    const payment = await r.json();
    if(payment.status !== 'approved') return res.status(200).json({ ok:true, status: payment.status });

    const ref = payment.external_reference || '';
    const [email, tier] = ref.split('|');
    if(!email || !tier) return res.status(400).json({ error:'No external_reference' });

    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const expires = new Date(); expires.setMonth(expires.getMonth()+1);

    await supa.from('subscriptions').insert([{
      user_email: email, tier, amount: payment.transaction_amount,
      starts_at: new Date().toISOString(), expires_at: expires.toISOString(),
      status:'active', payment_ref: String(payment.id)
    }]);
    await supa.from('users').update({
      sub_tier: tier, sub_status:'active',
      sub_expires_at: expires.toISOString(), role: tier
    }).eq('email', email);

    return res.status(200).json({ ok:true });
  } catch(e){
    return res.status(500).json({ error: e.message });
  }
}

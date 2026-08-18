// Vercel serverless function — crea preferencia de pago en MercadoPago
// Requiere env var MERCADOPAGO_ACCESS_TOKEN en Vercel.
// Si no está, devuelve error y el cliente cae al modo DEMO.

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if(!token){
    return res.status(200).json({ error:'MercadoPago no configurado (falta MERCADOPAGO_ACCESS_TOKEN en Vercel)' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { tier, amount, email, name } = body || {};

    if(!tier || !amount || !email) return res.status(400).json({ error:'Faltan datos' });

    const preference = {
      items: [{
        title: `Canchero — Suscripción ${tier.toUpperCase()}`,
        description: `Plan mensual ${tier}`,
        quantity: 1,
        currency_id: 'UYU',
        unit_price: Number(amount)
      }],
      payer: { email, name },
      back_urls: {
        success: `https://cancherofutbolapp.vercel.app/?payment=success&tier=${tier}`,
        pending: `https://cancherofutbolapp.vercel.app/?payment=pending`,
        failure: `https://cancherofutbolapp.vercel.app/?payment=failure`
      },
      auto_return: 'approved',
      external_reference: `${email}|${tier}|${Date.now()}`,
      notification_url: `https://cancherofutbolapp.vercel.app/api/payment-webhook`
    };

    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify(preference)
    });
    const data = await r.json();
    if(!r.ok) return res.status(500).json({ error: data.message || 'Error MercadoPago' });

    return res.status(200).json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      preference_id: data.id
    });
  } catch(e){
    return res.status(500).json({ error: e.message });
  }
}

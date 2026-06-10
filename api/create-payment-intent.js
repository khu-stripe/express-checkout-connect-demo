const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { amount, currency = "usd" } = req.body;
  const connectedAccountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    on_behalf_of: connectedAccountId,
    automatic_payment_methods: { enabled: true },
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
};

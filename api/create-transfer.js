const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { amount, currency = "usd", paymentIntentId } = req.body;
  const connectedAccountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const chargeId = paymentIntent.latest_charge;

  const transfer = await stripe.transfers.create({
    amount,
    currency,
    destination: connectedAccountId,
    source_transaction: chargeId,
  });

  res.json({ transferId: transfer.id });
};

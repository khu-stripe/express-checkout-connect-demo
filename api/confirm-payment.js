const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { confirmationTokenId, amount, currency = "usd" } = req.body;
  const connectedAccountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    on_behalf_of: connectedAccountId,
    confirmation_token: confirmationTokenId,
    confirm: true,
    automatic_payment_methods: { enabled: true },
    return_url: `${req.headers.origin || "https://localhost"}/option2.html`,
  });

  const response = {
    status: paymentIntent.status,
    paymentIntentId: paymentIntent.id,
  };

  if (paymentIntent.status === "requires_action") {
    response.clientSecret = paymentIntent.client_secret;
    return res.json(response);
  }

  if (paymentIntent.status === "succeeded") {
    const chargeId = paymentIntent.latest_charge;
    const transfer = await stripe.transfers.create({
      amount,
      currency,
      destination: connectedAccountId,
      source_transaction: chargeId,
    });
    response.transferId = transfer.id;
  }

  res.json(response);
};

require("dotenv").config();
const express = require("express");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const CONNECTED_ACCOUNT_ID = process.env.STRIPE_CONNECTED_ACCOUNT_ID;

app.get("/api/config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    connectedAccountId: CONNECTED_ACCOUNT_ID,
  });
});

// Option 1: Create PaymentIntent (client-side confirmation)
app.post("/api/create-payment-intent", async (req, res) => {
  const { amount, currency = "usd" } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    on_behalf_of: CONNECTED_ACCOUNT_ID,
    automatic_payment_methods: { enabled: true },
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
});

// Option 1: Create Transfer after payment succeeds
app.post("/api/create-transfer", async (req, res) => {
  const { amount, currency = "usd", paymentIntentId } = req.body;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const chargeId = paymentIntent.latest_charge;

  const transfer = await stripe.transfers.create({
    amount,
    currency,
    destination: CONNECTED_ACCOUNT_ID,
    source_transaction: chargeId,
  });

  res.json({ transferId: transfer.id });
});

// Option 2: 2-Step Confirmation (server-side)
app.post("/api/confirm-payment", async (req, res) => {
  const { confirmationTokenId, amount, currency = "usd" } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    on_behalf_of: CONNECTED_ACCOUNT_ID,
    confirmation_token: confirmationTokenId,
    confirm: true,
    automatic_payment_methods: { enabled: true },
    return_url: `http://localhost:${process.env.PORT || 4242}/option2.html`,
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
      destination: CONNECTED_ACCOUNT_ID,
      source_transaction: chargeId,
    });
    response.transferId = transfer.id;
  }

  res.json(response);
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

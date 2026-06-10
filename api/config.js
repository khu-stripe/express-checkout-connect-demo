module.exports = (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    connectedAccountId: process.env.STRIPE_CONNECTED_ACCOUNT_ID,
  });
};

# Express Checkout Connect Demo

A demo app showcasing Stripe's Express Checkout Element with **Separate Charges & Transfers** using `on_behalf_of`.

**Live demo:** https://nodejs-self-seven.vercel.app

## Architecture

```
Customer → Express Checkout Element → Platform (PaymentIntent with on_behalf_of)
                                          ↓
                                    Transfer → Connected Account
```

## Two Integration Options

| | Option 1: Client-side Confirm | Option 2: 2-Step Confirmation |
|---|---|---|
| **PaymentIntent creation** | Upfront, before customer interacts | Deferred until after customer confirms |
| **Confirmation** | Client-side via `stripe.confirmPayment()` | Server-side via `confirm: true` + `confirmation_token` |
| **Transfer** | Triggered by frontend after success | Created by backend in the same call |
| **Best for** | Simple flows | When you need server-side control before confirming |

## Setup

### Prerequisites

- Node.js 18+
- A Stripe account with a connected account

### Local Development

```bash
cp .env.example .env
# Edit .env with your Stripe keys

npm install
npm start
```

Open http://localhost:4242

### Environment Variables

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Your platform's secret key (`sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Your platform's publishable key (`pk_test_...`) |
| `STRIPE_CONNECTED_ACCOUNT_ID` | The connected account ID (`acct_...`) |
| `PORT` | Server port (default: 4242) |

### Deploy to Vercel

```bash
vercel --prod
```

Set environment variables in the Vercel dashboard or via CLI:

```bash
printf 'sk_test_xxx' | vercel env add STRIPE_SECRET_KEY production
printf 'pk_test_xxx' | vercel env add STRIPE_PUBLISHABLE_KEY production
printf 'acct_xxx' | vercel env add STRIPE_CONNECTED_ACCOUNT_ID production
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Returns publishable key and connected account ID |
| POST | `/api/create-payment-intent` | Creates a PaymentIntent with `on_behalf_of` |
| POST | `/api/create-transfer` | Creates a Transfer linked to the charge |
| POST | `/api/confirm-payment` | Creates + confirms PaymentIntent server-side, then transfers |

## Key Concepts

- **`on_behalf_of`** — Makes the connected account the business of record (their statement descriptor appears on the customer's card statement)
- **Separate Charges & Transfers** — Platform collects payment, then explicitly transfers funds to the connected account
- **`source_transaction`** — Links the transfer to the original charge, ensuring fund availability
- **ConfirmationToken** — Allows collecting payment details client-side while confirming server-side

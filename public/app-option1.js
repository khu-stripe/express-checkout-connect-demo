const AMOUNT = 2500;

let stripe;
let elements;
let paymentIntentId;
let connectedAccountId;

async function initialize() {
    const configResponse = await fetch("/api/config");
    const { publishableKey, connectedAccountId: acctId } = await configResponse.json();
    connectedAccountId = acctId;
    stripe = Stripe(publishableKey);

    const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: AMOUNT, currency: "usd" }),
    });
    const { clientSecret, paymentIntentId: piId } = await response.json();
    paymentIntentId = piId;

    elements = stripe.elements({
        mode: "payment",
        amount: AMOUNT,
        currency: "usd",
        onBehalfOf: connectedAccountId,
        appearance: { theme: "stripe" },
    });

    const expressCheckoutElement = elements.create("expressCheckout", {
        paymentMethods: {
            applePay: "always",
            googlePay: "always",
            link: "never",
        },
        buttonType: {
            applePay: "buy",
            googlePay: "buy",
        },
    });
    expressCheckoutElement.mount("#express-checkout-element");

    expressCheckoutElement.on("confirm", async (event) => {
        const { error } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: { return_url: window.location.href },
            redirect: "if_required",
        });

        if (error) {
            showMessage(error.message, "error");
        } else {
            showMessage("Payment successful! Creating transfer...", "success");
            await createTransfer();
        }
    });
}

async function createTransfer() {
    try {
        const response = await fetch("/api/create-transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: AMOUNT,
                currency: "usd",
                paymentIntentId: paymentIntentId,
            }),
        });
        const { transferId } = await response.json();
        showMessage(
            `Payment complete! Transfer ${transferId} created to connected account.`,
            "success"
        );
    } catch (err) {
        showMessage("Payment succeeded but transfer failed: " + err.message, "error");
    }
}

function showMessage(text, type) {
    const msgEl = document.getElementById("message");
    msgEl.textContent = text;
    msgEl.className = type;
}

async function checkStatus() {
    const clientSecret = new URLSearchParams(window.location.search).get(
        "payment_intent_client_secret"
    );
    if (!clientSecret) return;

    const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
    if (paymentIntent.status === "succeeded") {
        showMessage("Payment succeeded! (returned from redirect)", "success");
    }
}

initialize();
checkStatus();

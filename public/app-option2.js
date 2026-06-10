const AMOUNT = 2500;

let stripe;
let elements;
let connectedAccountId;

async function initialize() {
    const configResponse = await fetch("/api/config");
    const { publishableKey, connectedAccountId: acctId } = await configResponse.json();
    connectedAccountId = acctId;
    stripe = Stripe(publishableKey);

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
        const { error: tokenError, confirmationToken } =
            await stripe.createConfirmationToken({ elements });

        if (tokenError) {
            showMessage(tokenError.message, "error");
            return;
        }

        try {
            const response = await fetch("/api/confirm-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    confirmationTokenId: confirmationToken.id,
                    amount: AMOUNT,
                    currency: "usd",
                }),
            });
            const result = await response.json();

            if (result.error) {
                showMessage(result.error, "error");
                return;
            }

            if (result.status === "requires_action") {
                const { error: actionError } = await stripe.handleNextAction({
                    clientSecret: result.clientSecret,
                });
                if (actionError) {
                    showMessage(actionError.message, "error");
                } else {
                    showMessage("Payment successful! Transfer created.", "success");
                }
            } else if (result.status === "succeeded") {
                showMessage(
                    `Payment successful! Transfer ${result.transferId} created to connected account.`,
                    "success"
                );
            } else {
                showMessage(`Unexpected status: ${result.status}`, "error");
            }
        } catch (err) {
            showMessage("Payment failed: " + err.message, "error");
        }
    });
}

function showMessage(text, type) {
    const msgEl = document.getElementById("message");
    msgEl.textContent = text;
    msgEl.className = type;
}

initialize();

const AMOUNT = 2500;

let stripe;
let elements;
let connectedAccountId;

async function initialize() {
    logEvent("init", "Fetching config...");

    const configResponse = await fetch("/api/config");
    const { publishableKey, connectedAccountId: acctId } = await configResponse.json();
    connectedAccountId = acctId;
    stripe = Stripe(publishableKey);
    logEvent("stripe.init", { publishableKey: publishableKey.slice(0, 20) + "...", connectedAccountId });

    elements = stripe.elements({
        mode: "payment",
        amount: AMOUNT,
        currency: "usd",
        onBehalfOf: connectedAccountId,
        appearance: { theme: "stripe" },
    });
    logEvent("elements.created", "Deferred mode — no PaymentIntent yet");

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
        layout: {
            overflow: false,
        },
    });
    expressCheckoutElement.mount("#express-checkout-element");
    logEvent("element.mounted", "expressCheckout element mounted");

    expressCheckoutElement.on("ready", (event) => {
        logEvent("element.ready", event);
    });

    expressCheckoutElement.on("click", (event) => {
        logEvent("element.click", { resolvedPaymentMethods: event.expressPaymentType });
        event.resolve();
    });

    expressCheckoutElement.on("cancel", () => {
        logEvent("element.cancel", "User cancelled the payment sheet");
    });

    expressCheckoutElement.on("shippingaddresschange", (event) => {
        logEvent("element.shippingaddresschange", event.address);
    });

    expressCheckoutElement.on("shippingratechange", (event) => {
        logEvent("element.shippingratechange", event.shippingRate);
    });

    expressCheckoutElement.on("confirm", async (event) => {
        logEvent("element.confirm", { expressPaymentType: event.expressPaymentType, billingDetails: event.billingDetails });

        logEvent("stripe.createConfirmationToken", "Creating confirmation token...");
        const { error: tokenError, confirmationToken } =
            await stripe.createConfirmationToken({ elements });

        if (tokenError) {
            logEvent("confirmationToken.error", { code: tokenError.code, message: tokenError.message });
            showMessage(tokenError.message, "error");
            return;
        }

        logEvent("confirmationToken.created", { id: confirmationToken.id });

        try {
            logEvent("api.confirm-payment", "Sending token to backend...");
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
                logEvent("api.confirm-payment.error", { error: result.error });
                showMessage(result.error, "error");
                return;
            }

            logEvent("api.confirm-payment.response", { status: result.status, paymentIntentId: result.paymentIntentId });

            if (result.status === "requires_action") {
                logEvent("stripe.handleNextAction", "Handling 3DS authentication...");
                const { error: actionError } = await stripe.handleNextAction({
                    clientSecret: result.clientSecret,
                });
                if (actionError) {
                    logEvent("handleNextAction.error", { message: actionError.message });
                    showMessage(actionError.message, "error");
                } else {
                    logEvent("handleNextAction.success", "Authentication complete");
                    showMessage("Payment successful! Transfer created.", "success");
                }
            } else if (result.status === "succeeded") {
                logEvent("payment.succeeded", { transferId: result.transferId });
                showMessage(
                    `Payment successful! Transfer ${result.transferId} created to connected account.`,
                    "success"
                );
            } else {
                logEvent("payment.unexpected", { status: result.status });
                showMessage(`Unexpected status: ${result.status}`, "error");
            }
        } catch (err) {
            logEvent("api.error", { message: err.message });
            showMessage("Payment failed: " + err.message, "error");
        }
    });

    expressCheckoutElement.on("loaderror", (event) => {
        logEvent("element.loaderror", event.error);
    });
}

function showMessage(text, type) {
    const msgEl = document.getElementById("message");
    msgEl.textContent = text;
    msgEl.className = type;
}

initialize();

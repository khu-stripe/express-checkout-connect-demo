const AMOUNT = 2500;

let stripe;
let elements;
let paymentIntentId;
let connectedAccountId;

function logEvent(name, data) {
    const log = document.getElementById("event-log");
    const entry = document.createElement("div");
    entry.className = "event-entry";
    const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });
    let html = `<span class="event-time">${time}</span> <span class="event-name">${name}</span>`;
    if (data) {
        const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        html += `<pre class="event-data">${json}</pre>`;
    }
    entry.innerHTML = html;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

async function initialize() {
    logEvent("init", "Fetching config...");

    const configResponse = await fetch("/api/config");
    const { publishableKey, connectedAccountId: acctId } = await configResponse.json();
    connectedAccountId = acctId;
    stripe = Stripe(publishableKey);
    logEvent("stripe.init", { publishableKey: publishableKey.slice(0, 20) + "...", connectedAccountId });

    const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: AMOUNT, currency: "usd" }),
    });
    const { clientSecret, paymentIntentId: piId } = await response.json();
    paymentIntentId = piId;
    logEvent("paymentIntent.created", { paymentIntentId, amount: AMOUNT, currency: "usd" });

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
    logEvent("element.mounted", "expressCheckout element mounted");

    expressCheckoutElement.on("ready", (event) => {
        logEvent("element.ready", event);
    });

    expressCheckoutElement.on("click", (event) => {
        logEvent("element.click", { resolvedPaymentMethods: event.expressPaymentType });
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

        logEvent("stripe.confirmPayment", "Confirming payment client-side...");
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: { return_url: window.location.href },
            redirect: "if_required",
        });

        if (error) {
            logEvent("stripe.confirmPayment.error", { code: error.code, message: error.message });
            showMessage(error.message, "error");
        } else {
            logEvent("stripe.confirmPayment.success", { status: paymentIntent?.status });
            showMessage("Payment successful! Creating transfer...", "success");
            await createTransfer();
        }
    });

    expressCheckoutElement.on("loaderror", (event) => {
        logEvent("element.loaderror", event.error);
    });
}

async function createTransfer() {
    logEvent("transfer.creating", { amount: AMOUNT, paymentIntentId });
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
        logEvent("transfer.created", { transferId });
        showMessage(
            `Payment complete! Transfer ${transferId} created to connected account.`,
            "success"
        );
    } catch (err) {
        logEvent("transfer.error", { message: err.message });
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
    logEvent("redirect.return", { status: paymentIntent.status });
    if (paymentIntent.status === "succeeded") {
        showMessage("Payment succeeded! (returned from redirect)", "success");
    }
}

initialize();
checkStatus();

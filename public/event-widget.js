(function () {
    const style = document.createElement("style");
    style.textContent = `
        .ew-fab {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #635bff;
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 12px rgba(99,91,255,0.4);
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .ew-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 20px rgba(99,91,255,0.5);
        }
        .ew-fab .ew-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #e53e3e;
            color: white;
            font-size: 10px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
        }
        .ew-panel {
            position: fixed;
            bottom: 76px;
            left: 20px;
            width: 380px;
            max-height: 320px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            z-index: 99;
            display: none;
            flex-direction: column;
            overflow: hidden;
        }
        .ew-panel.open { display: flex; }
        .ew-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f0;
            flex-shrink: 0;
        }
        .ew-panel-header h3 {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
            color: #32325d;
        }
        .ew-panel-header button {
            background: none;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 3px 8px;
            font-size: 11px;
            color: #525f7f;
            cursor: pointer;
        }
        .ew-panel-header button:hover { background: #f6f9fc; }
        #event-log {
            flex: 1;
            overflow-y: auto;
            padding: 6px 0;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 11px;
        }
        .event-entry {
            padding: 4px 14px;
            border-bottom: 1px solid #f8f8f8;
        }
        .event-entry:hover { background: #fafbfc; }
        .event-time {
            color: #8898aa;
            margin-right: 6px;
        }
        .event-name {
            color: #635bff;
            font-weight: 600;
        }
        .event-data {
            margin: 3px 0 0 0;
            padding: 5px 8px;
            background: #f6f9fc;
            border-radius: 4px;
            font-size: 10px;
            color: #525f7f;
            white-space: pre-wrap;
            word-break: break-all;
        }
        @media (max-width: 480px) {
            .ew-panel {
                width: calc(100vw - 32px);
                left: 16px;
                bottom: 72px;
            }
        }
    `;
    document.head.appendChild(style);

    const fab = document.createElement("button");
    fab.className = "ew-fab";
    fab.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span class="ew-badge" style="display:none">0</span>`;
    document.body.appendChild(fab);

    const panel = document.createElement("div");
    panel.className = "ew-panel";
    panel.innerHTML = `
        <div class="ew-panel-header">
            <h3>Stripe.js Events</h3>
            <button id="ew-clear">Clear</button>
        </div>
        <div id="event-log"></div>
    `;
    document.body.appendChild(panel);

    let eventCount = 0;
    let isOpen = false;
    const badge = fab.querySelector(".ew-badge");

    fab.addEventListener("click", () => {
        isOpen = !isOpen;
        panel.classList.toggle("open", isOpen);
        if (isOpen) {
            badge.style.display = "none";
            eventCount = 0;
        }
    });

    document.getElementById("ew-clear").addEventListener("click", () => {
        document.getElementById("event-log").innerHTML = "";
        eventCount = 0;
        badge.style.display = "none";
    });

    window.logEvent = function (name, data) {
        const log = document.getElementById("event-log");
        const entry = document.createElement("div");
        entry.className = "event-entry";
        const time = new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
        });
        let html = `<span class="event-time">${time}</span><span class="event-name">${name}</span>`;
        if (data) {
            const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
            html += `<pre class="event-data">${json}</pre>`;
        }
        entry.innerHTML = html;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;

        if (!isOpen) {
            eventCount++;
            badge.textContent = eventCount > 99 ? "99+" : eventCount;
            badge.style.display = "flex";
        }
    };
})();

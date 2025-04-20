(() => {
    const origin = location.origin;
    const todayISO = new Date().toISOString().split("T")[0];

    /* ─── helpers ───────────────────────────────────────────── */
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const waitFor = (fn, ttl = 3000, step = 50) =>
        new Promise((r) => {
            const t0 = Date.now();
            (function loop() {
                const v = fn();
                if (v || Date.now() - t0 > ttl) return r(v || null);
                setTimeout(loop, step);
            })();
        });

    function prettyCourse(raw) {
        if (!raw) return "Other";
        raw = raw.replace(/^Calendar:\s*/i, "");
        const idx = Math.max(raw.lastIndexOf(" - "), raw.lastIndexOf(":"));
        if (idx !== -1) raw = raw.slice(idx + (raw[idx] === ":" ? 1 : 3));
        return raw
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const iconFor = (i) => (i?.classList.contains("icon-quiz") ? "🔼" : "⏫");

    async function extractLink(a) {
        a.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true })
        );

        const link = await waitFor(() =>
            document.querySelector(".view_event_link")
        );
        const href = link?.href || "";

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        return href;
    }

    /* ─── collector ─────────────────────────────────────────── */
    async function collect() {
        const buckets = {};

        const bars = [
            ...document.querySelectorAll("a.fc-day-grid-event"),
        ].filter((a) => {
            const icon = a.querySelector("i");
            if (
                !icon ||
                !(
                    icon.classList.contains("icon-assignment") ||
                    icon.classList.contains("icon-quiz")
                )
            )
                return false;

            const td = a.closest("td");
            const col = [...td.parentElement.children].indexOf(td);
            const date = td
                .closest("table")
                ?.querySelector(`thead td:nth-child(${col + 1})`)?.dataset.date;
            return date && date >= todayISO;
        });

        for (const bar of bars) {
            const title =
                bar.getAttribute("title")?.trim() ||
                bar.querySelector(".fc-title")?.textContent.trim() ||
                "Untitled";

            const td = bar.closest("td");
            const col = [...td.parentElement.children].indexOf(td);
            const date = td
                .closest("table")
                ?.querySelector(`thead td:nth-child(${col + 1})`)?.dataset.date;

            const href = await extractLink(bar);
            const course = prettyCourse(
                bar.querySelector(".screenreader-only")?.textContent
            );

            const done = !!bar.querySelector(".calendar__event--completed");
            const line = `${done ? "- [x]" : "- [ ]"} ${iconFor(
                bar.querySelector("i")
            )} [${title}](${href}) 📅 ${date}`;
            (buckets[course] ??= []).push({ date, line });
        }

        /* TODO: extra ESC to be sure nothing is left open */
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

        const out = [];
        Object.keys(buckets)
            .sort()
            .forEach((course) => {
                out.push(`# ${course}`);
                buckets[course]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .forEach(({ line }) => out.push(line));
                out.push("");
            });
        return out;
    }

    /* ─── bridge to popup.js ────────────────────────────────── */
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.action === "getCanvasAssignments") {
            (async () => {
                try {
                    sendResponse({ data: await collect() });
                } catch (e) {
                    console.error("[Canvas Sync]", e);
                    sendResponse({ data: [] });
                }
            })();
            return true; // keep channel open
        }
    });

    console.log("[Canvas Sync] content.js ready ✅");
})();

(() => {
    const todayISO = new Date().toISOString().split("T")[0];

    /* ----- helpers ----- */
    function prettyCourse(raw) {
        if (!raw) return "Other";
        raw = raw.replace(/^Calendar:\s*/i, "").trim();

        const lastColon = raw.lastIndexOf(":");
        const lastDash = raw.lastIndexOf(" - ");
        const idx = Math.max(lastColon, lastDash);
        if (idx !== -1) raw = raw.slice(idx + 1);

        return raw
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const iconFor = (i) => (i?.classList.contains("icon-quiz") ? "🔼" : "⏫");

    /* ----- core ----- */
    function collect() {
        console.log("[Canvas Sync] Starting collection…");

        const buckets = {}; // course → [{date, line}, …]

        document.querySelectorAll("a.fc-day-grid-event").forEach((a) => {
            // column position in current <tr>
            const td = a.closest("td");
            if (!td) return;
            const col = [...td.parentElement.children].indexOf(td);

            // find the matching date header cell for that column
            const table = td.closest("table");
            const headerCell = table?.querySelector(
                `thead td:nth-child(${col + 1})`
            );
            const date = headerCell?.dataset.date;
            if (!date || date < todayISO) return; // past items skipped

            // accept only assignments / quizzes
            const icon = a.querySelector("i");
            if (
                !icon ||
                !(
                    icon.classList.contains("icon-assignment") ||
                    icon.classList.contains("icon-quiz")
                )
            )
                return;

            const title =
                a.getAttribute("title")?.trim() ||
                a.querySelector(".fc-title")?.textContent.trim() ||
                "Untitled";

            const href = a.href;
            const course = prettyCourse(
                a.querySelector(".screenreader-only")?.textContent
            );

            const done = !!a.querySelector(".calendar__event--completed");
            const check = done ? "- [x]" : "- [ ]";
            const glyph = iconFor(icon);

            const line = `${check} ${glyph} [${title}](${href}) 📅 ${date}`;
            (buckets[course] ??= []).push({ date, line });
        });

        /* ----- format buckets → markdown ----- */
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

    /* ----- listener for popup.js ----- */
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.action === "getCanvasAssignments") {
            try {
                sendResponse({ data: collect() });
            } catch (e) {
                console.error("[Canvas Sync] extraction error", e);
                sendResponse({ data: [] });
            }
        }
        return false; // synchronous response
    });

    console.log("[Canvas Sync] content.js loaded ✅");
})();

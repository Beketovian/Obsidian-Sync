document.getElementById("grab").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const url = new URL(tab.url);
        console.log("[Canvas Sync] Current URL:", url.href);

        // check to make sure on canvas and on calendar
        if (
            !url.hostname.includes("canvas") ||
            !url.pathname.includes("calendar")
        ) {
            document.getElementById("output").value =
                "❌ Please go to your Canvas Calendar page.\n" +
                "Current URL: " +
                url.href +
                "\n" +
                "Example: https://canvas.tamu.edu/calendar";
            return;
        }

        // we good, send message
        chrome.tabs.sendMessage(
            tab.id,
            { action: "getCanvasAssignments" },
            (res) => {
                if (chrome.runtime.lastError) {
                    console.error(
                        "[Canvas Sync] Runtime error:",
                        chrome.runtime.lastError
                    );
                    document.getElementById("output").value =
                        "❌ Could not connect to Canvas page. Error: " +
                        chrome.runtime.lastError.message;
                    return;
                }

                if (res && res.data && res.data.length > 0) {
                    document.getElementById("output").value =
                        res.data.join("\n");
                } else {
                    document.getElementById("output").value =
                        "No assignments found 😢\n" +
                        "Please check the browser console for more details.";
                }
            }
        );
    });
});

document.getElementById("copy").addEventListener("click", () => {
    const output = document.getElementById("output");
    output.select();
    document.execCommand("copy");

    const copyButton = document.getElementById("copy");
    const originalText = copyButton.textContent;
    copyButton.textContent = "Copied!";
    setTimeout(() => {
        copyButton.textContent = originalText;
    }, 2000);
});

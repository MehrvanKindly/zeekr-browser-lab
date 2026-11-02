/* The parent verifies this exact frame as the sender. No native messages. */
window.parent.postMessage({ type: "browser-lab-sandbox-ready-v1" }, "*");


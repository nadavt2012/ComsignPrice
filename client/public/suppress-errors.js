window.addEventListener("error", function(e) { if (e.message.includes("ResizeObserver")) { e.preventDefault(); e.stopPropagation(); } });

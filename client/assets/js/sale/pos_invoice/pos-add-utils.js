// Utility helpers extracted from pos-add
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function openOverlay(url) {
    const modal = document.getElementById('overlayModal');
    const iframe = document.getElementById('overlayIframe');
    if (!modal || !iframe) return;
    iframe.src = url;
    modal.style.display = 'flex';
}

export function closeOverlay() {
    const modal = document.getElementById('overlayModal');
    const iframe = document.getElementById('overlayIframe');
    if (!modal || !iframe) return;
    modal.style.display = 'none';
    iframe.src = '';

    // Reload data after closing overlay (best-effort)
    if (typeof loadCustomers === 'function') loadCustomers();
    if (typeof loadProducts === 'function') loadProducts();
}

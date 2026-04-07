// Calculation helpers for POS (invoice summary helpers)
export function safeNum(v) {
    return Number(v) || 0;
}

export function format2(v) {
    return (Number(v) || 0).toFixed(2);
}

// A small helper to recalc invoice totals by delegating to existing DOM-anchored functions
export function recalcInvoiceSummary() {
    if (typeof updateInvoiceSummaryDynamic === 'function') {
        updateInvoiceSummaryDynamic();
    }
}

export default { safeNum, format2, recalcInvoiceSummary };

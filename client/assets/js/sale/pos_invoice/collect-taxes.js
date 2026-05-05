// Collect invoice-level taxes from DOM
function collectInvoiceTaxes() {
    const taxes = [];
    
    if (!window.invoiceLevelTaxRegimes || window.invoiceLevelTaxRegimes.length === 0) {
        console.log('collectInvoiceTaxes: No tax regimes found');
        return taxes;
    }
    
    // Ensure taxes are calculated before collecting
    if (typeof calculateInvoiceLevelTaxes === 'function') {
        console.log('collectInvoiceTaxes: Recalculating taxes before collection');
        calculateInvoiceLevelTaxes();
    }
    
    // Get net amount from the summary display
    const netAmountEl = document.getElementById('netAmount');
    const finalNetAmount = parseFloat(netAmountEl?.textContent) || 0;
    
    console.log('collectInvoiceTaxes: Using net amount from summary =', finalNetAmount);
    
    window.invoiceLevelTaxRegimes.forEach(regime => {
        const ratePercentage = parseFloat(regime.rate_percentage) || 0;
        
        // Get tax amount from DOM element
        const amountEl = document.getElementById(`invoiceTax_${regime.id}_amount`);
        let taxAmount = 0;
        
        if (amountEl) {
            taxAmount = parseFloat(amountEl.textContent) || 0;
            console.log(`collectInvoiceTaxes: Tax regime ${regime.id} (${regime.regime_name}): amount = ${taxAmount}`);
        } else {
            // If element doesn't exist, calculate it
            taxAmount = finalNetAmount * (ratePercentage / 100);
            console.log(`collectInvoiceTaxes: Tax regime ${regime.id} (${regime.regime_name}): calculated = ${taxAmount}`);
        }
        
        // Only include if tax amount > 0
        if (taxAmount > 0 || ratePercentage > 0) {
            taxes.push({
                taxRegimeId: regime.id,
                taxRateId: null,
                taxName: regime.regime_name,
                ratePercentage: ratePercentage,
                baseAmount: finalNetAmount,
                taxAmount: taxAmount
            });
        }
    });
    
    console.log('collectInvoiceTaxes: Final collected taxes:', taxes);
    return taxes;
}

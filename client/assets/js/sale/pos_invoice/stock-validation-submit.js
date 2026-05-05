// Add stock validation check before form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('invoiceForm');
    if (!form) return;
    
    // Override form submission with validation
    form.addEventListener('submit', async function(e) {
        // Check if validateAllRowsStock function exists
        if (typeof validateAllRowsStock !== 'function') {
            console.error('Stock validation function not available');
            return;
        }
        
        // Validate stock before saving
        const allValid = await validateAllRowsStock();
        
        if (!allValid) {
            e.preventDefault();
            e.stopPropagation();
            alert('Cannot save invoice: Stock is insufficient for one or more items. Please check the stock details above.');
            return false;
        }
        
        // If stock validation passes, allow form to submit normally
        // Don't prevent default - let the original handler proceed
    }, true); // Use capture phase (true) so it runs BEFORE the original handler
});

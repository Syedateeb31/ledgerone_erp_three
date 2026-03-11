$(document).ready(function() {
    if (EXPENSE_ID) {
        loadExpenseDetails();
    } else {
        $('#expenseDetails').html('<div style="text-align:center; padding:32px; color:#DC2626;">Invalid expense ID</div>');
    }
});

function loadExpenseDetails() {
    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php?action=view&id=${EXPENSE_ID}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                displayExpenseDetails(response.data);
            } else {
                $('#expenseDetails').html('<div style="text-align:center; padding:32px; color:#DC2626;">Expense not found</div>');
            }
        },
        error: function() {
            $('#expenseDetails').html('<div style="text-align:center; padding:32px; color:#DC2626;">Error loading expense details</div>');
        }
    });
}

function displayExpenseDetails(expense) {
    const date = new Date(expense.created_at).toLocaleDateString();
    const typeBadge = expense.expense_type === 'Direct' ? 'badge-direct' : 'badge-indirect';
    const reference = expense.reference_table ? `${expense.reference_table} #${expense.reference_id}` : 'N/A';
    
    // Build accounts table
    let accountsTable = '';
    let total = 0;
    if (expense.accounts && expense.accounts.length > 0) {
        accountsTable = `
            <div class="detail-item full-width" style="margin-top: 24px;">
                <div class="detail-label">Expense Accounts</div>
                <table style="width:100%; border-collapse: collapse; margin-top: 12px; border: 1px solid #E5E7EB;">
                    <thead style="background: #F9FAFB;">
                        <tr>
                            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB;">Account</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid #E5E7EB;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        expense.accounts.forEach(acc => {
            total += parseFloat(acc.amount);
            accountsTable += `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${acc.expense_account_name}</td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #E5E7EB;">${parseFloat(acc.amount).toFixed(2)}</td>
                        </tr>`;
        });
        
        accountsTable += `
                    </tbody>
                    <tfoot style="background: #F9FAFB;">
                        <tr>
                            <td style="padding: 12px; font-weight: 600; text-align: right; border-top: 2px solid #D1D5DB;">Total:</td>
                            <td style="padding: 12px; font-weight: 600; text-align: right; border-top: 2px solid #D1D5DB;">${total.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>`;
    }
    
    const html = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Expense Number</div>
                <div class="detail-value"><strong>${expense.expense_number}</strong></div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Date</div>
                <div class="detail-value">${date}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Production Order</div>
                <div class="detail-value">${expense.order_no}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Product</div>
                <div class="detail-value">${expense.product_name}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Production Order Total Cost</div>
                <div class="detail-value">${parseFloat(expense.production_order_total_cost || 0).toFixed(2)}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Expense Type</div>
                <div class="detail-value"><span class="badge ${typeBadge}">${expense.expense_type}</span></div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">Reference</div>
                <div class="detail-value">${reference}</div>
            </div>
            
            ${expense.notes ? `
            <div class="detail-item full-width">
                <div class="detail-label">Notes</div>
                <div class="detail-value">${expense.notes}</div>
            </div>
            ` : ''}
            
            ${accountsTable}
        </div>
    `;
    
    $('#expenseDetails').html(html);
}

let allExpenses = [];

$(document).ready(function() {
    loadExpenses();
    
    $('#searchInput').on('keyup', filterExpenses);
    $('#typeFilter').on('change', filterExpenses);
});

function loadExpenses() {
    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php?action=list`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                allExpenses = response.data;
                displayExpenses(allExpenses);
            } else {
                $('#expensesTable').html('<tr><td colspan="10" style="text-align:center; padding:32px; color:#6B7280;">No expenses found</td></tr>');
            }
        },
        error: function() {
            $('#expensesTable').html('<tr><td colspan="10" style="text-align:center; padding:32px; color:#DC2626;">Error loading expenses</td></tr>');
        }
    });
}

function filterExpenses() {
    const searchTerm = $('#searchInput').val().toLowerCase();
    const typeFilter = $('#typeFilter').val();
    
    let filtered = allExpenses.filter(expense => {
        const matchesSearch = !searchTerm || 
            expense.expense_number.toLowerCase().includes(searchTerm) ||
            expense.order_no.toLowerCase().includes(searchTerm) ||
            expense.product_name.toLowerCase().includes(searchTerm) ||
            expense.expense_account_name.toLowerCase().includes(searchTerm);
        
        const matchesType = !typeFilter || expense.expense_type === typeFilter;
        
        return matchesSearch && matchesType;
    });
    
    displayExpenses(filtered);
}

function displayExpenses(expenses) {
    if (expenses.length === 0) {
        $('#expensesTable').html('<tr><td colspan="10" style="text-align:center; padding:32px; color:#6B7280;">No expenses found</td></tr>');
        return;
    }

    let html = '';
    expenses.forEach(expense => {
        const date = new Date(expense.created_at).toLocaleDateString();
        const typeBadge = expense.expense_type === 'Direct' ? 'badge-direct' : 'badge-indirect';
        const reference = expense.reference_table ? `${expense.reference_table} #${expense.reference_id}` : '-';
        
        html += `
            <tr>
                <td><strong>${expense.expense_number}</strong></td>
                <td>${date}</td>
                <td>${expense.order_no}</td>
                <td>${parseFloat(expense.production_order_total_cost || 0).toFixed(2)}</td>
                <td>${expense.product_name}</td>
                <td>${expense.expense_account_name}</td>
                <td><span class="badge ${typeBadge}">${expense.expense_type}</span></td>
                <td>${parseFloat(expense.total_amount).toFixed(2)}</td>
                <td>${reference}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-view" onclick="viewExpense(${expense.id})" title="View">
                            <i class="las la-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="editExpense(${expense.id})" title="Edit">
                            <i class="las la-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteExpense(${expense.id})" title="Delete">
                            <i class="las la-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    $('#expensesTable').html(html);
}

function viewExpense(id) {
    window.location.href = `view.php?id=${id}`;
}

function editExpense(id) {
    window.location.href = `edit.php?id=${id}`;
}

function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }

    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php`,
        method: 'POST',
        data: JSON.stringify({ action: 'delete', id: id }),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                alert('Expense deleted successfully');
                loadExpenses();
            } else {
                alert('Error: ' + (response.message || 'Failed to delete expense'));
            }
        },
        error: function() {
            alert('Error deleting expense');
        }
    });
}

let expenseAccounts = [];

$(document).ready(function() {
    $('#productionOrderId').select2({
        placeholder: 'Select Production Order',
        allowClear: true,
        width: '100%'
    }).on('change', function() {
        const orderId = $(this).val();
        if (orderId) {
            loadProductionOrderTotalCost(orderId);
        } else {
            $('#productionOrderTotalCost').val('');
        }
    });

    if (EXPENSE_ID) {
        loadExpenseData();
    }

    loadProductionOrders();
    loadExpenseAccounts();

    $('#addExpenseRow').on('click', function(e) {
        e.preventDefault();
        addExpenseRow();
    });
    
    $(document).on('click', '.remove-row', function(e) {
        e.preventDefault();
        removeExpenseRow.call(this);
    });
    
    $(document).on('input', '.expense-amount', calculateTotal);

    $('#updateBtn').on('click', updateExpense);
    $('#cancelBtn').on('click', () => window.location.href = 'list.php');
});

function loadProductionOrders() {
    $.ajax({
        url: `../../../../server/api/manufacturing/production_order/index.php?action=list`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const select = $('#productionOrderId');
                select.empty().append('<option value="">Select Production Order</option>');
                response.data.forEach(order => {
                    select.append(`<option value="${order.id}">${order.order_no} - ${order.product_name}</option>`);
                });
            }
        }
    });
}

function loadProductionOrderTotalCost(orderId) {
    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php?action=get_order_total_cost&order_id=${orderId}`,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                $('#productionOrderTotalCost').val(response.total_cost);
            }
        }
    });
}

function loadExpenseAccounts() {
    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php?action=get_expense_accounts`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                expenseAccounts = response.data;
                updateExpenseAccountDropdowns();
            }
        }
    });
}

function updateExpenseAccountDropdowns() {
    $('.expense-account').each(function() {
        const currentVal = $(this).val();
        $(this).empty().append('<option value="">Select Expense Account</option>');
        expenseAccounts.forEach(account => {
            $(this).append(`<option value="${account.id}">${account.name}</option>`);
        });
        if (currentVal) $(this).val(currentVal);
    });
}

function addExpenseRow() {
    const row = `
        <tr class="expense-row">
            <td>
                <select class="form-control expense-account" required>
                    <option value="">Select Expense Account</option>
                </select>
            </td>
            <td>
                <input type="number" class="form-control expense-amount" step="0.01" required>
            </td>
            <td>
                <button type="button" class="btn-icon btn-delete remove-row" title="Remove">
                    <i class="las la-trash"></i>
                </button>
            </td>
        </tr>
    `;
    $('#expenseItemsBody').append(row);
    updateExpenseAccountDropdowns();
}

function removeExpenseRow() {
    if ($('.expense-row').length > 1) {
        $(this).closest('tr').remove();
        calculateTotal();
    } else {
        alert('At least one expense item is required');
    }
}

function calculateTotal() {
    let total = 0;
    $('.expense-amount').each(function() {
        const val = parseFloat($(this).val()) || 0;
        total += val;
    });
    $('#totalAmount').text(total.toFixed(2));
}

function loadExpenseData() {
    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php?action=view&id=${EXPENSE_ID}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const expense = response.data;
                $('#expenseNumber').val(expense.expense_number);
                $('#productionOrderTotalCost').val(expense.production_order_total_cost || '0.00');
                $('#expenseType').val(expense.expense_type);
                $('#referenceTable').val(expense.reference_table || '');
                $('#referenceId').val(expense.reference_id || '');
                $('#notes').val(expense.notes || '');
                
                setTimeout(() => {
                    $('#productionOrderId').val(expense.production_order_id).trigger('change');
                }, 500);
                
                // Load expense accounts
                if (expense.accounts && expense.accounts.length > 0) {
                    $('#expenseItemsBody').empty();
                    expense.accounts.forEach(acc => {
                        const row = `
                            <tr class="expense-row">
                                <td>
                                    <select class="form-control expense-account" required>
                                        <option value="">Select Expense Account</option>
                                    </select>
                                </td>
                                <td>
                                    <input type="number" class="form-control expense-amount" step="0.01" value="${acc.amount}" required>
                                </td>
                                <td>
                                    <button type="button" class="btn-icon btn-delete remove-row" title="Remove">
                                        <i class="las la-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                        $('#expenseItemsBody').append(row);
                    });
                    
                    setTimeout(() => {
                        $('.expense-account').each(function(index) {
                            $(this).val(expense.accounts[index].expense_account_id);
                        });
                        calculateTotal();
                    }, 100);
                }
            } else {
                alert('Expense not found');
                window.location.href = 'list.php';
            }
        },
        error: function() {
            alert('Error loading expense data');
            window.location.href = 'list.php';
        }
    });
}

function updateExpense() {
    const productionOrderId = $('#productionOrderId').val();

    if (!productionOrderId) {
        alert('Please select a production order');
        return;
    }

    const expenseItems = [];
    let isValid = true;

    $('.expense-row').each(function() {
        const accountId = $(this).find('.expense-account').val();
        const amount = $(this).find('.expense-amount').val();

        if (!accountId || !amount) {
            isValid = false;
            return false;
        }

        expenseItems.push({
            expense_account_id: accountId,
            amount: amount
        });
    });

    if (!isValid) {
        alert('Please fill all expense items');
        return;
    }

    const data = {
        action: 'update',
        id: EXPENSE_ID,
        production_order_id: productionOrderId,
        production_order_total_cost: $('#productionOrderTotalCost').val(),
        expense_type: $('#expenseType').val(),
        reference_table: $('#referenceTable').val(),
        reference_id: $('#referenceId').val(),
        notes: $('#notes').val(),
        expense_items: expenseItems
    };

    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php`,
        method: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.success) {
                alert('Expense updated successfully');
                window.location.href = 'list.php';
            } else {
                alert('Error: ' + (response.message || 'Failed to update expense'));
            }
        },
        error: function() {
            alert('Error updating expense');
        }
    });
}

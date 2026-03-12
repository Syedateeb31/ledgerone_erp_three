let expenseAccounts = [];

$(document).ready(function() {
    console.log('Script loaded');
    
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

    loadExpenseNumber();
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
    
    $('#saveBtn').on('click', function(e) {
        e.preventDefault();
        saveExpense();
    });
    
    $('#cancelBtn').on('click', function(e) {
        e.preventDefault();
        window.location.href = 'list.php';
    });
});

function loadExpenseNumber() {
    $.ajax({
        url: `../../../../server/api/manufacturing/production_expenses/index.php?action=get_next_number`,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                $('#expenseNumber').val(response.expense_number);
            }
        }
    });
}

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

function saveExpense() {
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
        action: 'create',
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
                alert('Expense saved successfully');
                window.location.href = 'list.php';
            } else {
                alert('Error: ' + (response.message || 'Failed to save expense'));
            }
        },
        error: function() {
            alert('Error saving expense');
        }
    });
}

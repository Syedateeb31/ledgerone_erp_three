let refreshInterval;

$(document).ready(function() {
    setDefaultDates();
    loadData();
    
    refreshInterval = setInterval(loadData, 5000);
    
    $('#dateFrom, #dateTo').on('change', loadData);
    
    $('.btn-filter').on('click', function() {
        $('.btn-filter').removeClass('active');
        $(this).addClass('active');
        
        const filter = $(this).data('filter');
        applyQuickFilter(filter);
    });
});

function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    $('#dateFrom').val(formatDate(firstDay));
    $('#dateTo').val(formatDate(today));
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function applyQuickFilter(filter) {
    const today = new Date();
    let fromDate, toDate = today;
    
    switch(filter) {
        case 'week':
            fromDate = new Date(today);
            fromDate.setDate(today.getDate() - today.getDay());
            break;
        case 'month':
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            fromDate = new Date(today.getFullYear(), quarter * 3, 1);
            break;
        case 'year':
            fromDate = new Date(today.getFullYear(), 0, 1);
            break;
    }
    
    $('#dateFrom').val(formatDate(fromDate));
    $('#dateTo').val(formatDate(toDate));
    loadData();
}

function loadData() {
    const dateFrom = $('#dateFrom').val();
    const dateTo = $('#dateTo').val();
    
    $('.stat-card').addClass('loading');
    
    $.ajax({
        url: '../../../../server/api/financial_reports/financial_summary/financial_summary.php',
        method: 'GET',
        data: { date_from: dateFrom, date_to: dateTo },
        success: function(response) {
            if (response.success) {
                updateCards(response.data);
            } else {
                console.error('API Error:', response.message);
            }
            $('.stat-card').removeClass('loading');
        },
        error: function(xhr, status, error) {
            console.error('AJAX Error:', error);
            console.error('Response:', xhr.responseText);
            $('.stat-card').removeClass('loading');
        }
    });
}

function updateCards(data) {
    updateCard('daily-sales', data.daily_sales, data.daily_sales_change);
    updateCard('total-sales', data.total_sales, data.total_sales_change);
    updateCard('daily-purchase', data.daily_purchase, data.daily_purchase_change);
    updateCard('total-purchase', data.total_purchase, data.total_purchase_change);
    updateCard('daily-sale-return', data.daily_sale_return, data.daily_sale_return_change);
    updateCard('total-sale-return', data.total_sale_return, data.total_sale_return_change);
    updateCard('daily-purchase-return', data.daily_purchase_return, data.daily_purchase_return_change);
    updateCard('total-purchase-return', data.total_purchase_return, data.total_purchase_return_change);
    updateCard('daily-recovery', data.daily_recovery, data.daily_recovery_change);
    updateCard('total-recovery', data.total_recovery, data.total_recovery_change);
    updateCard('daily-payment', data.daily_payment, data.daily_payment_change);
    updateCard('total-payment', data.total_payment, data.total_payment_change);
    updateCard('daily-expenses', data.daily_expenses, data.daily_expenses_change);
    updateCard('total-expenses', data.total_expenses, data.total_expenses_change);
    updateCard('daily-cash', data.daily_cash, data.daily_cash_change);
    updateCard('total-cash', data.total_cash, data.total_cash_change);
    updateCard('daily-bank', data.daily_bank, data.daily_bank_change);
    updateCard('total-bank', data.total_bank, data.total_bank_change);
    updateCard('daily-cheque', data.daily_cheque, data.daily_cheque_change);
    updateCard('total-cheque', data.total_cheque, data.total_cheque_change);
}

function updateCard(type, amount, change) {
    const card = $(`.stat-card[data-type="${type}"]`);
    const isDaily = type.includes('daily');
    const compareText = isDaily ? 'from yesterday' : 'from last month';
    
    card.find('.amount').text(parseFloat(amount || 0).toFixed(2));
    
    const changePercent = parseFloat(change || 0);
    const changeClass = changePercent >= 0 ? 'positive' : 'negative';
    
    card.find('.change')
        .removeClass('positive negative')
        .addClass(changeClass)
        .html(`<span class="percent">${Math.abs(changePercent).toFixed(1)}%</span> ${compareText}`);
}

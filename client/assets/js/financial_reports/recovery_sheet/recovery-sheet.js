// Add interactivity to the recovery sheet report
document.addEventListener('DOMContentLoaded', function () {
    // Load data on page load
    loadCompanies();
    loadRecoveryData();

    // Print Report button functionality
    const printBtn = document.querySelector('.fa-print')?.closest('.btn');
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            const dateFrom = document.querySelectorAll('input[type="date"]')[0]?.value;
            const dateTo = document.querySelectorAll('input[type="date"]')[1]?.value;
            const recoveryOfficer = document.querySelector('#recoveryOfficer')?.value;
            const countryId = document.querySelector('#countryFilter')?.value;
            const regionId = document.querySelector('#regionFilter')?.value;
            const cityId = document.querySelector('#cityFilter')?.value;
            const cityZoneId = document.querySelector('#cityZoneFilter')?.value;
            const areaId = document.querySelector('#areaFilter')?.value;
            
            let url = `print.php?date_from=${dateFrom}&date_to=${dateTo}`;
            if (recoveryOfficer && recoveryOfficer !== 'all') url += `&recovery_officer_id=${recoveryOfficer}`;
            if (countryId && countryId !== 'all') url += `&country_id=${countryId}`;
            if (regionId && regionId !== 'all') url += `&region_id=${regionId}`;
            if (cityId && cityId !== 'all') url += `&city_id=${cityId}`;
            if (cityZoneId && cityZoneId !== 'all') url += `&city_zone_id=${cityZoneId}`;
            if (areaId && areaId !== 'all') url += `&area_id=${areaId}`;
            if (companyId) url += `&company_id=${companyId}`;
            
            window.open(url, '_blank');
        });
    }

    // Filter button functionality
    const filterBtn = document.querySelector('.fa-filter')?.closest('.btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function () {
            loadRecoveryData();
        });
    }

    // Refresh Data button functionality
    const refreshBtn = document.querySelector('.fa-sync-alt')?.closest('.btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            // Reload data with current filters (soft reload)
            loadRecoveryData();
        });
    }

    // Export CSV button functionality
    const exportBtn = document.querySelector('.fa-file-export')?.closest('.btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            exportToCSV();
        });
    }

    // Reset Filters button in footer
    const resetFiltersBtn = document.querySelector('#resetFiltersBtn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function () {
            document.querySelectorAll('input[type="date"]')[0].value = '';
            document.querySelectorAll('input[type="date"]')[1].value = '';
            $('#recoveryOfficer').val('all').trigger('change');
            $('#countryFilter').val('all').trigger('change');
            $('#regionFilter').val('all').trigger('change').prop('disabled', true);
            $('#cityFilter').val('all').trigger('change').prop('disabled', true);
            $('#cityZoneFilter').val('all').trigger('change').prop('disabled', true);
            $('#areaFilter').val('all').trigger('change').prop('disabled', true);
            $('#companyFilter').val('').trigger('change');
            
            const tbody = document.querySelector('tbody');
            if (tbody) tbody.innerHTML = '';
            
            const summaryValue = document.querySelector('.summary-value');
            if (summaryValue) summaryValue.textContent = currencySymbol + '0.00';
        });
    }

    // Date inputs - set default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs[0]) dateInputs[0].value = formatDate(firstDay);
    if (dateInputs[1]) dateInputs[1].value = formatDate(lastDay);

    // Initialize Select2 on all select dropdowns
    $('#recoveryOfficer, #countryFilter, #regionFilter, #cityFilter, #cityZoneFilter, #areaFilter, #companyFilter').select2({
        width: '100%',
        placeholder: 'Select an option'
    });

    // Load companies
    async function loadCompanies() {
        try {
            const response = await fetch('../../../../server/api/financial_reports/recovery_sheet/get-companies.php');
            const result = await response.json();
            
            if (result.success) {
                $('#companyFilter').empty().append('<option value="">All Companies</option>');
                result.data.forEach(company => {
                    $('#companyFilter').append(`<option value="${company.id}">${company.company_name}</option>`);
                });
                
                if (result.data.length === 1) {
                    $('#companyFilter').val(result.data[0].id).trigger('change');
                }
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }

    // Add company filter change event
    $('#companyFilter').on('change', function() {
        loadRecoveryData();
    });

    // Territory filter cascading
    const countryFilter = document.getElementById('countryFilter');
    const regionFilter = document.getElementById('regionFilter');
    const cityFilter = document.getElementById('cityFilter');
    const cityZoneFilter = document.getElementById('cityZoneFilter');
    const areaFilter = document.getElementById('areaFilter');

    $('#countryFilter').on('change', function() {
        const countryId = this.value;
        $('#regionFilter').empty().append('<option value="all">All Regions</option>');
        $('#cityFilter').empty().append('<option value="all">All Cities</option>');
        $('#cityZoneFilter').empty().append('<option value="all">All Zones</option>');
        $('#areaFilter').empty().append('<option value="all">All Areas</option>');
        
        if (countryId === 'all') {
            $('#regionFilter').prop('disabled', true).trigger('change');
            $('#cityFilter').prop('disabled', true).trigger('change');
            $('#cityZoneFilter').prop('disabled', true).trigger('change');
            $('#areaFilter').prop('disabled', true).trigger('change');
            return;
        }
        
        fetch(`../../../../server/api/financial_reports/recovery_sheet/get-regions.php?country_id=${countryId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.data.forEach(region => {
                        $('#regionFilter').append(`<option value="${region.id}">${region.region_name}</option>`);
                    });
                    $('#regionFilter').prop('disabled', false).trigger('change');
                }
            });
    });

    $('#regionFilter').on('change', function() {
        const regionId = this.value;
        $('#cityFilter').empty().append('<option value="all">All Cities</option>');
        $('#cityZoneFilter').empty().append('<option value="all">All Zones</option>');
        $('#areaFilter').empty().append('<option value="all">All Areas</option>');
        
        if (regionId === 'all') {
            $('#cityFilter').prop('disabled', true).trigger('change');
            $('#cityZoneFilter').prop('disabled', true).trigger('change');
            $('#areaFilter').prop('disabled', true).trigger('change');
            return;
        }
        
        fetch(`../../../../server/api/financial_reports/recovery_sheet/get-cities.php?region_id=${regionId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.data.forEach(city => {
                        $('#cityFilter').append(`<option value="${city.id}">${city.city_name}</option>`);
                    });
                    $('#cityFilter').prop('disabled', false).trigger('change');
                }
            });
    });

    $('#cityFilter').on('change', function() {
        const cityId = this.value;
        $('#cityZoneFilter').empty().append('<option value="all">All Zones</option>');
        $('#areaFilter').empty().append('<option value="all">All Areas</option>');
        
        if (cityId === 'all') {
            $('#cityZoneFilter').prop('disabled', true).trigger('change');
            $('#areaFilter').prop('disabled', true).trigger('change');
            return;
        }
        
        fetch(`../../../../server/api/financial_reports/recovery_sheet/get-city-zones.php?city_id=${cityId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.data.forEach(zone => {
                        $('#cityZoneFilter').append(`<option value="${zone.id}">${zone.city_zone_name}</option>`);
                    });
                    $('#cityZoneFilter').prop('disabled', false).trigger('change');
                }
            });
    });

    $('#cityZoneFilter').on('change', function() {
        const zoneId = this.value;
        $('#areaFilter').empty().append('<option value="all">All Areas</option>');
        
        if (zoneId === 'all') {
            $('#areaFilter').prop('disabled', true).trigger('change');
            return;
        }
        
        fetch(`../../../../server/api/financial_reports/recovery_sheet/get-areas.php?city_zone_id=${zoneId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.data.forEach(area => {
                        $('#areaFilter').append(`<option value="${area.id}">${area.area_name}</option>`);
                    });
                    $('#areaFilter').prop('disabled', false).trigger('change');
                }
            });
    });

    function loadRecoveryData() {
        const dateFrom = document.querySelectorAll('input[type="date"]')[0]?.value;
        const dateTo = document.querySelectorAll('input[type="date"]')[1]?.value;
        const recoveryOfficer = document.querySelector('#recoveryOfficer')?.value;
        const countryId = document.querySelector('#countryFilter')?.value;
        const regionId = document.querySelector('#regionFilter')?.value;
        const cityId = document.querySelector('#cityFilter')?.value;
        const cityZoneId = document.querySelector('#cityZoneFilter')?.value;
        const areaId = document.querySelector('#areaFilter')?.value;
        const companyId = document.querySelector('#companyFilter')?.value;

        const refreshBtn = document.querySelector('.fa-sync-alt')?.closest('.btn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            refreshBtn.disabled = true;
        }

        let url = `../../../../server/api/financial_reports/recovery_sheet/recovery-sheet.php?date_from=${dateFrom}&date_to=${dateTo}`;
        if (recoveryOfficer && recoveryOfficer !== 'all') {
            url += `&recovery_officer_id=${recoveryOfficer}`;
        }
        if (countryId && countryId !== 'all') url += `&country_id=${countryId}`;
        if (regionId && regionId !== 'all') url += `&region_id=${regionId}`;
        if (cityId && cityId !== 'all') url += `&city_id=${cityId}`;
        if (cityZoneId && cityZoneId !== 'all') url += `&city_zone_id=${cityZoneId}`;
        if (areaId && areaId !== 'all') url += `&area_id=${areaId}`;
        if (companyId) url += `&company_id=${companyId}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('API Response:', data);
                if (data.success) {
                    renderTable(data.data);
                    updateSummary(data.summary);
                } else {
                    alert('Error loading data: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                alert('Error: ' + error.message);
            })
            .finally(() => {
                if (refreshBtn) {
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
                    refreshBtn.disabled = false;
                }
            });
    }

    function renderTable(customers) {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        console.log('Rendering customers:', customers);
        customers.forEach((customer, index) => {
            console.log('Customer:', customer);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${customer.bill_no || ''}</td>
                <td>${customer.customer_name}</td>
                <td>${customer.address || ''}</td>
                <td>${customer.primary_phone || ''}</td>
                <td class="${customer.current_balance > 0 ? 'balance-positive' : 'balance-negative'}">
                    ${customer.current_balance > 0 ? '' : '-'}${currencySymbol}${Math.abs(parseFloat(customer.current_balance)).toFixed(2)}
                </td>
                <td></td>
                <td></td>
                <td><div class="signature-cell"></div></td>
            `;
            tbody.appendChild(row);
        });
    }

    function updateSummary(summary) {
        const summaryValues = document.querySelectorAll('.summary-value');
        if (summaryValues[0]) summaryValues[0].textContent = `${summary.total_balance > 0 ? '' : '-'}${currencySymbol}${Math.abs(summary.total_balance).toFixed(2)}`;
        if (summaryValues[0]) summaryValues[0].className = summary.total_balance > 0 ? 'summary-value balance-positive' : 'summary-value balance-negative';
        if (summaryValues[1]) summaryValues[1].textContent = `${currencySymbol}${summary.total_received.toFixed(2)}`;
        if (summaryValues[2]) summaryValues[2].textContent = `${currencySymbol}${summary.total_returns.toFixed(2)}`;
    }

    function exportToCSV() {
        const rows = [];
        rows.push(['S#', 'Bill No', 'Customer Name', 'Address', 'Primary Phone No', 'Balance', 'Received Amount', 'Sales Return', 'Signature']);

        document.querySelectorAll('tbody tr').forEach(row => {
            const cols = row.querySelectorAll('td');
            const rowData = [];
            for (let i = 0; i < cols.length - 1; i++) {
                rowData.push(cols[i].textContent.trim());
            }
            rowData.push('');
            rows.push(rowData);
        });

        let csvContent = rows.map(e => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recovery-sheet.csv';
        a.click();
    }
});
// MFB Section Toggle
const isMfbCheckbox = document.getElementById('isMfb');
const mfbSection = document.getElementById('mfbSection');
const mfbNameInput = document.getElementById('mfbName');

isMfbCheckbox.addEventListener('change', () => {
    if (isMfbCheckbox.checked) {
        mfbSection.style.display = 'block';
        mfbNameInput.required = true;
    } else {
        mfbSection.style.display = 'none';
        mfbNameInput.required = false;
        mfbNameInput.value = '';
    }
});

// Set today's date as default for asOfDate
const today = new Date().toISOString().split('T')[0];
document.getElementById('asOfDate').value = today;

// Form Validation
const form = document.getElementById('bankAccountForm');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveDraftBtn = document.getElementById('saveDraftBtn');

// Input validation on blur
const requiredInputs = form.querySelectorAll('[required]');
requiredInputs.forEach(input => {
    input.addEventListener('blur', () => {
        validateField(input);
    });
});

function validateField(field) {
    const parent = field.parentElement;

    if (field.value.trim() === '') {
        parent.classList.add('error');
        if (!parent.querySelector('.error-message')) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'This field is required';
            parent.appendChild(errorMsg);
        }
        return false;
    } else {
        parent.classList.remove('error');
        const errorMsg = parent.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
        return true;
    }
}

// Form Submission
submitBtn.addEventListener('click', (e) => {
    e.preventDefault();

    let isValid = true;
    requiredInputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });

    if (isValid) {
        // Gather form data
        const formData = {
            bankName: document.getElementById('bankName').value,
            accountNumber: document.getElementById('accountNumber').value,
            accountTitle: document.getElementById('accountTitle').value,
            accountType: document.getElementById('accountType').value,
            isMfb: document.getElementById('isMfb').checked,
            mfbName: document.getElementById('mfbName').value,
            currency: document.getElementById('currency').value,
            branchName: document.getElementById('branchName').value,
            branchCode: document.getElementById('branchCode').value,
            branchCity: document.getElementById('branchCity').value,
            branchState: document.getElementById('branchState').value,
            branchAddress: document.getElementById('branchAddress').value,
            balanceType: document.querySelector('input[name="balanceType"]:checked').value,
            openingBalance: document.getElementById('openingBalance').value,
            asOfDate: document.getElementById('asOfDate').value,
            iban: document.getElementById('iban').value,
            swiftCode: document.getElementById('swiftCode').value,
            contactPerson: document.getElementById('contactPerson').value,
            contactNumber: document.getElementById('contactNumber').value,
            email: document.getElementById('email').value,
            notes: document.getElementById('notes').value,
            isActive: document.getElementById('isActive').checked
        };

        // Submit to API
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        fetch('../../../../server/api/banking/bank/bank-add.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Bank account created successfully!');
                form.reset();
                document.getElementById('asOfDate').value = today;
                document.getElementById('isActive').checked = true;
                mfbSection.style.display = 'none';
                mfbNameInput.required = false;
                
                // Remove error messages
                document.querySelectorAll('.error').forEach(el => {
                    el.classList.remove('error');
                    const errorMsg = el.querySelector('.error-message');
                    if (errorMsg) errorMsg.remove();
                });
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while creating the account.');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Bank Account';
        });
    } else {
        alert('Please fill in all required fields correctly.');
    }
});

// Cancel button
cancelBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        form.reset();
        document.getElementById('asOfDate').value = today;
        document.getElementById('isActive').checked = true;
        mfbSection.style.display = 'none';
        mfbNameInput.required = false;

        // Remove error messages
        document.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
            const errorMsg = el.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
    }
});

// Save as Draft button
saveDraftBtn.addEventListener('click', () => {
    // Gather form data (don't validate required fields for draft)
    const formData = {
        bankName: document.getElementById('bankName').value,
        accountNumber: document.getElementById('accountNumber').value,
        accountTitle: document.getElementById('accountTitle').value,
        accountType: document.getElementById('accountType').value,
        isMfb: document.getElementById('isMfb').checked,
        mfbName: document.getElementById('mfbName').value,
        currency: document.getElementById('currency').value,
        branchName: document.getElementById('branchName').value,
        branchCode: document.getElementById('branchCode').value,
        branchCity: document.getElementById('branchCity').value,
        branchState: document.getElementById('branchState').value,
        branchAddress: document.getElementById('branchAddress').value,
        balanceType: document.querySelector('input[name="balanceType"]:checked')?.value || 'debit',
        openingBalance: document.getElementById('openingBalance').value,
        asOfDate: document.getElementById('asOfDate').value,
        iban: document.getElementById('iban').value,
        swiftCode: document.getElementById('swiftCode').value,
        contactPerson: document.getElementById('contactPerson').value,
        contactNumber: document.getElementById('contactNumber').value,
        email: document.getElementById('email').value,
        notes: document.getElementById('notes').value,
        isActive: document.getElementById('isActive').checked,
        isDraft: true
    };

    // For draft functionality, you could add isDraft: true to formData
    // and handle it in the API
    console.log('Draft functionality not implemented yet');
    alert('Draft functionality will be implemented in future version.');
});

// Remove sample data for production
// window.addEventListener('DOMContentLoaded', () => {
//     // Sample data removed for production
// });
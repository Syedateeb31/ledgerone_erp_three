// Shared "link this Customer/Supplier to its counterpart" widget.
// Used on customer-add/edit and supplier-add/edit so the same real-world party
// can also transact as the other role (e.g. a customer we also buy from).
// Customer and Supplier stay separate records/ledgers — this only links them.
function initPartyLink(options) {
    const partyType = options.partyType; // 'customer' | 'supplier'
    const otherType = partyType === 'customer' ? 'supplier' : 'customer';
    const otherLabel = otherType === 'supplier' ? 'Supplier' : 'Customer';
    const selfLabel = partyType === 'supplier' ? 'Supplier' : 'Customer';
    const container = options.container;
    const dropdownParent = options.dropdownParent || null;
    const apiBase = options.apiBase || '../../../../server/api/customer_supplier/links';

    const uid = 'partyLink_' + Math.random().toString(36).slice(2, 8);

    container.innerHTML = `
        <div class="form-section" id="${uid}_section">
            <h3 class="section-title"><i class="fas fa-link"></i> Linked ${otherLabel}</h3>
            <div id="${uid}_notLinked">
                <div class="form-group col-12">
                    <div class="checkbox-group">
                        <input type="checkbox" id="${uid}_enable">
                        <label for="${uid}_enable"><i class="fas fa-exchange-alt"></i> This ${selfLabel} is also a ${otherLabel}</label>
                    </div>
                </div>
                <div id="${uid}_options" style="display:none;">
                    <div class="form-group col-12" style="display:flex; gap:20px; margin-bottom:12px;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:normal;">
                            <input type="radio" name="${uid}_mode" value="new" checked style="width:auto;height:auto;">
                            Create new ${otherLabel} (same details)
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:normal;">
                            <input type="radio" name="${uid}_mode" value="existing" style="width:auto;height:auto;">
                            Link to existing ${otherLabel}
                        </label>
                    </div>
                    <div class="form-group col-6" id="${uid}_existingPicker" style="display:none;">
                        <label>Select ${otherLabel}</label>
                        <select id="${uid}_existingSelect" style="width:100%;">
                            <option value="">Search ${otherLabel}...</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="${uid}_linked" style="display:none;">
                <div class="helper-text">
                    <i class="fas fa-link"></i>
                    Linked to ${otherLabel}: <strong id="${uid}_linkedName"></strong>
                    (<span id="${uid}_linkedCode"></span>)
                    <button type="button" class="btn btn-secondary btn-sm" id="${uid}_unlinkBtn" style="margin-left:12px;">
                        <i class="fas fa-unlink"></i> Unlink
                    </button>
                </div>
            </div>
        </div>
    `;

    const enableCb = document.getElementById(uid + '_enable');
    const optionsBox = document.getElementById(uid + '_options');
    const existingPicker = document.getElementById(uid + '_existingPicker');
    const existingSelect = document.getElementById(uid + '_existingSelect');
    const notLinkedBox = document.getElementById(uid + '_notLinked');
    const linkedBox = document.getElementById(uid + '_linked');
    const linkedName = document.getElementById(uid + '_linkedName');
    const linkedCode = document.getElementById(uid + '_linkedCode');
    const unlinkBtn = document.getElementById(uid + '_unlinkBtn');

    let currentPartyId = null;
    let isLinked = false;
    let existingListLoaded = false;

    enableCb.addEventListener('change', function () {
        optionsBox.style.display = this.checked ? '' : 'none';
    });

    container.querySelectorAll('input[name="' + uid + '_mode"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            const isExisting = this.value === 'existing' && this.checked;
            existingPicker.style.display = isExisting ? '' : 'none';
            if (isExisting && !existingListLoaded) {
                loadExistingOptions();
            }
        });
    });

    function loadExistingOptions() {
        existingListLoaded = true;
        fetch(`${apiBase}/search-parties.php?type=${otherType}`)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) return;
                data.parties.forEach(function (p) {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `${p.name} (${p.code})`;
                    existingSelect.appendChild(opt);
                });
                const select2Opts = { placeholder: `Search ${otherLabel}...`, allowClear: true, width: '100%' };
                if (dropdownParent) select2Opts.dropdownParent = $(dropdownParent);
                $(existingSelect).select2(select2Opts);
            })
            .catch(function () {});
    }

    function showLinkedState(party) {
        isLinked = true;
        notLinkedBox.style.display = 'none';
        linkedBox.style.display = '';
        linkedName.textContent = party.name;
        linkedCode.textContent = party.code;
    }

    function showNotLinkedState() {
        isLinked = false;
        notLinkedBox.style.display = '';
        linkedBox.style.display = 'none';
        enableCb.checked = false;
        optionsBox.style.display = 'none';
    }

    unlinkBtn.addEventListener('click', function () {
        if (!currentPartyId) return;
        if (!confirm(`Unlink this ${selfLabel} from its linked ${otherLabel}?`)) return;
        unlinkBtn.disabled = true;
        fetch(`${apiBase}/unlink.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: partyType, partyId: currentPartyId })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    showNotLinkedState();
                } else {
                    alert(data.message || 'Failed to unlink');
                }
            })
            .finally(function () { unlinkBtn.disabled = false; });
    });

    return {
        // Call when opening an edit form for an existing party, to show current link state (if any)
        loadExisting: function (partyId) {
            currentPartyId = partyId;
            return fetch(`${apiBase}/get-link.php?type=${partyType}&id=${partyId}`)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success && data.linked) {
                        showLinkedState(data.party);
                    } else {
                        showNotLinkedState();
                    }
                })
                .catch(function () {});
        },
        // Call after the main Customer/Supplier record has been saved successfully.
        // partyId: the (new or existing) customer/supplier id.
        // getSnapshot: () => { name, address, primaryPhone, secondaryPhone, email, identityCard, companyId }
        // used to auto-fill the new counterpart record when "create new" mode is chosen.
        applyLink: function (partyId, getSnapshot) {
            currentPartyId = partyId;
            if (isLinked || !enableCb.checked) {
                return Promise.resolve({ success: true, skipped: true });
            }
            const mode = container.querySelector('input[name="' + uid + '_mode"]:checked')?.value || 'new';
            const payload = { type: partyType, partyId: partyId, mode: mode };
            if (mode === 'existing') {
                payload.targetId = existingSelect.value || null;
            } else {
                payload.newParty = getSnapshot();
            }
            return fetch(`${apiBase}/link.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function (r) { return r.json(); });
        },
        // Reset the widget back to its initial (not linked) state, e.g. after an add-form reset
        // or before an edit modal is reopened for a different party (so the "existing" picker
        // re-fetches a fresh unlinked-parties list rather than reusing a stale one).
        reset: function () {
            currentPartyId = null;
            showNotLinkedState();
            if ($(existingSelect).data('select2')) {
                $(existingSelect).select2('destroy');
            }
            existingSelect.innerHTML = `<option value="">Search ${otherLabel}...</option>`;
            existingListLoaded = false;
            container.querySelectorAll('input[name="' + uid + '_mode"]').forEach(function (radio) {
                radio.checked = radio.value === 'new';
            });
            existingPicker.style.display = 'none';
        }
    };
}

<?php
require_once '../../../../includes/dashboard.php';
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../auth/login.html'); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LedgerOne ERP - Warranty Registration</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="container">

    <!-- ===== FORM CARD ===== -->
    <div class="card" id="formCard">
        <div class="card-legend">Warranty Registration Form</div>
        <form id="warrantyForm">

            <!-- Section 1: Registration Info -->
            <div class="section-title"><i class="fas fa-certificate"></i> Registration Info</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Warranty Reg. No</label>
                    <input type="text" id="warrantyNo" readonly placeholder="Auto Generated">
                </div>
                <div class="form-group">
                    <label class="required">Registration Date</label>
                    <input type="date" id="registrationDate" required>
                </div>
            </div>

            <!-- Section 2: Customer Info -->
            <div class="section-title"><i class="fas fa-user"></i> Customer Information</div>
            <div class="form-grid">
                <div class="form-group" style="position:relative;">
                    <label class="required">Customer Name</label>
                    <input type="text" id="customerSearch" placeholder="Search customer..." autocomplete="off" required>
                    <input type="hidden" id="customerId">
                    <div id="customerDropdown" class="searchable-dropdown-list" style="display:none;"></div>
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="text" id="phoneNumber" placeholder="e.g. +92300000000">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="email" placeholder="customer@email.com">
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" id="address" placeholder="Customer address">
                </div>
            </div>

            <!-- Section 3: Sale Details -->
            <div class="section-title"><i class="fas fa-file-invoice"></i> Sale Details</div>
            <div class="form-grid">
                <div class="form-group" style="position:relative;">
                    <label>Invoice Number</label>
                    <input type="text" id="invoiceSearch" placeholder="Search invoice no..." autocomplete="off">
                    <input type="hidden" id="invoiceId">
                    <div id="invoiceDropdown" class="searchable-dropdown-list" style="display:none;"></div>
                </div>
                <div class="form-group">
                    <label>Sale Date</label>
                    <input type="date" id="saleDate" readonly>
                </div>
            </div>

            <!-- Section 4: Product Info -->
            <div class="section-title"><i class="fas fa-box"></i> Product Information
                <div style="margin-left:auto;">
                    <button type="button" class="btn btn-secondary btn-sm" id="showHideFieldsBtn">
                        <i class="fas fa-eye"></i> Show / Hide Fields
                    </button>
                </div>
            </div>
            <div id="productsContainer"></div>
            <button type="button" class="btn btn-secondary btn-sm" id="addProductRow" style="margin-top:8px;">
                <i class="fas fa-plus"></i> Add Product
            </button>

            <!-- Section 5: Warranty Coverage Details -->
            <div class="section-title"><i class="fas fa-shield-alt"></i> Warranty Coverage Details</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="required">Warranty Type</label>
                    <select id="warrantyType" required>
                        <option value="">Select Type</option>
                        <option value="Repair">Repair</option>
                        <option value="Replacement">Replacement</option>
                        <option value="Service">Service</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Warranty Period</label>
                    <input type="text" id="warrantyPeriod" required placeholder="e.g. 12 Months / 1 Year">
                </div>
                <div class="form-group">
                    <label class="required">Warranty Start Date</label>
                    <input type="date" id="warrantyStartDate" required>
                </div>
                <div class="form-group">
                    <label>Warranty Expiry Date</label>
                    <input type="date" id="warrantyExpiryDate" readonly placeholder="Auto calculated">
                </div>
            </div>

            <!-- Section 5b: Coverage Items / Parts -->
            <div class="section-title" style="margin-top:20px;">
                <i class="fas fa-tools"></i> Warranty Coverage Items / Parts
                <div style="margin-left:auto;display:flex;gap:8px;">
                    <button type="button" class="btn btn-secondary btn-sm" id="manageComponentsBtn">
                        <i class="fas fa-cog"></i> Manage Components
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" id="addCoverageRowBtn">
                        <i class="fas fa-plus"></i> Add Component
                    </button>
                </div>
            </div>
            <div class="coverage-table-wrap">
                <table class="coverage-table" id="coverageTable">
                    <thead>
                        <tr>
                            <th>Component / Part</th>
                            <th>Serial No</th>
                            <th>Warranty Type</th>
                            <th>Period</th>
                            <th>Start Date</th>
                            <th>Expiry Date</th>
                            <th width="40"></th>
                        </tr>
                    </thead>
                    <tbody id="coverageBody">
                        <tr id="coverageEmpty"><td colspan="7" class="empty-row">No components added. Click "Add Component".</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Section 6: Terms & Conditions -->
            <div class="section-title"><i class="fas fa-list-ul"></i> Terms &amp; Conditions</div>
            <div class="terms-editor">
                <div class="terms-header">
                    <span>Editable — add or remove as needed</span>
                    <button type="button" class="btn btn-secondary btn-sm" id="addTermBtn">
                        <i class="fas fa-plus"></i> Add Term
                    </button>
                </div>
                <div id="termsList"></div>
            </div>

            <!-- Section 7: Signatures -->
            <div class="section-title"><i class="fas fa-signature"></i> Signatures</div>
            <div class="signatures-grid">
                <div class="signature-box"><div class="sig-line"></div><div class="sig-label">Customer Signature</div></div>
                <div class="signature-box"><div class="sig-line"></div><div class="sig-label">Authorized Signature</div></div>
                <div class="signature-box"><div class="sig-line"></div><div class="sig-label">Company Stamp</div></div>
            </div>

            <!-- Notes -->
            <div class="form-group" style="margin-top:16px;">
                <label>Notes / Remarks</label>
                <textarea id="notes" rows="3" placeholder="Any additional notes..."></textarea>
            </div>

            <!-- Actions -->
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="resetBtn"><i class="fas fa-redo"></i> Reset</button>
                <button type="submit" class="btn btn-primary" id="saveBtn"><i class="fas fa-save"></i> Save Warranty</button>
            </div>
        </form>
    </div>

    <!-- ===== LIST CARD ===== -->
    <div class="card" id="listCard" style="margin-top:24px;">
        <div class="card-legend">Warranty Registrations</div>
        <div class="list-toolbar">
            <input type="text" id="searchInput" placeholder="Search by reg no, customer, invoice...">
            <button class="btn btn-secondary" id="refreshListBtn"><i class="fas fa-sync"></i></button>
        </div>
        <div class="table-wrapper">
            <table id="warrantyTable">
                <thead>
                    <tr>
                        <th>Reg No</th>
                        <th>Reg Date</th>
                        <th>Customer</th>
                        <th>Invoice No</th>
                        <th>Warranty Type</th>
                        <th>Start Date</th>
                        <th>Expiry Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="warrantyTableBody">
                    <tr><td colspan="9" style="text-align:center;padding:20px;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

</div>

<!-- Show/Hide Fields Modal -->
<div class="modal" id="showHideModal">
    <div class="modal-content" style="max-width:340px;">
        <div class="modal-header">
            <h3><i class="fas fa-eye" style="color:#3b82f6;"></i> Show / Hide Fields</h3>
            <span class="close-modal" id="closeShowHideModal">&times;</span>
        </div>
        <div class="modal-body">
            <p style="font-size:12px;color:#64748b;margin-bottom:16px;">Toggle which product fields are visible. Settings are saved in your browser.</p>
            <div style="display:flex;flex-direction:column;gap:12px;">
                <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
                    <span style="font-size:13px;font-weight:600;color:#1e293b;"><i class="fas fa-hashtag" style="color:#3b82f6;margin-right:8px;"></i>Chassis No</span>
                    <input type="checkbox" id="chkChassis" onchange="saveChassisSettings()" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;">
                </label>
                <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
                    <span style="font-size:13px;font-weight:600;color:#1e293b;"><i class="fas fa-cog" style="color:#3b82f6;margin-right:8px;"></i>Motor No</span>
                    <input type="checkbox" id="chkMotor" onchange="saveChassisSettings()" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;">
                </label>
                <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
                    <span style="font-size:13px;font-weight:600;color:#1e293b;"><i class="fas fa-palette" style="color:#3b82f6;margin-right:8px;"></i>Colour</span>
                    <input type="checkbox" id="chkColour" onchange="saveChassisSettings()" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;">
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" id="closeShowHideModalBtn">Done</button>
        </div>
    </div>
</div>

<!-- Add Coverage Row Modal -->
<div class="modal" id="addCoverageModal">
    <div class="modal-content" style="max-width:560px;">
        <div class="modal-header">
            <h3><i class="fas fa-plus-circle" style="color:#3b82f6;"></i> Add Coverage Component</h3>
            <span class="close-modal" id="closeAddCoverageModal">&times;</span>
        </div>
        <div class="modal-body">
            <div class="form-grid">
                <div class="form-group" style="grid-column:1/-1;">
                    <label class="required">Component / Part Name</label>
                    <select id="coverageComponent">
                        <option value="">Select component...</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Serial No <span style="color:#94a3b8;font-weight:400;">(optional)</span></label>
                    <input type="text" id="coverageSerial" placeholder="e.g. SN-123456">
                </div>
                <div class="form-group">
                    <label class="required">Warranty Type</label>
                    <select id="coverageType">
                        <option value="">Select type</option>
                        <option value="Repair">Repair</option>
                        <option value="Replacement">Replacement</option>
                        <option value="Service">Service</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Warranty Period</label>
                    <input type="text" id="coveragePeriod" placeholder="e.g. 12 Months">
                </div>
                <div class="form-group">
                    <label class="required">Start Date</label>
                    <input type="date" id="coverageStart">
                </div>
                <div class="form-group">
                    <label>Expiry Date <span style="color:#94a3b8;font-weight:400;">(auto)</span></label>
                    <input type="date" id="coverageExpiry" readonly>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelAddCoverageBtn">Cancel</button>
            <button class="btn btn-primary" id="confirmAddCoverageBtn"><i class="fas fa-plus"></i> Add</button>
        </div>
    </div>
</div>

<!-- Manage Components Modal -->
<div class="modal" id="manageComponentsModal">
    <div class="modal-content" style="max-width:500px;">
        <div class="modal-header">
            <h3><i class="fas fa-cog" style="color:#3b82f6;"></i> Manage Components</h3>
            <span class="close-modal" id="closeManageComponentsModal">&times;</span>
        </div>
        <div class="modal-body">
            <div style="display:flex;gap:8px;margin-bottom:14px;">
                <input type="text" id="newComponentName" placeholder="Component name e.g. Engine, Battery..." style="flex:1;">
                <button class="btn btn-primary btn-sm" id="saveNewComponentBtn"><i class="fas fa-plus"></i> Add</button>
            </div>
            <div id="componentsList" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;min-height:60px;">
                <div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px;">Loading...</div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="closeManageComponentsBtn">Close</button>
        </div>
    </div>
</div>

<!-- View Modal -->
<div class="modal" id="viewModal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="viewModalTitle">Warranty Details</h3>
            <span class="close-modal" id="closeViewModal">&times;</span>
        </div>
        <div class="modal-body" id="viewModalBody"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="closeViewModalBtn">Close</button>
            <button class="btn btn-primary" id="printWarrantyBtn"><i class="fas fa-print"></i> Print</button>
        </div>
    </div>
</div>

<script src="script.js?v=<?php echo time(); ?>"></script>
</body>
</html>

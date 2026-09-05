<?php
require_once '../../../../../includes/dashboard.php';
if (session_status() == PHP_SESSION_NONE) session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) { header('Location: ../../../auth/login.html'); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LedgerOne ERP - Warranty Claim</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="container">

    <div class="card" id="formCard">
        <div class="card-legend">Warranty Claim Form</div>
        <form id="claimForm">

            <!-- 1. Claim Info -->
            <div class="section-title"><i class="fas fa-file-alt"></i> Claim Information</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Claim No</label>
                    <input type="text" id="claimNo" readonly placeholder="Auto Generated">
                </div>
                <div class="form-group">
                    <label class="required">Claim Date</label>
                    <input type="date" id="claimDate" required>
                </div>
                <div class="form-group">
                    <label class="required">Claim Status</label>
                    <select id="claimStatus" required>
                        <option value="">Select Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Under Inspection">Under Inspection</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Priority</label>
                    <select id="claimPriority" required>
                        <option value="">Select Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>
            </div>

            <!-- 2. Warranty Reference -->
            <div class="section-title"><i class="fas fa-certificate"></i> Warranty Reference</div>
            <div class="form-grid">
                <div class="form-group" style="position:relative;">
                    <label>Warranty Reg. No</label>
                    <input type="text" id="warrantySearch" placeholder="Search warranty no..." autocomplete="off">
                    <input type="hidden" id="warrantyId">
                    <div id="warrantyDropdown" class="searchable-dropdown-list" style="display:none;"></div>
                </div>
                <div class="form-group">
                    <label>Warranty Type</label>
                    <input type="text" id="warrantyType" readonly placeholder="Auto filled">
                </div>
                <div class="form-group">
                    <label>Warranty Start</label>
                    <input type="date" id="warrantyStart" readonly>
                </div>
                <div class="form-group">
                    <label>Warranty Expiry</label>
                    <input type="date" id="warrantyExpiry" readonly>
                </div>
            </div>
            <!-- Expiry Warning -->
            <div id="expiryWarning" class="expiry-warning" style="display:none;">
                <i class="fas fa-exclamation-triangle"></i>
                <span id="expiryWarningText"></span>
            </div>

            <!-- 3. Customer Info -->
            <div class="section-title"><i class="fas fa-user"></i> Customer Information</div>
            <div class="form-grid">
                <div class="form-group" style="position:relative;">
                    <label class="required">Customer Name</label>
                    <input type="text" id="customerSearch" placeholder="Search customer..." autocomplete="off" required>
                    <input type="hidden" id="customerId">
                    <div id="customerDropdown" class="searchable-dropdown-list" style="display:none;"></div>
                </div>
                <div class="form-group">
                    <label>Phone</label>
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

            <!-- 4. Product Info -->
            <div class="section-title"><i class="fas fa-box"></i> Product Information
                <div style="margin-left:auto;">
                    <button type="button" class="btn btn-secondary btn-sm" id="showHideFieldsBtn">
                        <i class="fas fa-eye"></i> Show / Hide Fields
                    </button>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="required">Product Name</label>
                    <input type="text" id="productName" required placeholder="Product name">
                </div>
                <div class="form-group claim-chassis-col">
                    <label>Chassis No</label>
                    <input type="text" id="chassisNo" placeholder="Chassis No">
                </div>
                <div class="form-group claim-motor-col">
                    <label>Motor No</label>
                    <input type="text" id="motorNo" placeholder="Motor No">
                </div>
                <div class="form-group claim-colour-col">
                    <label>Colour</label>
                    <input type="text" id="colour" placeholder="Colour">
                </div>
                <div class="form-group">
                    <label>Sale Date</label>
                    <input type="date" id="saleDate" readonly>
                </div>
                <div class="form-group">
                    <label>Invoice No</label>
                    <input type="text" id="invoiceNo" placeholder="Original invoice no">
                </div>
            </div>

            <!-- 5. Claim Items (Component Level) -->
            <div class="section-title" style="margin-top:20px;">
                <i class="fas fa-tools"></i> Claim Items / Components
                <button type="button" class="btn btn-primary btn-sm" id="addClaimItemBtn" style="margin-left:auto;">
                    <i class="fas fa-plus"></i> Add Component
                </button>
            </div>
            <div class="claim-items-wrap">
                <table class="claim-items-table">
                    <thead>
                        <tr>
                            <th>Component / Part</th>
                            <th>Serial No</th>
                            <th>Warranty Status</th>
                            <th>Issue Description</th>
                            <th width="40"></th>
                        </tr>
                    </thead>
                    <tbody id="claimItemsBody">
                        <tr id="claimItemsEmpty"><td colspan="5" class="empty-row">No components added. Click "Add Component".</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- 6. Claim Details -->
            <div class="section-title"><i class="fas fa-exclamation-triangle"></i> Claim Details</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="required">Claim Type</label>
                    <select id="claimType" required>
                        <option value="">Select Type</option>
                        <option value="Repair">Repair</option>
                        <option value="Replacement">Replacement</option>
                        <option value="Inspection">Inspection</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Fault Category</label>
                    <select id="faultCategory" required>
                        <option value="">Select Category</option>
                        <option value="Manufacturing Defect">Manufacturing Defect</option>
                        <option value="Mechanical Failure">Mechanical Failure</option>
                        <option value="Electrical Fault">Electrical Fault</option>
                        <option value="Performance Issue">Performance Issue</option>
                        <option value="Cosmetic Damage">Cosmetic Damage</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label class="required">Problem Description</label>
                    <textarea id="problemDescription" rows="3" required placeholder="Describe the issue in detail..."></textarea>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Customer Complaint</label>
                    <textarea id="customerComplaint" rows="2" placeholder="Customer's exact complaint..."></textarea>
                </div>
            </div>

            <!-- 7. Inspection -->
            <div class="section-title"><i class="fas fa-search"></i> Inspection Details</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Inspection Date</label>
                    <input type="date" id="inspectionDate">
                </div>
                <div class="form-group">
                    <label>Inspected By</label>
                    <input type="text" id="inspectedBy" placeholder="Technician / Engineer name">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Inspection Findings</label>
                    <textarea id="inspectionFindings" rows="2" placeholder="Technical findings after inspection..."></textarea>
                </div>
            </div>

            <!-- 8. Resolution -->
            <div class="section-title"><i class="fas fa-check-circle"></i> Resolution</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Resolution Date</label>
                    <input type="date" id="resolutionDate">
                </div>
                <div class="form-group">
                    <label>Resolved By</label>
                    <input type="text" id="resolvedBy" placeholder="Name of resolver">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Resolution Details</label>
                    <textarea id="resolutionDetails" rows="2" placeholder="How was the issue resolved..."></textarea>
                </div>
            </div>

            <!-- Notes -->
            <div class="form-group" style="margin-top:16px;">
                <label>Internal Notes</label>
                <textarea id="notes" rows="2" placeholder="Internal notes..."></textarea>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="resetBtn"><i class="fas fa-redo"></i> Reset</button>
                <button type="submit" class="btn btn-primary" id="saveBtn"><i class="fas fa-save"></i> Save Claim</button>
            </div>
        </form>
    </div>

    <!-- LIST -->
    <div class="card" id="listCard" style="margin-top:24px;">
        <div class="card-legend">Warranty Claims</div>
        <div class="list-toolbar">
            <input type="text" id="searchInput" placeholder="Search by claim no, customer, warranty no...">
            <select id="filterStatus" style="max-width:160px;">
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Under Inspection">Under Inspection</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
            </select>
            <button class="btn btn-secondary" id="refreshListBtn"><i class="fas fa-sync"></i></button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Claim No</th>
                        <th>Claim Date</th>
                        <th>Customer</th>
                        <th>Warranty No</th>
                        <th>Product</th>
                        <th>Claim Type</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="claimTableBody">
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

<!-- Add Claim Item Modal -->
<div class="modal" id="addClaimItemModal">
    <div class="modal-content" style="max-width:520px;">
        <div class="modal-header">
            <h3><i class="fas fa-tools" style="color:#3b82f6;"></i> Add Claim Component</h3>
            <span class="close-modal" id="closeClaimItemModal">&times;</span>
        </div>
        <div class="modal-body">
            <div class="form-grid">
                <div class="form-group" style="grid-column:1/-1;">
                    <label class="required">Component / Part</label>
                    <select id="itemComponent">
                        <option value="">Select component...</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label>Serial No</label>
                    <input type="text" id="itemSerial" placeholder="Auto filled from warranty or enter manually">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label class="required">Issue Description</label>
                    <textarea id="itemIssue" rows="2" placeholder="Describe the issue with this component..."></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelClaimItemBtn">Cancel</button>
            <button class="btn btn-primary" id="confirmClaimItemBtn"><i class="fas fa-plus"></i> Add</button>
        </div>
    </div>
</div>

<!-- View Modal -->
<div class="modal" id="viewModal">
    <div class="modal-content" style="max-width:800px;">
        <div class="modal-header">
            <h3 id="viewModalTitle">Claim Details</h3>
            <span class="close-modal" id="closeViewModal">&times;</span>
        </div>
        <div class="modal-body" id="viewModalBody"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="closeViewModalBtn">Close</button>
            <button class="btn btn-primary" id="printClaimBtn"><i class="fas fa-print"></i> Print</button>
        </div>
    </div>
</div>

<script src="script.js?v=<?php echo time(); ?>"></script>
</body>
</html>

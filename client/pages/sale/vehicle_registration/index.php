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
    <title>LedgerOne ERP - Vehicle Registration</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="container">

    <div class="card" id="formCard">
        <div class="card-legend">Vehicle Registration Form</div>
        <form id="vregForm">

            <!-- 1. Registration Info -->
            <div class="section-title"><i class="fas fa-id-card"></i> Registration Info</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Application No</label>
                    <input type="text" id="applicationNo" readonly placeholder="Auto Generated">
                </div>
                <div class="form-group">
                    <label class="required">Application Date</label>
                    <input type="date" id="applicationDate" required>
                </div>
                <div class="form-group">
                    <label>Registration No <span class="optional">(after approval)</span></label>
                    <input type="text" id="registrationNo" placeholder="e.g. KHI-1234">
                </div>
                <div class="form-group">
                    <label class="required">Registration Type</label>
                    <select id="registrationType" required>
                        <option value="">Select Type</option>
                        <option value="New Registration">New Registration</option>
                        <option value="Transfer">Transfer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Registration City</label>
                    <input type="text" id="registrationCity" required placeholder="e.g. Karachi, Lahore">
                </div>
                <div class="form-group">
                    <label class="required">Status</label>
                    <select id="regStatus" required>
                        <option value="">Select Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Submitted to Excise">Submitted to Excise</option>
                        <option value="In Process">In Process</option>
                        <option value="Completed">Completed</option>
                        <option value="Delivered">Delivered</option>
                    </select>
                </div>
            </div>

            <!-- 2. Customer Info -->
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
                <div class="form-group">
                    <label>CNIC No</label>
                    <input type="text" id="cnicNo" placeholder="Auto filled from customer">
                </div>
            </div>

            <!-- 3. Sale Details -->
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

            <!-- 4. Product Info -->
            <div class="section-title"><i class="fas fa-motorcycle"></i> Product Information
                <div style="margin-left:auto;">
                    <button type="button" class="btn btn-secondary btn-sm" id="showHideFieldsBtn">
                        <i class="fas fa-eye"></i> Show / Hide Fields
                    </button>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="required">Product Name</label>
                    <input type="text" id="productName" required placeholder="e.g. Honda CD 70">
                </div>
                <div class="form-group vreg-chassis-col">
                    <label>Chassis No</label>
                    <input type="text" id="chassisNo" placeholder="Chassis No">
                </div>
                <div class="form-group vreg-motor-col">
                    <label>Motor No</label>
                    <input type="text" id="motorNo" placeholder="Motor No">
                </div>
                <div class="form-group vreg-colour-col">
                    <label>Colour</label>
                    <input type="text" id="colour" placeholder="Colour">
                </div>
                <div class="form-group">
                    <label>Model Year</label>
                    <input type="text" id="modelYear" placeholder="e.g. 2025">
                </div>
            </div>

            <!-- 5. Fees Section -->
            <div class="section-title"><i class="fas fa-money-bill-wave"></i> Fees</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Registration Fee</label>
                    <input type="number" id="registrationFee" min="0" step="0.01" value="0" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Number Plate Fee</label>
                    <input type="number" id="numberPlateFee" min="0" step="0.01" value="0" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Smart Card Fee</label>
                    <input type="number" id="smartCardFee" min="0" step="0.01" value="0" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Service Charges</label>
                    <input type="number" id="serviceCharges" min="0" step="0.01" value="0" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Total Amount</label>
                    <input type="text" id="totalAmount" readonly placeholder="Auto calculated">
                </div>
            </div>

            <!-- 6. Payment -->
            <div class="section-title"><i class="fas fa-credit-card"></i> Payment</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="paymentMethod">
                        <option value="">Select Method</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                    </select>
                </div>
                <div class="form-group" id="bankAccountContainer" style="display:none;">
                    <label>Bank Account</label>
                    <select id="bankAccount">
                        <option value="">Select Bank Account</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount Paid (₨)</label>
                    <input type="number" id="amountPaid" min="0" step="0.01" value="0" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Remaining Balance</label>
                    <input type="text" id="remainingBalance" readonly placeholder="0.00">
                </div>
            </div>

            <!-- 7. Status Tracking -->
            <div class="section-title"><i class="fas fa-tasks"></i> Status Tracking</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Expected Delivery Date</label>
                    <input type="date" id="expectedDeliveryDate">
                </div>
                <div class="form-group">
                    <label>Submitted to Excise Date</label>
                    <input type="date" id="submittedDate">
                </div>
                <div class="form-group">
                    <label>Completed Date</label>
                    <input type="date" id="completedDate">
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <input type="text" id="remarks" placeholder="Any status remarks...">
                </div>
            </div>

            <!-- 8. Delivery Info -->
            <div class="section-title"><i class="fas fa-truck"></i> Delivery Info</div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Delivery Date</label>
                    <input type="date" id="deliveryDate">
                </div>
                <div class="form-group">
                    <label>Delivered To</label>
                    <input type="text" id="deliveredTo" placeholder="Name of receiver">
                </div>
                <div class="form-group">
                    <label>Delivered By</label>
                    <input type="text" id="deliveredBy" placeholder="Staff name">
                </div>
                <div class="form-group">
                    <label>Delivery Notes</label>
                    <input type="text" id="deliveryNotes" placeholder="Any delivery notes...">
                </div>
            </div>

            <!-- 9. Signatures -->
            <div class="section-title"><i class="fas fa-signature"></i> Signatures</div>
            <div class="signatures-grid">
                <div class="signature-box"><div class="sig-line"></div><div class="sig-label">Customer Signature</div></div>
                <div class="signature-box"><div class="sig-line"></div><div class="sig-label">Authorized Signature</div></div>
                <div class="signature-box"><div class="sig-line"></div><div class="sig-label">Company Stamp</div></div>
            </div>

            <!-- Notes -->
            <div class="form-group" style="margin-top:16px;">
                <label>Internal Notes</label>
                <textarea id="notes" rows="2" placeholder="Internal notes..."></textarea>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="resetBtn"><i class="fas fa-redo"></i> Reset</button>
                <button type="submit" class="btn btn-primary" id="saveBtn"><i class="fas fa-save"></i> Save</button>
            </div>
        </form>
    </div>

    <!-- LIST -->
    <div class="card" id="listCard" style="margin-top:24px;">
        <div class="card-legend">Vehicle Registrations</div>
        <div class="list-toolbar">
            <input type="text" id="searchInput" placeholder="Search by app no, reg no, customer...">
            <select id="filterStatus" style="max-width:180px;">
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Submitted to Excise">Submitted to Excise</option>
                <option value="In Process">In Process</option>
                <option value="Completed">Completed</option>
                <option value="Delivered">Delivered</option>
            </select>
            <button class="btn btn-secondary" id="refreshListBtn"><i class="fas fa-sync"></i></button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>App No</th>
                        <th>App Date</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Chassis No</th>
                        <th>Motor No</th>
                        <th>Reg Type</th>
                        <th>Total</th>
                        <th>Amount Paid (₨)</th>
                        <th>Remaining Balance</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="vregTableBody">
                    <tr><td colspan="10" style="text-align:center;padding:20px;">Loading...</td></tr>
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
            <p style="font-size:12px;color:#64748b;margin-bottom:16px;">Settings saved in your browser.</p>
            <div style="display:flex;flex-direction:column;gap:12px;">
                <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
                    <span style="font-size:13px;font-weight:600;color:#1e293b;"><i class="fas fa-hashtag" style="color:#3b82f6;margin-right:8px;"></i>Chassis No</span>
                    <input type="checkbox" id="chkChassis" onchange="saveFieldSettings()" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;">
                </label>
                <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
                    <span style="font-size:13px;font-weight:600;color:#1e293b;"><i class="fas fa-cog" style="color:#3b82f6;margin-right:8px;"></i>Motor No</span>
                    <input type="checkbox" id="chkMotor" onchange="saveFieldSettings()" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;">
                </label>
                <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
                    <span style="font-size:13px;font-weight:600;color:#1e293b;"><i class="fas fa-palette" style="color:#3b82f6;margin-right:8px;"></i>Colour</span>
                    <input type="checkbox" id="chkColour" onchange="saveFieldSettings()" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;">
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" id="closeShowHideModalBtn">Done</button>
        </div>
    </div>
</div>

<!-- View Modal -->
<div class="modal" id="viewModal">
    <div class="modal-content" style="max-width:800px;">
        <div class="modal-header">
            <h3 id="viewModalTitle">Registration Details</h3>
            <span class="close-modal" id="closeViewModal">&times;</span>
        </div>
        <div class="modal-body" id="viewModalBody"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="closeViewModalBtn">Close</button>
            <button class="btn btn-primary" id="printVregBtn"><i class="fas fa-print"></i> Print</button>
        </div>
    </div>
</div>

<script src="script.js?v=<?php echo time(); ?>"></script>
</body>
</html>

<?php
require_once '../../../../includes/dashboard.php';
// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Get user_id from session
$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    // Redirect to login if no user_id in session
    header('Location: ../../auth/login.html');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LedgerOne ERP | Leads Entry Form</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../../assets/css/customer_supplier/leads/lead-add.css">
</head>

<body>
    <div class="container">
        <header class="header">
            <h1><i class="fas fa-user-plus"></i> Leads Entry Form</h1>
            <div class="header-actions">
                <button class="btn btn-ghost" id="helpBtn">
                    <i class="fas fa-question-circle"></i> Help
                </button>
                <button class="btn btn-secondary" id="viewLeadsBtn">
                    <i class="fas fa-list"></i> View All Leads
                </button>
            </div>
        </header>

        <main class="main-layout">
            <div class="card">
                <h2 class="card-title">Lead Information</h2>

                <div class="lead-code-display">
                    <div>
                        Lead Code: <strong id="leadCodeDisplay">LD-2023-00127</strong>
                        <span>(auto-generated, read-only)</span>
                    </div>
                    <button class="btn btn-ghost" id="copyCodeBtn">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>

                <form id="leadsForm" class="form-grid">
                    <!-- Lead Source -->
                    <div class="form-group">
                        <label for="leadSource">Lead Source *</label>
                        <select id="leadSource" required>
                            <option value="">Select source</option>
                            <option value="Website">Website</option>
                            <option value="Referral">Referral</option>
                            <option value="Social Media">Social Media</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <!-- Lead Date -->
                    <div class="form-group">
                        <label for="leadDate">Lead Date *</label>
                        <input type="date" id="leadDate" required>
                    </div>

                    <!-- Lead Status -->
                    <div class="form-group">
                        <label for="leadStatus">Lead Status *</label>
                        <select id="leadStatus" required>
                            <option value="New"><span class="status-indicator status-new"></span> New</option>
                            <option value="Contacted"><span class="status-indicator status-contacted"></span> Contacted
                            </option>
                            <option value="Qualified"><span class="status-indicator status-qualified"></span> Qualified
                            </option>
                            <option value="Proposal Sent"><span class="status-indicator status-proposal"></span>
                                Proposal Sent</option>
                        </select>
                    </div>

                    <!-- Contact Name -->
                    <div class="form-group">
                        <label for="contactName">Contact Name *</label>
                        <input type="text" id="contactName" placeholder="Enter contact name" required>
                    </div>

                    <!-- Business Name -->
                    <div class="form-group">
                        <label for="businessName">Business Name</label>
                        <input type="text" id="businessName" placeholder="Enter business name">
                    </div>

                    <!-- Priority -->
                    <div class="form-group">
                        <label for="priority">Priority</label>
                        <select id="priority">
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>

                    <!-- Email -->
                    <div class="form-group">
                        <label for="email">Email Address *</label>
                        <input type="email" id="email" placeholder="name@example.com" required>
                        <div class="helper-text">We'll never share your email with anyone else.</div>
                    </div>

                    <!-- Primary Cell No -->
                    <div class="form-group">
                        <label for="primaryPhone">Primary Cell No *</label>
                        <input type="tel" id="primaryPhone" placeholder="+1 (555) 123-4567" required>
                    </div>

                    <!-- Secondary Cell No -->
                    <div class="form-group">
                        <label for="secondaryPhone">Secondary Cell No</label>
                        <input type="tel" id="secondaryPhone" placeholder="+1 (555) 987-6543">
                    </div>

                    <!-- Product/Service Interested -->
                    <div class="form-group">
                        <label for="productInterest">Product/Service Interested *</label>
                        <select id="productInterest" required>
                            <option value="">Select product/service</option>
                            <option value="Fuel Management">Fuel Management</option>
                            <option value="Fleet Analytics">Fleet Analytics</option>
                            <option value="ERP Integration">ERP Integration</option>
                            <option value="Inventory Control">Inventory Control</option>
                            <option value="Custom Solution">Custom Solution</option>
                        </select>
                    </div>

                    <!-- Empty column for spacing -->
                    <div class="form-group"></div>
                    <div class="form-group"></div>
                </form>

                <div class="form-actions">
                    <button class="btn btn-secondary" id="resetBtn">
                        <i class="fas fa-redo"></i> Reset Form
                    </button>
                    <button class="btn btn-primary" id="saveBtn">
                        <i class="fas fa-save"></i> Save Lead
                    </button>
                </div>
            </div>
        </main>

        <div class="toast" id="toast">
            <i class="fas fa-check-circle toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">Lead saved successfully!</div>
                <div class="toast-details" id="toastDetails"></div>
            </div>
        </div>
    </div>

    <script src="../../../assets/js/customer_supplier/leads/lead-add.js"></script>
</body>

</html>
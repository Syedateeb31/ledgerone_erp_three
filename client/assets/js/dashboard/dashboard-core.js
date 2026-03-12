// dashboard-core.js
(function () {
  "use strict";

  if (window.DashboardCore) {
    return;
  }

  class DashboardCore {
    constructor() {
      this.isInitialized = false;
      this.basePath = "/ledgerone_erp";
      this.permissions = {};
      this.init();
    }

    init() {
      if (this.isInitialized) return;

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.setup());
      } else {
        this.setup();
      }
    }

    async setup() {
      this.createEnhancedNavbar();
      await this.loadPermissions();
      this.applyPermissions();
      await this.loadCompanyInfo();
      this.initEventListeners();
      this.initThemeToggle();
      this.highlightCurrentPage();
      this.initClock();
      this.isInitialized = true;
    }

    createNavbarContainer() {
      const container = document.createElement('div');
      container.id = 'navbar-container';
      container.tabIndex = -1;
      document.body.prepend(container);
      return container;
    }

    createEnhancedNavbar() {
      const container = document.getElementById("navbar-container") || this.createNavbarContainer();
      container.tabIndex = -1;

      container.innerHTML = `
        <div class="mobile-overlay" id="mobile-overlay"></div>
        <button class="nav-toggle-mobile" id="nav-toggle-mobile">
          <i class="fas fa-bars"></i>
        </button>
        <header class="main-header">
          <div class="company-info">
            <img class="company-logo" src="" alt="Company Logo" style="display: none;">
            <div class="company-text">
              <h1>LedgerOne ERP</h1>
              <span>ERP Management System</span>
            </div>
          </div>
          <div class="header-clock">
            <div class="clock-time" id="clock-time">--:--:--</div>
            <div class="clock-date" id="clock-date">Loading...</div>
          </div>
          <div class="subscription-banner" id="subscription-banner" style="display: none;"></div>
          <div class="version-info">
            <span class="version-label">Version</span>
            <span class="version-number">1.0</span>
          </div>
          <div class="user-info">
            <div class="user-details">
              <span class="user-name">John Doe</span>
              <span class="user-role">Administrator</span>
            </div>
            <div class="user-avatar">
              <i class="fas fa-user-circle"></i>
              <span class="status-dot active"></span>
            </div>
            <div class="theme-toggle" id="theme-toggle"></div>
          </div>
        </header>
        <nav class="compact-nav" role="navigation">
          <div class="nav-toggle">
            <button id="nav-toggle-btn" aria-label="Toggle navigation">
              <i class="fas fa-bars"></i>
            </button>
            <div class="brand-logo">
              <i class="fas fa-book"></i>
              <span>LedgerOne</span>
            </div>
          </div>
          <div class="nav-content" id="nav-content">
            ${this.getNavbarHTML()}
          </div>
        </nav>
      `;

      // Set tabIndex -1 on navigation elements
      container.querySelectorAll('.nav-dropdown, .dropdown-content, .nav-item, .nav-toggle-mobile, .nav-toggle, #nav-toggle-btn').forEach(el => {
        el.tabIndex = -1;
      });

      this.addEnhancedStyles();
    }

    getNavbarHTML() {
      return `
        <button class="nav-item" data-section="home">
          <i class="fas fa-home"></i><span>Home</span>
        </button>
        
        <div class="nav-dropdown" data-section="customer">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-users"></i><span>Customer/Supplier</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="customer-add">New Customer</button>
            <button data-action="supplier-add">New Supplier</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="sale">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-shopping-cart"></i><span>Sale</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="create-quotation">Create Quotation</button>
            <button data-action="sale-order">Record Sale Order</button>
            <button data-action="sale-invoice">Sale Invoice</button>
            <button data-action="pos-invoice">POS Invoice</button>
            <button data-action="delivery-challan">Issue Delivery Challan</button>
            <button data-action="sale-return">Sale Return</button>
            <button data-action="sale-reports">Sale Reports</button>
            <button data-action="daily-sale-report">Daily Sale Report</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="purchase">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-truck"></i><span>Purchase</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="purchase-order">Record Purchase Order</button>
            <button data-action="new-invoice">New Purchase</button>
            <button data-action="purchase-tax-invoice">Purchase Tax Invoice</button>
            <button data-action="purchase-return">Purchase Return</button>
            <button data-action="purchase-reports">Purchase Reports</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="inventory">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-boxes"></i><span>Inventory</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="new-product">New Product</button>
            <button data-action="stock-adjustment">Stock Adjustment</button>
            <button data-action="stock-transfer">Stock Transfer</button>
            <button data-action="stock-position">Stock Position</button>
            <button data-action="inward-gatepass">Inward Gatepass</button>
            <button data-action="outward-gatepass">Outward Gatepass</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="vouchers">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-receipt"></i><span>Vouchers</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="receive-voucher">Receive Voucher</button>
            <button data-action="payment-voucher">Payment Voucher</button>
            <button data-action="expense-voucher">Expense Voucher</button>
            <button data-action="journal-entry">Journal Entry</button>
            <button data-action="cash-opening">Cash Opening</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="banking">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-university"></i><span>Banking</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="new-bank">New Bank</button>
            <button data-action="post-dated-cheques">Post Dated Cheques (PDCs)</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="rent">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-file-contract"></i><span>Rent Management</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="rent-issue">Issue Rent</button>
            <button data-action="rent-list">Rent List</button>
          </div>
        </div>

        <button class="nav-item" data-section="chartofaccounts">
          <i class="fas fa-list-alt"></i><span>Chart Of Accounts</span>
        </button>

        <div class="nav-dropdown" data-section="financial-reports">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-chart-line"></i><span>Financial Reports</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="general-ledger">General Ledger</button>
            <button data-action="customer-ledger">Customer Ledger</button>
            <button data-action="supplier-ledger">Supplier Ledger</button>
            <button data-action="trial-balance">Trial Balance</button>
            <button data-action="balance-sheet">Balance Sheet</button>
            <button data-action="profit-loss">Profit & Loss Statement</button>
            <button data-action="cash-flow">Cash Flow</button>
            <button data-action="financial-summary">Financial Summary</button>
            <button data-action="customer-aging">Customer Aging</button>
            <button data-action="vendor-aging">Supplier Aging</button>
            <button data-action="recovery-sheet">Recovery Sheet</button>
            <button data-action="sales-officer-recovery">Sales Officer-wise Recovery</button>
            <button data-action="pending-dsr-sheet">Pending DSR Sheet</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="hrm">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-user-tie"></i><span>HRM</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="new-employee">New Employee</button>
            <button data-action="record-attendance">Record Attendance</button>
            <button data-action="new-payroll">New Payroll</button>
            <button data-action="employees-ledger">Employees Ledger</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="manufacturing">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-industry"></i><span>Manufacturing</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="bom-list">Bill of Materials (BOM)</button>
            <button data-action="unit-measurement">Unit Measurement</button>
            <button data-action="machine-setup">Machine Setup</button>
            <button data-action="production-order">Production Order</button>
            <button data-action="wip-management">WIP Management</button>
            <button data-action="production-completion">Production Completion</button>
            <button data-action="production-expenses">Production Expenses</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="master-setup">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-cogs"></i><span>Master Setup</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="branch-setup">Branch Setup</button>
            <button data-action="territory-setup">Territory Setup</button>
            <button data-action="rate-list-setup">Rate List Setup</button>
          </div>
        </div>

        <div class="nav-dropdown" data-section="system-setup">
          <button class="nav-item dropdown-trigger">
            <i class="fas fa-tools"></i><span>System Setup</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-content">
            <button data-action="company-profile">Company Profile</button>
            <button data-action="admin-panel">Admin Panel</button>
            <button data-action="currency-setup">Currency Setup</button>
            <button data-action="software-info">Software Info</button>
          </div>
        </div>

        <div class="nav-actions">
          <button class="nav-item logout-btn">
            <i class="fas fa-sign-out-alt"></i><span>Logout</span>
          </button>
        </div>
      `;
    }

    addEnhancedStyles() {
      if (document.getElementById("dashboard-enhanced-styles")) return;

      const style = document.createElement("style");
      style.id = "dashboard-enhanced-styles";
      style.textContent = this.getEnhancedCSS();
      document.head.appendChild(style);
    }

    getEnhancedCSS() {
      return `
        :root {
          --primary-color: #1F7BFF;
          --primary-hover: #1A6CDC;
          --primary-active: #1559B8;
          --surface-0: #FFFFFF;
          --surface-1: #F7F9FC;
          --surface-2: #EFF2F7;
          --text-heading: #0E1A2B;
          --text-body: #2F3B4C;
          --text-subtle: #6B7280;
          --border-default: #E1E6EE;
          --border-strong: #C9CFDA;
          --success: #2FBF71;
          --warning: #E8B23F;
          --error: #E34F4F;
        }

        .dark-mode {
          --primary-color: #FFD447;
          --primary-hover: #FFC72A;
          --primary-active: #FFB800;
          --surface-0: #0B1220;
          --surface-1: #111A2E;
          --surface-2: #1A2842;
          --text-heading: #FFFFFF;
          --text-body: #C9D1D9;
          --text-subtle: #9AA1AE;
          --border-default: rgba(255, 255, 255, 0.1);
          --border-strong: rgba(255, 255, 255, 0.2);
        }

        .compact-nav {
          position: fixed;
          top: 0;
          left: 0;
          width: 50px;
          height: 100vh;
          background: var(--surface-1);
          z-index: 1000;
          transition: all 0.3s ease;
          overflow: hidden;
          border-right: 1px solid var(--border-default);
        }

        .compact-nav:hover,
        .compact-nav.expanded {
          width: 220px;
        }

        .nav-toggle {
          padding: 12px;
          border-bottom: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface-0);
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-heading);
          font-weight: 600;
          font-size: 16px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .compact-nav:hover .brand-logo,
        .compact-nav.expanded .brand-logo {
          opacity: 1;
        }

        .brand-logo i {
          color: var(--primary-color);
          font-size: 18px;
        }

        #nav-toggle-btn {
          background: none;
          border: none;
          color: var(--text-body);
          font-size: 16px;
          cursor: pointer;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        #nav-toggle-btn:hover {
          background: var(--surface-2);
        }

        .nav-content {
          padding: 16px 0;
          height: calc(100vh - 80px);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nav-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          color: var(--text-body);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
          border-radius: 0;
          margin: 2px 0;
          outline: none;
        }

        .nav-dropdown,
        .dropdown-content,
        .nav-item {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .nav-item:hover {
          background: var(--surface-2);
          color: var(--text-heading);
        }

        .nav-item.active {
          background: var(--primary-color);
          color: white;
          position: relative;
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--primary-active);
        }

        .nav-item i:first-child {
          width: 20px;
          margin-right: 12px;
          text-align: center;
          font-size: 16px;
        }

        .nav-item span {
          opacity: 0;
          transition: opacity 0.3s;
        }

        .compact-nav:hover .nav-item span,
        .compact-nav.expanded .nav-item span {
          opacity: 1;
        }

        .nav-dropdown {
          position: relative;
        }

        .dropdown-trigger .fa-chevron-down {
          margin-left: auto;
          font-size: 12px;
          transition: transform 0.3s;
        }

        .dropdown-trigger.active .fa-chevron-down {
          transform: rotate(180deg);
        }

        .dropdown-content {
          display: none;
          background: var(--surface-0);
          border-left: 3px solid var(--primary-color);
          margin-left: 20px;
          max-height: 300px;
          overflow-y: auto;
          border-radius: 0 8px 8px 0;
        }

        .dropdown-content.show {
          display: block;
        }

        .dropdown-content button {
          display: block;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          color: var(--text-body);
          text-align: left;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all 0.2s;
          outline: none;
          display: flex;
          align-items: center;
        }

        .dropdown-content button:hover {
          background: var(--surface-2);
          color: var(--text-heading);
        }

        .nav-actions {
          margin-top: auto;
          border-top: 1px solid var(--border-default);
          padding-top: 8px;
        }

        .logout-btn {
          color: var(--error);
        }

        .logout-btn:hover {
          background: var(--error) !important;
          color: white;
        }

        .main-header {
          position: fixed;
          top: 0;
          left: 50px;
          right: 0;
          height: 55px;
          background: var(--surface-0);
          border-bottom: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 999;
          transition: left 0.3s ease;
        }

        .company-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .company-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 4px;
        }

        .company-text h1 {
          margin: 0;
          font-size: 20px;
          color: var(--text-heading);
          font-weight: 600;
        }

        .company-text span {
          font-size: 12px;
          color: var(--text-subtle);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-body);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .user-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-heading);
        }

        .user-role {
          font-size: 12px;
          color: var(--text-subtle);
        }

        .user-avatar {
          position: relative;
        }

        .user-info i {
          font-size: 24px;
          color: var(--primary-color);
        }

        .status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--surface-0);
        }

        .status-dot.active {
          background: var(--success);
        }

        .status-dot.inactive {
          background: var(--error);
        }

        .nav-toggle-mobile {
          width: 0px;
          height: 0px;
          overflow: hidden;
        }

        .theme-toggle {
          display: none;
        }

        .header-clock {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-right: 20px;
        }

        .clock-time {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-heading);
          font-family: 'Courier New', monospace;
        }

        .clock-date {
          font-size: 11px;
          color: var(--text-subtle);
        }

        .version-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-right: 20px;
        }

        .subscription-banner {
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          animation: pulse 2s ease-in-out infinite;
          cursor: pointer;
        }

        .subscription-banner.trialing {
          background: linear-gradient(135deg, #FFA500, #FF8C00);
          color: white;
        }

        .subscription-banner.trial_expired,
        .subscription-banner.expired {
          background: linear-gradient(135deg, #E34F4F, #C62828);
          color: white;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }

        .version-label {
          font-size: 10px;
          color: var(--text-subtle);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .version-number {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-color);
        }

        .theme-toggle::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: var(--primary-color);
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .dark-mode .theme-toggle::before {
          left: calc(100% - 20px);
        }

        body {
          margin-left: 50px;
          margin-top: 57px;
          transition: margin-left 0.3s ease;
          background: var(--surface-0);
          color: var(--text-body);
        }

        .compact-nav:hover ~ .main-header,
        .compact-nav.expanded ~ .main-header {
          left: 220px;
        }

        .compact-nav:hover ~ body,
        .compact-nav.expanded ~ body {
          margin-left: 220px;
        }

        .nav-content::-webkit-scrollbar {
          width: 4px;
        }

        .nav-content::-webkit-scrollbar-track {
          background: var(--surface-2);
        }

        .nav-content::-webkit-scrollbar-thumb {
          background: var(--border-strong);
          border-radius: 2px;
        }

        @media (max-width: 480px) {
          .main-header {
            padding: 0 15px 0 60px;
          }

          .company-info {
            display: none;
          }

          .header-clock {
            display: none;
          }

          .version-info {
            display: none;
          }

          .user-details {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .compact-nav {
            transform: translateX(-100%);
            width: 100vw;
            height: 100vh;
            background: var(--surface-0);
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
          }

          .compact-nav.mobile-open {
            transform: translateX(0);
          }

          .nav-toggle {
            padding: 20px;
            background: var(--primary-color);
            color: white;
          }

          .brand-logo {
            opacity: 1;
            color: white;
          }

          .brand-logo i {
            color: white;
          }

          #nav-toggle-btn {
            color: white;
          }

          #nav-toggle-btn:hover {
            background: rgba(255,255,255,0.1);
          }

          .nav-content {
            padding: 0;
            height: calc(100vh - 80px);
          }

          .nav-item {
            padding: 16px 20px;
            font-size: 16px;
            border-bottom: 1px solid var(--border-default);
          }

          .nav-item span {
            opacity: 1;
          }

          .dropdown-content {
            margin-left: 0;
            border-left: none;
            background: var(--surface-1);
            border-radius: 0;
          }

          .dropdown-content button {
            padding: 14px 40px;
            font-size: 15px;
            border-bottom: 1px solid var(--border-default);
          }

          .main-header {
            left: 0;
            height: 60px;
            padding: 0 60px 0 20px;
            flex-wrap: wrap;
          }

          .company-info {
            flex: 1;
            min-width: 0;
          }

          .company-text h1 {
            font-size: 16px;
          }

          .company-text span {
            font-size: 11px;
          }

          .user-info {
            gap: 8px;
            flex-shrink: 0;
            margin-left: auto;
          }

          .user-details {
            display: flex;
          }

          .user-name {
            font-size: 12px;
          }

          .user-role {
            font-size: 10px;
          }

          body {
            margin-left: 0;
            margin-top: 60px;
          }

          .mobile-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 999;
            display: none;
          }

          .mobile-overlay.show {
            display: block;
          }

          .nav-toggle-mobile {
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1002;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px;
            font-size: 18px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            cursor: pointer;
            width: auto;
            height: auto;
            overflow: visible;
          }
        }

        @media (min-width: 1200px) {
          .compact-nav:hover,
          .compact-nav.expanded {
            width: 240px;
          }
        }
      `;
    }

    initEventListeners() {
      this.removeExistingListeners();

      document.addEventListener("click", (e) => {
        if (e.target.closest("#nav-toggle-btn") || e.target.closest("#nav-toggle-mobile")) {
          this.toggleNav();
        }
      });

      document.addEventListener("click", (e) => {
        if (e.target.closest("#mobile-overlay")) {
          this.toggleNav();
        }
      });

      document.addEventListener("click", (e) => {
        const navItem = e.target.closest(".nav-item:not(.dropdown-trigger)");
        if (navItem) {
          this.handleNavigation(navItem);
        }
      });

      document.addEventListener("click", (e) => {
        const dropdownTrigger = e.target.closest(".dropdown-trigger");
        if (dropdownTrigger) {
          this.toggleDropdown(dropdownTrigger);
        }
      });

      document.addEventListener("click", (e) => {
        const dropdownItem = e.target.closest(".dropdown-content button");
        if (dropdownItem) {
          this.handleDropdownAction(dropdownItem);
        }
      });

      document.addEventListener("click", (e) => {
        if (e.target.closest(".logout-btn")) {
          window.location.href = `${this.basePath}/server/api/auth/logout.php`;
        }
      });

      document.addEventListener("click", (e) => {
        if (!e.target.closest(".nav-dropdown")) {
          this.closeAllDropdowns();
        }
      });
    }

    initThemeToggle() {
      const savedTheme = localStorage.getItem('fuelingsys-theme') || 'light';
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
      }

      document.addEventListener('click', (e) => {
        if (e.target.closest('#theme-toggle')) {
          if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('fuelingsys-theme', 'light');
          } else {
            document.body.classList.add('dark-mode');
            localStorage.setItem('fuelingsys-theme', 'dark');
          }
        }
      });
    }

    removeExistingListeners() {
      const oldNav = document.querySelector(".compact-nav");
      if (oldNav) {
        const newNav = oldNav.cloneNode(true);
        oldNav.parentNode.replaceChild(newNav, oldNav);
      }
    }

    toggleNav() {
      const nav = document.querySelector(".compact-nav");
      const overlay = document.getElementById("mobile-overlay");

      if (window.innerWidth <= 768) {
        nav.classList.toggle("mobile-open");
        overlay.classList.toggle("show");
        document.body.style.overflow = nav.classList.contains("mobile-open") ? "hidden" : "";
      } else {
        nav.classList.toggle("expanded");
      }
    }

    toggleDropdown(trigger) {
      const dropdown = trigger.parentElement;
      const content = dropdown.querySelector(".dropdown-content");

      document.querySelectorAll(".dropdown-content").forEach((d) => {
        if (d !== content) {
          d.classList.remove("show");
          d.parentElement.querySelector(".dropdown-trigger").classList.remove("active");
        }
      });

      content.classList.toggle("show");
      trigger.classList.toggle("active");
    }

    closeAllDropdowns() {
      document.querySelectorAll(".dropdown-content").forEach((content) => {
        content.classList.remove("show");
        content.parentElement.querySelector(".dropdown-trigger").classList.remove("active");
      });
    }

    handleNavigation(navItem) {
      if (this.subscriptionStatus === 'expired' || this.subscriptionStatus === 'trial_expired') {
        alert('Your subscription has expired. Please renew to continue.');
        return;
      }
      
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("active");
      });

      navItem.classList.add("active");
      const section = navItem.getAttribute("data-section");
      this.navigateTo(section);
    }

    handleDropdownAction(item) {
      const action = item.getAttribute("data-action");
      
      if (action !== 'software-info' && (this.subscriptionStatus === 'expired' || this.subscriptionStatus === 'trial_expired')) {
        alert('Your subscription has expired. Please renew to continue.');
        return;
      }
      
      const section = item.closest(".nav-dropdown").getAttribute("data-section");

      this.closeAllDropdowns();

      document.querySelectorAll(".nav-item").forEach((navItem) => {
        navItem.classList.remove("active");
      });
      item.closest(".nav-dropdown").querySelector(".dropdown-trigger").classList.add("active");

      this.navigateToAction(section, action);
    }

    navigateTo(section) {
      const routes = {
        home: `${this.basePath}/client/pages/dashboard/dashboard.php`,
        chartofaccounts: `${this.basePath}/client/pages/chart_of_accounts/coa.php`,
      };

      if (routes[section]) {
        window.location.href = routes[section];
      }
    }

    navigateToAction(section, action) {
      const routes = {
        customer: {
          "customer-add": `${this.basePath}/client/pages/customer_supplier/customers/customer-list.php`,
          "supplier-add": `${this.basePath}/client/pages/customer_supplier/suppliers/supplier-list.php`,
        },
        sale: {
          "sale-invoice": `${this.basePath}/client/pages/sale/pos_invoice/pos-list.php`,
          "pos-invoice": `${this.basePath}/client/pages/sale/pos_invoice/counter-invoice.php`,
          "sale-return": `${this.basePath}/client/pages/sale/sale_return/return-list.php`,
          "sale-reports": `${this.basePath}/client/pages/sale/sales_report/sales-report.php`,
          "sale-order": `${this.basePath}/client/pages/sale/sale_order/order-list.php`,
          "daily-sale-report": `${this.basePath}/client/pages/sale/daily_sale_report/daily-sale-report.php`,
        },
        purchase: {
          "purchase-order": `${this.basePath}/client/pages/purchase/purchase_order/order-list.php`,
          "new-invoice": `${this.basePath}/client/pages/purchase/purchase_invoice/purchase-list.php`,
          "purchase-tax-invoice": `${this.basePath}/client/pages/purchase/purchase_tax_invoice/purchase-list.php`,
          "purchase-return": `${this.basePath}/client/pages/purchase/purchase_return/return-list.php`,
          "purchase-reports": `${this.basePath}/client/pages/purchase/purchase_reports/purchase-reports.php`,
        },
        inventory: {
          "stock-position": `${this.basePath}/client/pages/inventory/stock_position/stock-position.php`,
          "new-product": `${this.basePath}/client/pages/inventory/products/product-list.php`,
          "stock-adjustment": `${this.basePath}/client/pages/inventory/stock_adjustment/adjustment-list.php`,
          "stock-transfer": `${this.basePath}/client/pages/inventory/stock_transfer/transfer-list.php`,
          "inward-gatepass": `${this.basePath}/client/pages/inventory/inward_gatepass/gatepass-list.php`,
          "outward-gatepass": `${this.basePath}/client/pages/inventory/outward_gatepass/gatepass-list.php`,
        },
        vouchers: {
          "receive-voucher": `${this.basePath}/client/pages/vouchers/receive_voucher/receive-list.php`,
          "payment-voucher": `${this.basePath}/client/pages/vouchers/payment_voucher/payment-list.php`,
          "expense-voucher": `${this.basePath}/client/pages/vouchers/expense_voucher/expense-list.php`,
          "journal-entry": `${this.basePath}/client/pages/vouchers/journal_voucher/journal-list.php`,
          "cash-opening": `${this.basePath}/client/pages/vouchers/cash_opening/cash-opening.php`,
        },
        banking: {
          "new-bank": `${this.basePath}/client/pages/banking/bank/bank-list.php`,
          "post-dated-cheques": `${this.basePath}/client/pages/banking/post_dated_cheques/post-dated-cheques.php`,
        },
        rent: {
          "rent-issue": `${this.basePath}/client/pages/rent/rent-issue.php`,
          "rent-list": `${this.basePath}/client/pages/rent/rent-list.php`,
        },
        "financial-reports": {
          "supplier-ledger": `${this.basePath}/client/pages/financial_reports/supplier_ledger/supplier-ledger.php`,
          "customer-ledger": `${this.basePath}/client/pages/financial_reports/customer_ledger/customer-ledger.php`,
          "cash-flow": `${this.basePath}/client/pages/financial_reports/cash_flow/cash-flow.php`,
          "general-ledger": `${this.basePath}/client/pages/financial_reports/general_ledger/general-ledger.php`,
          "trial-balance": `${this.basePath}/client/pages/financial_reports/trial_balance/trial-balance.php`,
          "balance-sheet": `${this.basePath}/client/pages/financial_reports/balance_sheet/balance-sheet.php`,
          "profit-loss": `${this.basePath}/client/pages/financial_reports/profit_loss_statement/profit-loss.php`,
          "customer-aging": `${this.basePath}/client/pages/financial_reports/customer_aging/customer-aging.php`,
          "vendor-aging": `${this.basePath}/client/pages/financial_reports/supplier_aging/supplier-aging.php`,
          "recovery-sheet": `${this.basePath}/client/pages/financial_reports/recovery_sheet/recovery-sheet.php`,
          "sales-officer-recovery": `${this.basePath}/client/pages/financial_reports/sales_officer_recovery/sales-officer-recovery.php`,
          "pending-dsr-sheet": `${this.basePath}/client/pages/financial_reports/pending_dsr_sheet/pending-dsr-sheet.php`,
          "financial-summary": `${this.basePath}/client/pages/financial_reports/financial_summary/financial_summary.php`,
        },
        hrm: {
          "new-employee": `${this.basePath}/client/pages/hrm/employees/employee-list.php`,
          "record-attendance": `${this.basePath}/client/pages/hrm/attendance/attendance.php`,
          "new-payroll": `${this.basePath}/client/pages/hrm/payroll/payroll-list.php`,
          "employees-ledger": `${this.basePath}/client/pages/hrm/employees_ledger/employee-ledger.php`,
        },
        manufacturing: {
          "bom-list": `${this.basePath}/client/pages/manuacturing/bill_of_material/list.php`,
          "unit-measurement": `${this.basePath}/client/pages/manuacturing/unit_measurement/index.php`,
          "machine-setup": `${this.basePath}/client/pages/manuacturing/machine_setup/index.php`,
          "production-order": `${this.basePath}/client/pages/manuacturing/production_order/list.php`,
          "wip-management": `${this.basePath}/client/pages/manuacturing/wip_management/list.php`,
          "production-completion": `${this.basePath}/client/pages/manuacturing/production_completion/list.php`,
          "production-expenses": `${this.basePath}/client/pages/manuacturing/production_expenses/list.php`,
        },
        "master-setup": {
          "branch-setup": `${this.basePath}/client/pages/master_setup/branch_setup/branch-list.php`,
          "territory-setup": `${this.basePath}/client/pages/master_setup/territory_setup/territory-add.php`,
          "rate-list-setup": `${this.basePath}/client/pages/master_setup/rate_list/list-list.php`,
        },
        "system-setup": {
          "backup-restore": `${this.basePath}/server/backup/generate_backup.php`,
          "company-profile": `${this.basePath}/client/pages/system_setup/company-profile/company-list.php`,
          "admin-panel": `${this.basePath}/client/pages/system_setup/admin_panel/panel.php`,
          "currency-setup": `${this.basePath}/client/pages/system_setup/currency_setup/currency-list.php`,
          "software-info": `${this.basePath}/client/pages/system_setup/software_info/software-info.php`,
        },
      };

      if (routes[section] && routes[section][action]) {
        window.location.href = routes[section][action];
      }
    }

    async loadPermissions() {
      try {
        const response = await fetch(`${this.basePath}/server/api/get_user_permissions.php`);
        const data = await response.json();
        if (data.permissions) {
          this.permissions = data.permissions;
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    }

    applyPermissions() {
      const actionMap = {
        'customer-add': 'New Customer',
        'supplier-add': 'New Supplier',
        'sale-invoice': 'Sale Invoice',
        'pos-invoice': 'POS Invoice',
        'sale-order': 'Sale Order',
        'sale-return': 'Sale Return',
        'sale-reports': 'Sale Reports',
        'purchase-order': 'Purchase Order',
        'new-invoice': 'New Purchase',
        'purchase-tax-invoice': 'Purchase Tax Invoice',
        'purchase-return': 'Purchase Return',
        'purchase-reports': 'Purchase Reports',
        'new-product': 'New Product',
        'stock-adjustment': 'Stock Adjustment',
        'stock-transfer': 'Stock Transfer',
        'stock-position': 'Stock Position',
        'inward-gatepass': 'Inward Gatepass',
        'outward-gatepass': 'Outward Gatepass',
        'receive-voucher': 'Receive Voucher',
        'payment-voucher': 'Payment Voucher',
        'expense-voucher': 'Expense Voucher',
        'journal-entry': 'Journal Entry',
        'cash-opening': 'Cash Opening',
        'new-bank': 'New Bank',
        'post-dated-cheques': 'Post Dated Cheques (PDCs)',
        'rent-issue': 'Issue Rent',
        'rent-list': 'Rent List',
        'general-ledger': 'General Ledger',
        'customer-ledger': 'Customer Ledger',
        'supplier-ledger': 'Supplier Ledger',
        'trial-balance': 'Trial Balance',
        'balance-sheet': 'Balance Sheet',
        'profit-loss': 'Profit & Loss Statement',
        'cash-flow': 'Cash Flow',
        'customer-aging': 'Customer Aging',
        'vendor-aging': 'Supplier Aging',
        'recovery-sheet': 'Recovery Sheet',
        'sales-officer-recovery': 'Sales Officer-wise Recovery',
        'pending-dsr-sheet': 'Pending DSR Sheet',
        'financial-summary': 'Financial Summary',
        'new-employee': 'New Employee',
        'record-attendance': 'Record Attendance',
        'new-payroll': 'New Payroll',
        'employees-ledger': 'Employees Ledger',
        'branch-setup': 'Branch Setup',
        'territory-setup': 'Territory Setup',
        'rate-list-setup': 'Rate List Setup',
        'daily-sale-report': 'Daily Sale Report',
        'company-profile': 'Company Profile',
        'admin-panel': 'Admin Panel',
        'currency-setup': 'Currency Setup',
        'software-info': 'Software Info',
        'bom-list': 'Bill of Materials (BOM)',
        'unit-measurement': 'Unit Measurement',
        'machine-setup': 'Machine Setup',
        'production-order': 'Production Order',
        'wip-management': 'WIP Management',
        'production-completion': 'Production Completion',
        'production-expenses': 'Production Expenses'
      };

      document.querySelectorAll('[data-section]').forEach(el => {
        const section = el.getAttribute('data-section');

        if (section === 'home') {
          return;
        } else if (section === 'chartofaccounts') {
          const hasPermission = this.permissions['Chart Of Accounts'] ||
            this.permissions['Chart of Accounts'] ||
            this.permissions['ChartOfAccounts'] ||
            this.permissions['chart_of_accounts'];
          console.log('Chart of Accounts permission check:', hasPermission);
          if (!hasPermission) {
            el.style.display = 'none';
          }
        } else {
          const dropdown = el.querySelector('.dropdown-content');
          if (dropdown) {
            dropdown.querySelectorAll('[data-action]').forEach(btn => {
              const action = btn.getAttribute('data-action');
              const formName = actionMap[action];
              if (!this.permissions[formName]) {
                btn.style.display = 'none';
              }
            });

            const visibleItems = Array.from(dropdown.querySelectorAll('[data-action]')).filter(b => b.style.display !== 'none');
            if (visibleItems.length === 0) {
              el.style.display = 'none';
            }
          }
        }
      });
    }

    async loadCompanyInfo() {
      try {
        const response = await fetch(`${this.basePath}/server/api/get_company_info.php`);
        const data = await response.json();

        const companyNameEl = document.querySelector('.company-text h1');
        const companyDescEl = document.querySelector('.company-text span');
        const companyLogoEl = document.querySelector('.company-logo');
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const userAvatarEl = document.querySelector('.user-avatar i');

        if (companyNameEl && data.company_name) {
          companyNameEl.textContent = data.company_name;
        }
        if (companyDescEl && data.legal_name) {
          companyDescEl.textContent = data.legal_name;
        }
        if (companyLogoEl && data.logo_url) {
          companyLogoEl.src = `${this.basePath}/client/assets/uploads/company_logo/${data.logo_url}`;
          companyLogoEl.style.display = 'block';
        }
        if (userNameEl && data.user_name) {
          userNameEl.textContent = data.user_name;
        }
        if (userRoleEl && data.user_role) {
          userRoleEl.textContent = data.user_role;
        }
        if (userAvatarEl && data.profile_picture) {
          const img = document.createElement('img');
          img.src = `${this.basePath}/client/assets/uploads/profile_picture/${data.profile_picture}`;
          img.style.width = '24px';
          img.style.height = '24px';
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
          userAvatarEl.parentNode.replaceChild(img, userAvatarEl);
        }
        if (data.timezone) {
          this.timezone = data.timezone;
        }
        if (data.subscription_status) {
          console.log('Subscription status:', data.subscription_status);
          this.subscriptionStatus = data.subscription_status;
          this.tenantId = data.tenant_id;
          this.updateSubscriptionBanner(data.subscription_status);
          if (data.subscription_status === 'expired' || data.subscription_status === 'trial_expired') {
            this.lockNavigation();
          }
        }
      } catch (error) {
        console.error('Failed to load company info:', error);
      }
    }

    updateSubscriptionBanner(status) {
      const banner = document.getElementById('subscription-banner');
      if (!banner) return;

      const messages = {
        trialing: 'THIS IS A TRIAL/DEMO ACCOUNT',
        trial_expired: `TRIAL ACCOUNT HAS BEEN EXPIRED - <a href="${this.basePath}/client/pages/auth/checkout.html?tenant_id=${this.tenantId}" style="color:white;text-decoration:underline;font-weight:700;">RENEW NOW</a>`,
        expired: `SUBSCRIPTION HAS BEEN EXPIRED - <a href="${this.basePath}/client/pages/auth/checkout.html?tenant_id=${this.tenantId}" style="color:white;text-decoration:underline;font-weight:700;">RENEW NOW</a>`
      };

      if (messages[status]) {
        banner.innerHTML = messages[status];
        banner.className = `subscription-banner ${status}`;
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    }

    lockNavigation() {
      const overlay = document.createElement('div');
      overlay.id = 'subscription-expired-overlay';
      overlay.innerHTML = `
        <div class="expired-modal">
          <div class="expired-icon">🔒</div>
          <h2>Subscription Expired</h2>
          <p>Your subscription has expired. Please renew to continue using LedgerOne ERP.</p>
          <div class="expired-actions">
            <a href="${this.basePath}/client/pages/auth/checkout.html?tenant_id=${this.tenantId}" class="btn-renew">Renew Subscription</a>
            <a href="${this.basePath}/server/api/auth/logout.php" class="btn-logout">Logout</a>
          </div>
        </div>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        #subscription-expired-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.95);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }
        .expired-modal {
          background: var(--surface-0);
          padding: 48px;
          border-radius: 16px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .expired-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        .expired-modal h2 {
          font-size: 28px;
          color: var(--text-heading);
          margin-bottom: 16px;
        }
        .expired-modal p {
          font-size: 16px;
          color: var(--text-body);
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .expired-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        .btn-renew, .btn-logout {
          padding: 14px 32px;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          font-size: 16px;
          transition: all 0.2s;
        }
        .btn-renew {
          background: var(--primary-color);
          color: white;
        }
        .btn-renew:hover {
          background: var(--primary-hover);
          transform: translateY(-2px);
        }
        .btn-logout {
          background: var(--surface-2);
          color: var(--text-body);
        }
        .btn-logout:hover {
          background: var(--border-strong);
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(overlay);
    }

    initClock() {
      this.timezone = this.timezone || 'UTC';
      this.updateClock();
      setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
      const timeEl = document.getElementById('clock-time');
      const dateEl = document.getElementById('clock-date');
      if (!timeEl || !dateEl) return;

      const now = new Date();
      const options = { timeZone: this.timezone, hour12: true };

      const time = now.toLocaleTimeString('en-US', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const date = now.toLocaleDateString('en-US', { ...options, weekday: 'short', month: 'short', day: 'numeric' });

      timeEl.textContent = time;
      dateEl.textContent = date;
    }

    highlightCurrentPage() {
      const currentPath = window.location.pathname;

      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("active");
      });

      if (currentPath.includes("/dashboard/")) {
        document.querySelector('[data-section="home"]')?.classList.add("active");
      } else if (currentPath.includes("/charts_of_account/")) {
        document.querySelector('[data-section="chartofaccounts"]')?.classList.add("active");
      } else {
        document.querySelectorAll(".dropdown-content button").forEach((item) => {
          const action = item.getAttribute("data-action");
          if (action && currentPath.includes(action.replace("-", "_"))) {
            item.closest(".nav-dropdown").querySelector(".dropdown-trigger").classList.add("active");
          }
        });
      }
    }
  }

  window.DashboardCore = new DashboardCore();
  window.navigateTo = (section) => window.DashboardCore.navigateTo(section);
  window.navigateToAction = (section, action) => window.DashboardCore.navigateToAction(section, action);
})();
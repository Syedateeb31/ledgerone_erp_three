<?php
/**
 * Dashboard Include - Single include for all forms
 * This file provides a consistent way to include the dashboard across all pages
 */
?>

<!-- Dashboard Container -->
<div id="navbar-container"></div>

<!-- Load Dashboard with Cache Busting -->
<script>
// Cache busting for development
const dashboardVersion = new Date().getTime();
const dashboardScript = document.createElement('script');
dashboardScript.src = '/ledgerone_erp/client/assets/js/dashboard/dashboard-core.js?v=' + dashboardVersion;
dashboardScript.async = false;
document.head.appendChild(dashboardScript);
</script>

<!-- FontAwesome for Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

<style>
/* Ensure content doesn't overlap with compact nav */
.main-content {
    margin-left: 60px;
    padding: 20px;
    transition: margin-left 0.3s ease;
}

@media (max-width: 768px) {
    .main-content {
        margin-left: 0;
    }
}

/* Override any existing navigation styles */
.content {
    margin-left: 60px !important;
}

/* Hide old navigation if present */
nav:not(.compact-nav) {
    display: none !important;
}
</style>

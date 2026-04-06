/**
 * Dashboard Loader - Cache-busting loader for dashboard core
 * This file ensures the dashboard always loads the latest version
 */

(function() {
    'use strict';
    
    // Prevent multiple loads
    if (window.dashboardLoaded) {
        return;
    }
    
    window.dashboardLoaded = true;
    
    // Cache busting timestamp
    const timestamp = new Date().getTime();
    
    // Load dashboard core with cache busting
    const script = document.createElement('script');
    script.src = '/ledgerone_erp/client/assets/js/dashboard/dashboard-core.js?v=' + timestamp;
    script.async = false;
    
    // Add error handling
    script.onerror = function() {
        console.error('Failed to load dashboard core');
    };
    
    script.onload = function() {
        console.log('Dashboard core loaded successfully');
    };
    
    document.head.appendChild(script);
    
})();
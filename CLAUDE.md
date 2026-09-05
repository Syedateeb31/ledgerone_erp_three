# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LedgerOne ERP: a multi-tenant ERP system for Distributors, Retailers, Wholesalers, Manufacturers, and SMEs. Core modules: Accounting, Inventory, HRM, Production, and Reporting.

## Tech Stack

- Core PHP (no framework) with PDO/MySQL, served directly by Apache (XAMPP) — no build step
- MySQL
- Vanilla HTML/CSS/JavaScript (no bundler, no frontend framework)
- Composer for two PHP libraries: `dompdf/dompdf` (PDF generation) and `picqer/php-barcode-generator` (barcodes)

There is no test suite, linter, or build/watch command configured in this repo. There's nothing to run beyond starting Apache/MySQL (e.g. via XAMPP) and hitting pages directly in the browser at `http://localhost/ledgerone_erp_three/...`. When adding PHP dependencies, run `composer install`/`composer require`.

## Code Style

- Use camelCase for variables and function names.
- Use PascalCase for component names.
- Use kebab-case for file names.

## Project Structure

- `client/`: Frontend files.
  - `assets/css/`, `assets/js/`: Mirror the `pages/` module layout (e.g. `assets/js/purchase/purchase_invoice/purchase-add.js` backs `pages/purchase/purchase_invoice/purchase-add.php`).
  - `assets/uploads/`: Uploaded images.
  - `pages/`: PHP/HTML frontend pages, organized by module (`purchase/`, `sale/`, `inventory/`, `hrm/`, `manuacturing/` [sic], `financial_reports/`, `banking/`, `vouchers/`, `system_setup/`, `master_setup/`, `customer_supplier/`, `chart_of_accounts/`, `auth/`, etc).
- `server/api/`: Backend JSON endpoints, mirroring the same module layout 1:1 with `client/pages/` (e.g. `server/api/purchase/purchase_invoice/purchase-add.php` handles the form at `client/pages/purchase/purchase_invoice/purchase-add.php`). Each feature folder typically has one endpoint per operation: `*-add.php`, `*-edit.php`, `*-delete.php`, `*-list.php`, plus small `get-*.php` lookup endpoints for dropdowns (companies, currencies, UOM, etc).
- `includes/`: Shared includes used by most pages — `connection.php` (single-tenant PDO connection, gitignored/environment-specific), `dashboard.php` (injects the shared navbar/dashboard shell, gitignored), `permissions.php` and `check_permission.php` (two different `hasPermission()` implementations with different signatures — check which one a file actually includes before reusing it), `encryption.php`.
- `database/`: Base schema dumps (`ledgerone_public.sql`, `ledgerone_tenant.sql`, `costing_schema.sql`) plus `database/migrations/` (mostly raw `.sql`, some `.php` migration scripts, no migration runner/framework — apply manually, see `run_migration.php` for an example one-off runner). There is also a legacy top-level `migrations/` folder.
- `documentation/`: Architecture notes, including `TAXATION_ARCHITECTURE_GUIDE.md` (POS invoice item-level vs invoice-level tax system) and the light/dark UI design system specs (`ledgerone_erp_ds_light.md`, `ledgerone_erp_ds_dark.md` — color tokens, component styles).
- `errors/`: Custom error pages wired up via `.htaccess` (`ErrorDocument` directives for 400/401/403/404/405/408/500/502/503/504).
- `fpdf`, `vendor/`: Third-party libraries (fpdf is vendored directly; the rest come from Composer).

## Architecture

**Multi-tenant, two-database design.** `server/api/auth/login.php` is the clearest reference implementation:
- A **public** database (`ledgerone_public`, via `DB_PUBLIC`) holds tenant/subscription/billing data (`tenants`, `subscriptions`).
- A **tenant** database (`ledgerone_tenant`, via `DB_TENANT`) holds business data (`users`, `role_permissions`, `companies`, and all operational tables), scoped by a `tenant_id` column present on most tables.
- DB credentials/names come from `$_ENV` with hardcoded local fallbacks (`admin`/`admin`, `localhost`) — see `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_PUBLIC`, `DB_TENANT` in `login.php`. Most other files instead use the simpler `includes/connection.php`, which opens a single hardcoded PDO connection straight to `ledgerone_tenant`.
- Auth is PHP native session-based (`session_start()`), not tokens: `$_SESSION['user_id']` and `$_SESSION['tenant_id']` are set on login and checked on nearly every page/endpoint. A missing `user_id`/`tenant_id` means redirect-to-login (pages) or a 401 JSON response (API endpoints).
- Permissions are role-based: `user_roles` maps a user to a `role_id`; `role_permissions` maps `(role_id, category, form_name[, sub_permission])` to `allowed`. Two separate helper files implement `hasPermission()` differently (`includes/permissions.php` vs `includes/check_permission.php`) — confirm which is included in a given file rather than assuming.

**Page ↔ API pairing.** Each frontend page under `client/pages/<module>/<feature>/` has a matching backend folder under `server/api/<module>/<feature>/` with the same feature name. Pages are plain PHP files that gate on session/permissions, render HTML, and enqueue matching CSS/JS from `client/assets/`; all data fetching/mutation happens client-side via `fetch()` calls to the JSON endpoints in `server/api/`, not server-side rendering of query results. Endpoints follow a consistent shape: set JSON + CORS headers, verify HTTP method, `session_start()` and check `user_id`/`tenant_id`, validate input, then use `$pdo->beginTransaction()` for multi-table writes (e.g. invoice header + line items).

**App base path.** The app is expected to be served from `/ledgerone_erp_three/` (matches the htdocs folder name) — some includes reference absolute paths like `/ledgerone_erp_three/client/assets/js/dashboard/dashboard-core.js`.

**Environment-specific files are gitignored** (not just secrets): `includes/connection.php`, `includes/dashboard.php`, `server/api/auth/login.php`, `server/api/auth/register.php`, `server/api/auth/checkout.php`, and two dashboard JS files. These exist on disk locally but won't show up in `git status`/diffs — don't assume they're untouched just because git shows no changes, and don't expect changes to them to be committable.

**Taxation system.** POS/sale invoices support two independent tax layers — item-level (per line item, driven by `dataset.taxRate`/`dataset.formulaTemplate`) and invoice-level (applied to the invoice's net amount, driven by tax regimes with `application_level`). See `documentation/TAXATION_ARCHITECTURE_GUIDE.md` before touching tax calculation code in `pos_invoice`, `purchase_invoice`, `sale_order`, etc.

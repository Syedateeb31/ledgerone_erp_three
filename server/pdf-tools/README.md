# PDF generation tool

Renders app pages (invoices, ledgers) to PDF via headless Chromium, invoked
by `server/api/shared/generate-pdf.php`. Used by the "Download PDF" buttons
across Sale Invoice, Purchase Invoice, Soda Book Buyer/Seller, Customer
Ledger, Supplier Ledger, and Both Ledger.

## Why this exists

wkhtmltopdf (a common lighter-weight alternative) was tried first, but its
bundled rendering engine doesn't support `fetch()` or modern JS - the same
JS every print/report page in this app already uses to load its data. It
hung indefinitely on the first JS error. Headless Chromium (via Playwright)
runs the exact same engine as a real browser, so the print pages work
unmodified.

## Production setup (one-time, per server)

Requires Node.js (any recent LTS) installed on the server, in addition to
the existing PHP/MySQL/Apache stack.

```bash
cd server/pdf-tools
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

`PLAYWRIGHT_BROWSERS_PATH=0` installs the Chromium binary inside this
folder's `node_modules` rather than the current OS user's home directory -
important because the web server process (Apache/PHP-FPM) usually runs as a
different system user (e.g. `www-data`) than whoever ran `npm install`
interactively, and would otherwise look for the browser in the wrong place.

`server/api/shared/generate-pdf.php` also sets this env var at runtime
before invoking Node, so it's redundant safety, not strictly required to
repeat manually - but running the install command as above keeps the two
in sync.

## How a page opts in

1. The print/report page fires `window.__pdfReady = true;` once its async
   data loading is finished (see the end of `loadData()` /
   `loadLedgerData()` in whichever page you're adding this to). The
   renderer waits for this flag (8s timeout fallback) before printing, so
   the PDF never captures a half-loaded page.
2. Whatever "Download PDF" button triggers this calls:
   ```js
   fetch(`.../server/api/shared/generate-pdf.php?path=<url-encoded relative path under client/pages/, with its own query string>&filename=<name>.pdf`)
   ```
   then saves the returned blob. See `pos-list.js`'s `downloadInvoicePdf()`
   for the reference implementation.

## Known limitation

`generate-pdf.php` calls `session_write_close()` before spawning the
renderer. This is required: PHP's default session handler holds an
exclusive file lock on the session for the duration of a request, and the
headless browser reuses the same session cookie to call the page's own API
endpoints - without releasing the lock first, those sub-requests deadlock
against the outer request that spawned the browser.

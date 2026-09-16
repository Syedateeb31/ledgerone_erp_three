/**
 * Renders a URL (an already-working app page, with its own JS-driven data
 * loading) to a PDF file using headless Chromium. Invoked by
 * server/api/shared/generate-pdf.php via a short-lived node process.
 *
 * Usage: node render-pdf.js <url> <outputPath> <cookieName> <cookieValue> <domain>
 *
 * The target page must set `window.__pdfReady = true;` once it has finished
 * populating its data - this script waits for that flag (with a fallback
 * timeout) before printing, so the PDF never captures a half-loaded page.
 */
const { chromium } = require('playwright');

async function main() {
    const [, , url, outputPath, cookieName, cookieValue, domain] = process.argv;
    if (!url || !outputPath || !cookieName || !cookieValue || !domain) {
        console.error('Usage: node render-pdf.js <url> <outputPath> <cookieName> <cookieValue> <domain>');
        process.exit(1);
    }

    const browser = await chromium.launch();
    try {
        const context = await browser.newContext();
        await context.addCookies([{
            name: cookieName,
            value: cookieValue,
            domain: domain,
            path: '/'
        }]);
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

        // Wait for the page's own "fully rendered" signal, falling back to a
        // fixed delay if the page never sets it (e.g. it errored).
        await page.waitForFunction('window.__pdfReady === true', { timeout: 8000 }).catch(() => {});

        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' }
        });
        await context.close();
    } finally {
        await browser.close();
    }
}

main().catch(e => {
    console.error('RENDER_ERROR:', e.message);
    process.exit(1);
});

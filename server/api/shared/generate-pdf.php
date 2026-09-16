<?php
/**
 * Shared PDF generator: renders an already-working print page (with its own
 * JS-driven data loading) through headless Chromium (via server/pdf-tools)
 * and streams the result back as a downloadable PDF. Reused by every
 * module's "PDF" button instead of re-implementing each report's layout in
 * a PDF library, so the PDF always matches whatever the print page renders.
 */

session_start();
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}
// Release the session file lock now: the headless browser we're about to
// launch will reuse this same session cookie to call other endpoints, and
// PHP's default session handler serializes requests sharing one session id
// (each holds an exclusive lock on the session file for its full duration).
// Holding it here would deadlock against those sub-requests.
$sessionName = session_name();
$sessionId   = session_id();
session_write_close();

$relativePath = $_GET['path'] ?? '';
$filename     = $_GET['filename'] ?? 'document.pdf';

// Only allow same-app pages under client/pages/ - no external hosts, no path traversal.
if ($relativePath === ''
    || strpos($relativePath, '..') !== false
    || preg_match('#^([a-z]+:)?//#i', $relativePath)
    || strpos($relativePath, 'client/pages/') !== 0
) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Invalid path']);
    exit;
}

// Resolve the app's base URL from this script's own path, so it works
// regardless of the folder name the app is deployed under.
$scriptDir   = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])); // .../server/api/shared
$appBasePath = preg_replace('#/server/api/shared$#', '', $scriptDir);
$scheme      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host        = $_SERVER['HTTP_HOST'];
$hostOnly    = preg_replace('/:\d+$/', '', $host); // strip port for the cookie domain
$fullUrl     = "$scheme://$host$appBasePath/$relativePath";

$nodeCandidates = [
    'C:\\Program Files\\nodejs\\node.exe',
    '/usr/bin/node',
    '/usr/local/bin/node',
];
$node = null;
foreach ($nodeCandidates as $candidate) {
    if (is_file($candidate)) { $node = $candidate; break; }
}
if (!$node) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'PDF engine (Node.js) not installed on this server']);
    exit;
}

$renderScript = __DIR__ . '/../../pdf-tools/render-pdf.js';
$tmpFile      = tempnam(sys_get_temp_dir(), 'pdf_') . '.pdf';

// The Chromium binary is installed inside server/pdf-tools/node_modules
// (PLAYWRIGHT_BROWSERS_PATH=0 at install time) rather than a per-OS-user
// profile cache, since the web server process (Apache/IIS) usually runs as
// a different system user than whoever ran `npm install` interactively.
putenv('PLAYWRIGHT_BROWSERS_PATH=0');

$cmd = escapeshellarg($node) . ' ' . escapeshellarg($renderScript)
    . ' ' . escapeshellarg($fullUrl)
    . ' ' . escapeshellarg($tmpFile)
    . ' ' . escapeshellarg($sessionName)
    . ' ' . escapeshellarg($sessionId)
    . ' ' . escapeshellarg($hostOnly);

exec($cmd . ' 2>&1', $output, $returnCode);

if ($returnCode !== 0 || !file_exists($tmpFile) || filesize($tmpFile) === 0) {
    if (file_exists($tmpFile)) unlink($tmpFile);
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'PDF generation failed', 'debug' => implode("\n", $output)]);
    exit;
}

$downloadName = preg_replace('/[^A-Za-z0-9 _.\-]/', '', basename($filename));
if ($downloadName === '' || substr($downloadName, -4) !== '.pdf') {
    $downloadName = 'document.pdf';
}

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $downloadName . '"');
header('Content-Length: ' . filesize($tmpFile));
header('Cache-Control: private, max-age=0, must-revalidate');
readfile($tmpFile);
unlink($tmpFile);
exit;

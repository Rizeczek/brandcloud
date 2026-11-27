<?php
/* Every request except /ds/* and /_sv/{login,logout,admin,api}.php ends up here (see /.htaccess).
   Logged-in users get the file; everyone else goes to the login page. */
require __DIR__ . '/lib.php';

if (!sv_config()) { http_response_code(503); sv_page('Not configured', '<p class="msg">Login is not configured yet (missing passwords). Add the GitHub secrets BC_ADMIN_PASSWORD and BC_VIEWER_PASSWORD and deploy again.</p>'); exit; }
sv_require('team');

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
// never serve dot-files, server internals or upload sources
if (preg_match('#(^|/)\.|^/_sv(/|$)#', $path)) { http_response_code(404); exit('Not found'); }

$root = realpath(SV_ROOT);
$file = realpath($root . $path);
if ($file !== false && is_dir($file)) {
    if (substr($path, -1) !== '/') { header('Location: ' . $path . '/' . (($q = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY)) ? '?' . $q : ''), true, 301); exit; }
    $file = realpath($file . '/index.html');
}
if ($file === false || strpos($file, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($file)) { http_response_code(404); exit('Not found'); }

$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
if (in_array($ext, ['php', 'phtml', 'phar', 'htaccess', 'htpasswd', 'ini', 'sh'], true)) { http_response_code(404); exit('Not found'); }
$types = [
    'html' => 'text/html; charset=utf-8', 'htm' => 'text/html; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'js' => 'text/javascript; charset=utf-8',
    'mjs' => 'text/javascript; charset=utf-8', 'json' => 'application/json; charset=utf-8', 'txt' => 'text/plain; charset=utf-8', 'md' => 'text/plain; charset=utf-8',
    'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp', 'avif' => 'image/avif', 'ico' => 'image/x-icon',
    'woff' => 'font/woff', 'woff2' => 'font/woff2', 'ttf' => 'font/ttf', 'otf' => 'font/otf', 'mp4' => 'video/mp4', 'webm' => 'video/webm', 'mp3' => 'audio/mpeg', 'wav' => 'audio/wav',
    'pdf' => 'application/pdf', 'csv' => 'text/csv; charset=utf-8', 'xml' => 'application/xml', 'wasm' => 'application/wasm', 'map' => 'application/json',
];
$mtime = filemtime($file);
$etag = '"' . dechex($mtime) . '-' . dechex(filesize($file)) . '"';
header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: strict-origin-when-cross-origin');
// private: never stored by Cloudflare or shared caches. HTML/JSON revalidate; versioned assets (?v=) may be cached by the browser.
header(in_array($ext, ['html', 'htm', 'json'], true) || !isset($_GET['v']) ? 'Cache-Control: private, no-cache' : 'Cache-Control: private, max-age=31536000, immutable');
header('ETag: ' . $etag);
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }
header('Content-Length: ' . filesize($file));
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') readfile($file);

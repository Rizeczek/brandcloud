<?php
/* BrandCloud prototypes – auth + storage helpers (PHP 7.4+).
   Roles: team (view) · admin (view + upload/delete). Passwords: GitHub secrets → _sv/data/config.php at deploy (hashes only).
   Login cookie is stateless: role|expiry|HMAC. The HMAC key lives in _sv/data/key.php, created on first run, never deployed. */

declare(strict_types=1);

const SV_ROOT = __DIR__ . '/..';
const SV_DATA = __DIR__ . '/data';
const SV_UPLOADS = SV_ROOT . '/u';
const SV_COOKIE = 'sv_auth';
const SV_TTL = 30 * 24 * 3600;   // stay logged in for 30 days
date_default_timezone_set('Europe/Prague');

function sv_config(): ?array {
    static $c = false;
    if ($c === false) {
        $f = SV_DATA . '/config.php';
        $c = is_file($f) ? (include $f) : null;
        if (!is_array($c) || empty($c['users']['admin']['hash']) || empty($c['users']['team']['hash'])) $c = null;
    }
    return $c;
}

function sv_key(): string {
    $f = SV_DATA . '/key.php';
    if (!is_file($f)) {
        if (!is_dir(SV_DATA)) mkdir(SV_DATA, 0750, true);
        $k = bin2hex(random_bytes(32));
        file_put_contents($f, "<?php return '" . $k . "';\n", LOCK_EX);
        @chmod($f, 0640);
    }
    return (string) (include $f);
}

function sv_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (strpos($_SERVER['HTTP_CF_VISITOR'] ?? '', 'https') !== false);
}

function sv_sign(string $data): string { return hash_hmac('sha256', $data, sv_key()); }

/** Current role ('admin' | 'team') or null. */
function sv_role(): ?string {
    static $role = false;
    if ($role !== false) return $role;
    $role = null;
    $cfg = sv_config();
    $c = $_COOKIE[SV_COOKIE] ?? '';
    if (!$cfg || !$c) return $role;
    $p = explode('|', $c);
    if (count($p) !== 3) return $role;
    [$r, $exp, $sig] = $p;
    if (!isset($cfg['users'][$r]) || (int) $exp < time()) return $role;
    $ver = $cfg['users'][$r]['ver'];                       // changes when the password changes → old cookies stop working
    if (hash_equals(sv_sign("$r|$exp|$ver"), $sig)) $role = $r;
    return $role;
}

function sv_login(string $role): void {
    $cfg = sv_config();
    $exp = time() + SV_TTL;
    $val = $role . '|' . $exp . '|' . sv_sign($role . '|' . $exp . '|' . $cfg['users'][$role]['ver']);
    setcookie(SV_COOKIE, $val, ['expires' => $exp, 'path' => '/', 'secure' => sv_https(), 'httponly' => true, 'samesite' => 'Lax']);
}

function sv_logout(): void {
    // clear both variants (behind Cloudflare the origin may see http or https), then ask the browser to drop cookies
    header('Cache-Control: no-store');
    foreach ([true, false] as $sec) setcookie(SV_COOKIE, '', ['expires' => 1, 'path' => '/', 'secure' => $sec, 'httponly' => true, 'samesite' => 'Lax']);
    header('Clear-Site-Data: "cookies"');
}

/** Only same-site relative paths are allowed as a post-login target. */
function sv_safe_next(?string $n): string {
    $n = (string) $n;
    if ($n === '' || $n[0] !== '/' || (isset($n[1]) && ($n[1] === '/' || $n[1] === '\\')) || strpbrk($n, "\r\n") !== false) return '/';
    return $n;
}

function sv_require(string $need = 'team'): string {
    $r = sv_role();
    if ($r === null) {
        header('Location: /_sv/login.php?next=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/'), true, 302);
        exit;
    }
    if ($need === 'admin' && $r !== 'admin') { http_response_code(403); sv_page('Admins only', '<p class="msg">This page needs the admin login. <a href="/_sv/logout.php?next=/_sv/admin.php">Log in as admin</a></p>'); exit; }
    return $r;
}

/* CSRF: token bound to the login cookie */
function sv_csrf(): string { return sv_sign('csrf|' . ($_COOKIE[SV_COOKIE] ?? '')); }
function sv_csrf_ok(): bool { return hash_equals(sv_csrf(), (string) ($_POST['csrf'] ?? '')); }

/* Login throttling: 5 failures per IP → wait 5 minutes */
function sv_throttle_file(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'x';
    return SV_DATA . '/throttle-' . substr(hash('sha256', $ip), 0, 16) . '.json';
}
function sv_throttled(): int {
    $f = sv_throttle_file();
    if (!is_file($f)) return 0;
    $t = json_decode((string) file_get_contents($f), true) ?: [];
    return ($t['n'] ?? 0) >= 5 && ($t['until'] ?? 0) > time() ? (int) $t['until'] - time() : 0;
}
function sv_fail(): void {
    $f = sv_throttle_file();
    $t = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
    if (($t['until'] ?? 0) < time() && ($t['n'] ?? 0) >= 5) $t = [];
    $t['n'] = ($t['n'] ?? 0) + 1;
    $t['until'] = time() + 300;
    file_put_contents($f, json_encode($t), LOCK_EX);
}
function sv_clear_fail(): void { @unlink(sv_throttle_file()); }

/* Uploaded prototypes registry */
function sv_registry(): array {
    $f = SV_DATA . '/uploads.json';
    $r = is_file($f) ? json_decode((string) file_get_contents($f), true) : [];
    return is_array($r) ? $r : [];
}
function sv_registry_save(array $r): void {
    if (!is_dir(SV_DATA)) mkdir(SV_DATA, 0750, true);
    file_put_contents(SV_DATA . '/uploads.json', json_encode(array_values($r), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function sv_rmdir(string $d): void {
    if (!is_dir($d)) return;
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($d, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST) as $f)
        $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
    rmdir($d);
}

function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

/** Minimal page shell for login/admin, styled with the BrandCloud DS. */
function sv_page(string $title, string $body, string $extraHead = ''): void {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Frame-Options: DENY');
    $logo = '<img src="/ds/logo.svg" width="132" height="28" alt="BrandCloud">';
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">'
        . '<title>' . h($title) . ' · BrandCloud prototypes</title><link rel="icon" href="/ds/logo-mark.svg" type="image/svg+xml">'
        . '<link rel="stylesheet" href="/ds/tokens.css"><link rel="stylesheet" href="/ds/base.css"><link rel="stylesheet" href="/ds/components.css">'
        . '<link rel="stylesheet" href="/ds/admin.css">' . $extraHead . '</head><body><main class="sva"><header class="sva__top"><a href="/" class="sva__logo">' . $logo . '</a><span class="sva__t">' . h($title) . '</span></header>'
        . $body . '</main></body></html>';
}

<?php
/* Uploader (admin only): manual Standalone prototypes, stored on the server in /u/<slug>/ (not in git, untouched by deploys). */
require __DIR__ . '/lib.php';
if (!sv_config()) { http_response_code(503); sv_page('Not configured', '<p class="msg">Login is not configured yet.</p>'); exit; }
sv_require('admin');

const MAX_FILES = 2000;
const MAX_UNZIPPED = 150 * 1024 * 1024;
const BLOCKED = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phar', 'cgi', 'pl', 'py', 'sh', 'htaccess', 'htpasswd', 'ini', 'exe', 'bat'];

function slugify(string $s): string {
    $t = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) : $s;
    $t = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', (string) $t), '-'));
    return substr($t !== '' ? $t : 'prototype', 0, 60);
}

function inject(string $html, array $meta): string {
    $head = '<meta name="robots" content="noindex, nofollow"><link rel="icon" href="/ds/logo-mark.svg" type="image/svg+xml">';
    $bar = '<script src="/ds/topbar.js" data-proto=\'' . h(json_encode(['title' => $meta['title'], 'slug' => $meta['slug'], 'state' => 'standalone'], JSON_UNESCAPED_UNICODE)) . '\'></script>';
    $html = preg_replace('#<script src="/ds/topbar\.js[^"]*"[^>]*></script>\s*#i', '', $html);   // re-upload of a page that already had one
    // prototypes made outside the site link the live DS by absolute URL – serve them same-origin here
    $html = preg_replace('#https?://brandcloud\.fraymz\.digital/(ds|data)/#i', '/$1/', $html);
    $html = stripos($html, '</head>') !== false ? preg_replace('#</head>#i', $head . "\n</head>", $html, 1) : $head . $html;
    // first thing in <body>, so the bar and its 36 px offset exist from the first paint (no jump)
    $html = preg_match('#<body[^>]*>#i', $html) ? preg_replace('#<body([^>]*)>#i', '<body$1>' . "\n" . $bar, $html, 1) : $bar . $html;
    if (!preg_match('#<title>#i', $html)) $html = preg_replace('#<head([^>]*)>#i', '<head$1><title>' . h($meta['title']) . '</title>', $html, 1);
    return $html;
}

/** Unpack the uploaded file into $dir. Returns an error message or ''. */
function unpack_upload(array $f, string $dir): string {
    $name = strtolower($f['name'] ?? '');
    $ext = pathinfo($name, PATHINFO_EXTENSION);
    if ($ext === 'html' || $ext === 'htm') {
        mkdir($dir, 0755, true);
        return move_uploaded_file($f['tmp_name'], $dir . '/index.html') ? '' : 'Could not save the file.';
    }
    if ($ext !== 'zip') return 'Upload an .html file or a .zip with index.html inside.';
    if (!class_exists('ZipArchive')) return 'The server has no ZIP support (PHP zip extension). Upload a single .html file instead.';
    $z = new ZipArchive();
    if ($z->open($f['tmp_name']) !== true) return 'The .zip file could not be opened.';
    if ($z->numFiles > MAX_FILES) return 'Too many files in the .zip (max ' . MAX_FILES . ').';
    // find index.html closest to the root; its folder becomes the prototype root
    $base = null; $total = 0;
    for ($i = 0; $i < $z->numFiles; $i++) {
        $st = $z->statIndex($i); $n = str_replace('\\', '/', $st['name']); $total += $st['size'];
        if (preg_match('#(^|/)__MACOSX/#', $n)) continue;
        if (preg_match('#(^|/)index\.html?$#i', $n)) { $b = substr($n, 0, strrpos($n, '/') === false ? 0 : strrpos($n, '/') + 1); if ($base === null || strlen($b) < strlen($base)) $base = $b; }
    }
    if ($total > MAX_UNZIPPED) return 'The .zip is too large when unpacked (max 150 MB).';
    if ($base === null) return 'No index.html found in the .zip.';
    mkdir($dir, 0755, true);
    for ($i = 0; $i < $z->numFiles; $i++) {
        $n = str_replace('\\', '/', $z->getNameIndex($i));
        if (substr($n, -1) === '/' || strpos($n, $base) !== 0) continue;
        $rel = substr($n, strlen($base));
        if ($rel === '' || preg_match('#(^|/)(\.|__MACOSX)#', $rel) || strpos($rel, '..') !== false || $rel[0] === '/' || preg_match('#^[a-z]:#i', $rel)) continue;
        if (in_array(strtolower(pathinfo($rel, PATHINFO_EXTENSION)), BLOCKED, true)) continue;
        if (preg_match('#^index\.htm$#i', $rel)) $rel = 'index.html';
        $out = $dir . '/' . $rel;
        if (!is_dir(dirname($out))) mkdir(dirname($out), 0755, true);
        $in = $z->getStream($n);
        if (!$in) continue;
        $fh = fopen($out, 'wb'); stream_copy_to_stream($in, $fh); fclose($fh); fclose($in);
    }
    $z->close();
    return is_file($dir . '/index.html') ? '' : 'No index.html found in the .zip.';
}

$msg = ''; $err = '';
$reg = sv_registry();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!sv_csrf_ok()) { $err = 'The form expired. Reload the page and try again.'; }
    elseif (($_POST['do'] ?? '') === 'delete') {
        $slug = (string) ($_POST['slug'] ?? '');
        foreach ($reg as $i => $p) if ($p['slug'] === $slug) { sv_rmdir(SV_UPLOADS . '/' . $slug); unset($reg[$i]); sv_registry_save($reg); $msg = '“' . $p['title'] . '” deleted.'; }
    } else {
        $title = trim((string) ($_POST['title'] ?? ''));
        $desc = trim((string) ($_POST['description'] ?? ''));
        $replace = (string) ($_POST['slug'] ?? '');
        $f = $_FILES['file'] ?? null;
        $up = $f['error'] ?? UPLOAD_ERR_NO_FILE;
        $existing = null;
        foreach ($reg as $i => $p) if ($replace !== '' && $p['slug'] === $replace) $existing = $i;
        if ($replace !== '' && $existing === null) $err = 'That prototype no longer exists.';
        elseif ($title === '' && $existing === null) $err = 'Name is required.';
        elseif ($up === UPLOAD_ERR_INI_SIZE || $up === UPLOAD_ERR_FORM_SIZE) $err = 'The file is larger than the server allows (' . ini_get('upload_max_filesize') . ').';
        elseif ($up === UPLOAD_ERR_NO_FILE) $err = 'Choose a file (.html or .zip).';
        elseif ($up !== UPLOAD_ERR_OK) $err = 'Upload failed (error ' . (int) $up . ').';
        else {
            if ($existing !== null) { $meta = $reg[$existing]; if ($title !== '') $meta['title'] = $title; if (isset($_POST['description'])) $meta['description'] = $desc; }
            else {
                $slug = slugify($title); $taken = array_column($reg, 'slug'); $s = $slug; $k = 2;
                while (in_array($s, $taken, true) || is_dir(SV_UPLOADS . '/' . $s)) $s = $slug . '-' . $k++;
                $meta = ['slug' => $s, 'title' => $title, 'description' => $desc, 'url' => '/u/' . $s . '/', 'state' => 'standalone', 'source' => 'upload', 'added' => date('c')];
            }
            $tmp = SV_UPLOADS . '/.tmp-' . bin2hex(random_bytes(6));
            if (!is_dir(SV_UPLOADS)) mkdir(SV_UPLOADS, 0755, true);
            $e = unpack_upload($f, $tmp);
            if ($e) { sv_rmdir($tmp); $err = $e; }
            else {
                file_put_contents($tmp . '/index.html', inject((string) file_get_contents($tmp . '/index.html'), $meta));
                $dest = SV_UPLOADS . '/' . $meta['slug'];
                sv_rmdir($dest); rename($tmp, $dest);
                $meta['updated'] = date('c');
                if ($existing !== null) $reg[$existing] = $meta; else $reg[] = $meta;
                sv_registry_save($reg);
                $msg = '“' . $meta['title'] . '” ' . ($existing !== null ? 'updated' : 'uploaded') . '. <a href="' . h($meta['url']) . '">Open</a>';
            }
        }
    }
    $reg = sv_registry();
}
usort($reg, function ($a, $b) { return strcmp($b['added'], $a['added']); });
$csrf = '<input type="hidden" name="csrf" value="' . h(sv_csrf()) . '">';
$limit = ini_get('upload_max_filesize');

$rows = '';
foreach ($reg as $p) {
    $rows .= '<li class="sva__row"><div class="sva__rt"><a href="' . h($p['url']) . '">' . h($p['title']) . '</a>'
        . ($p['description'] ? '<p>' . h($p['description']) . '</p>' : '')
        . '<small>' . h($p['url']) . ' · added ' . h(date('j M Y, H:i', strtotime($p['added']))) . (isset($p['updated']) && $p['updated'] !== $p['added'] ? ' · updated ' . h(date('j M Y, H:i', strtotime($p['updated'])))  : '') . '</small></div>'
        . '<details class="sva__more"><summary class="bc-btn bc-btn--secondary bc-btn--s">Replace</summary>'
        . '<form method="post" enctype="multipart/form-data" class="sva__inline">' . $csrf . '<input type="hidden" name="slug" value="' . h($p['slug']) . '">'
        . '<label class="sva__f"><span>Name</span><input name="title" value="' . h($p['title']) . '" required></label>'
        . '<label class="sva__f"><span>Description</span><input name="description" value="' . h($p['description']) . '"></label>'
        . '<label class="sva__f"><span>New file</span><input type="file" name="file" accept=".html,.htm,.zip" required></label>'
        . '<button class="bc-btn bc-btn--primary bc-btn--s">Replace</button></form></details>'
        . '<form method="post" onsubmit="return confirm(\'Delete “' . h(addslashes($p['title'])) . '”?\')">' . $csrf . '<input type="hidden" name="do" value="delete"><input type="hidden" name="slug" value="' . h($p['slug']) . '">'
        . '<button class="bc-btn bc-btn--ghost bc-btn--s sva__del">Delete</button></form></li>';
}

sv_page('Upload prototype', '
<nav class="sva__nav"><a href="/">← All prototypes</a><a href="/_sv/logout.php">Log out</a></nav>
' . ($msg ? '<p class="sva__ok" role="status">' . $msg . '</p>' : '') . ($err ? '<p class="sva__err" role="alert">' . h($err) . '</p>' : '') . '
<form class="sva__card" method="post" enctype="multipart/form-data">
  <h1>Upload a prototype</h1>
  <p class="sva__sub">Shown on the main page as <span class="bc-badge bc-badge--warning">Standalone</span> – not connected to the Full prototype.</p>
  ' . $csrf . '
  <label class="sva__f"><span>Name</span><input name="title" required maxlength="120" placeholder="e.g. Dashboards – new layout"></label>
  <label class="sva__f"><span>Description <em>optional</em></span><textarea name="description" rows="2" maxlength="400" placeholder="What is new or what to look at"></textarea></label>
  <label class="sva__f"><span>File</span><input type="file" name="file" accept=".html,.htm,.zip" required>
    <small>.html (single file) or .zip with index.html inside · max ' . h($limit) . '</small></label>
  <button class="bc-btn bc-btn--primary sva__go" type="submit">Upload</button>
</form>
<h2 class="sva__h2">Uploaded <span>' . count($reg) . '</span></h2>
' . ($rows ? '<ul class="sva__list">' . $rows . '</ul>' : '<p class="sva__empty">Nothing uploaded yet.</p>'));

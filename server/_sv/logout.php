<?php
require __DIR__ . '/lib.php';
sv_logout();
$next = sv_safe_next($_GET['next'] ?? '/');
header('Location: /_sv/login.php' . ($next !== '/' ? '?switch=1&next=' . rawurlencode($next) : ''), true, 302);

<?php
/* Writes the login config for the server (password hashes only). Used by the deploy workflow:
   BC_ADMIN_PASSWORD=… BC_VIEWER_PASSWORD=… php scripts/make-config.php > dist/_sv/data/config.php */
$a = getenv('BC_ADMIN_PASSWORD'); $t = getenv('BC_VIEWER_PASSWORD');
if (!$a || !$t) { fwrite(STDERR, "BC_ADMIN_PASSWORD and BC_VIEWER_PASSWORD must both be set (GitHub → Settings → Secrets → Actions)\n"); exit(1); }
if ($a === $t) { fwrite(STDERR, "Admin and viewer passwords must differ\n"); exit(1); }
$u = function ($p) { return ['hash' => password_hash($p, PASSWORD_BCRYPT, ['cost' => 11]), 'ver' => substr(hash_hmac('sha256', $p, 'brandcloud-pw-version'), 0, 16)]; };
echo "<?php\n// GENERATED at deploy – do not edit. Usernames: admin (upload), team (view).\nreturn " . var_export(['users' => ['admin' => $u($a), 'team' => $u($t)]], true) . ";\n";

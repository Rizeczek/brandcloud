<?php
require __DIR__ . '/lib.php';

$next = sv_safe_next($_GET['next'] ?? $_POST['next'] ?? '/');
$cfg = sv_config();
if (!$cfg) { http_response_code(503); sv_page('Not configured', '<p class="msg">Login is not configured yet. Add the GitHub secrets SV_ADMIN_PASSWORD and SV_VIEWER_PASSWORD and deploy again.</p>'); exit; }

$err = '';
$user = strtolower(trim((string) ($_POST['user'] ?? '')));
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if ($wait = sv_throttled()) {
        $err = 'Too many attempts. Try again in ' . ceil($wait / 60) . ' min.';
    } elseif (isset($cfg['users'][$user]) && password_verify((string) ($_POST['pass'] ?? ''), $cfg['users'][$user]['hash'])) {
        sv_clear_fail();
        sv_login($user);
        header('Location: ' . $next, true, 303);
        exit;
    } else {
        sv_fail();
        usleep(400000);
        $err = 'Wrong username or password.';
    }
} elseif (sv_role() !== null && !isset($_GET['switch'])) {
    header('Location: ' . $next, true, 302);
    exit;
}

sv_page('Log in', '
<form class="sva__card sva__login" method="post" action="/_sv/login.php">
  <h1>Log in</h1>
  <p class="sva__sub">BrandCloud design prototypes</p>
  ' . ($err ? '<p class="sva__err" role="alert">' . h($err) . '</p>' : '') . '
  <label class="sva__f"><span>Username</span><input name="user" autocomplete="username" required value="' . h($user) . '" ' . ($user ? '' : 'autofocus') . ' spellcheck="false" autocapitalize="none"></label>
  <label class="sva__f"><span>Password</span><input name="pass" type="password" autocomplete="current-password" required ' . ($user ? 'autofocus' : '') . '></label>
  <input type="hidden" name="next" value="' . h($next) . '">
  <button class="bc-btn bc-btn--primary sva__go" type="submit">Log in</button>
</form>');

<?php
/* GET /_sv/api.php → {role, uploads:[…]} for the signpost. */
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$role = sv_role();
if ($role === null) { http_response_code(401); echo json_encode(['role' => null]); exit; }
echo json_encode(['role' => $role, 'uploads' => sv_registry()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$aid = require_admin();
$id     = (int)(body()['id'] ?? 0);
$status = f('status');
if ($id <= 0) fail('No registration specified.');
if (!in_array($status, ['submitted','under_review','accepted','rejected'], true)) fail('Unknown status.');
$s = db()->prepare('SELECT h.admin_id FROM applications a JOIN hackathons h ON h.id = a.hackathon_id WHERE a.id = ?');
$s->execute([$id]);
$r = $s->fetch();
if (!$r) fail('Registration not found.', 404);
if (!is_superadmin() && (int)$r['admin_id'] !== $aid) fail('You do not have access to this registration.', 403);
db()->prepare('UPDATE applications SET status = ? WHERE id = ?')->execute([$status, $id]);
ok(['status' => $status]);

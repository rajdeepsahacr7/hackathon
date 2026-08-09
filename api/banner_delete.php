<?php
/**
 * Removes the banner image from a hackathon — clears banner_url and deletes the
 * file, so the card falls back to the default engraved-paper look.
 *
 * JSON body: { "id": 12 }
 */
require __DIR__ . '/_bootstrap.php';
require_method('POST');
require_same_origin();
$aid = require_admin();

$id = (int)(body()['id'] ?? 0);
if ($id <= 0) fail('No hackathon specified.');

$s = db()->prepare('SELECT admin_id, banner_url FROM hackathons WHERE id = ?');
$s->execute([$id]);
$row = $s->fetch();
if (!$row) fail('Hackathon not found.', 404);
if (!is_superadmin() && (int)$row['admin_id'] !== $aid) {
    fail('You do not own this hackathon.', 403);
}

db()->prepare('UPDATE hackathons SET banner_url = NULL WHERE id = ?')->execute([$id]);
banner_unlink($row['banner_url']);

ok();

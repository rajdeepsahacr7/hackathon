<?php
/**
 * Admin-only banner upload — the image that sits behind a hackathon card
 * (index.html, hackathons.html, organise_hackathon.html) and behind the hero
 * on hackathon-details.html.
 *
 * multipart/form-data:
 *   banner  (file, required)  jpg / png / webp / gif, 4 MB max
 *   id      (int, optional)   an existing hackathon to attach it to straight away
 *
 * With `id`, the hackathon's banner_url is updated immediately (and the image it
 * replaces is deleted). Without `id` — the create wizard, where the hackathon
 * does not exist yet — the file is just stored and its URL returned, for
 * hackathons_create.php to save as `bannerUrl` on "Finish Setup".
 *
 * Returns: { success: true, bannerUrl: "uploads/banners/hack-....jpg" }
 */
require __DIR__ . '/_bootstrap.php';
require_method('POST');
require_same_origin();
$aid = require_admin();

/* ---- did the file actually arrive? ---- */
if (!isset($_FILES['banner']) || !is_array($_FILES['banner'])) {
    fail('No image was uploaded.');
}
$file = $_FILES['banner'];

switch ((int)($file['error'] ?? UPLOAD_ERR_NO_FILE)) {
    case UPLOAD_ERR_OK:
        break;
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE:
        fail('That image is too large. Please keep it under 4 MB.', 413);
    case UPLOAD_ERR_NO_FILE:
        fail('No image was uploaded.');
    case UPLOAD_ERR_PARTIAL:
        fail('The upload was interrupted. Please try again.');
    default:
        fail('The server could not accept that upload. Please try again.', 500);
}

if (!is_uploaded_file($file['tmp_name'])) fail('That upload could not be verified.');
if ((int)$file['size'] <= 0)              fail('That image file is empty.');
if ((int)$file['size'] > BANNER_MAX_BYTES) {
    fail('That image is too large. Please keep it under 4 MB.', 413);
}

/* ---- is it really an image? Trust the bytes, never the sent filename/type ---- */
$info = @getimagesize($file['tmp_name']);
if ($info === false || empty($info['mime'])) {
    fail('That file is not a readable image. Use a JPG, PNG, WebP, or GIF.');
}
$allowed = banner_types();
$mime    = strtolower((string)$info['mime']);
if (!isset($allowed[$mime])) {
    fail('Unsupported image type. Use a JPG, PNG, WebP, or GIF.');
}
if ((int)$info[0] < 400 || (int)$info[1] < 200) {
    fail('That image is too small to sit behind a card. Use one at least 400 x 200 pixels.');
}

/* ---- if an id was given, check it exists and belongs to this admin first ---- */
$id  = (isset($_POST['id']) && is_numeric($_POST['id'])) ? (int)$_POST['id'] : 0;
$old = null;
if ($id > 0) {
    $s = db()->prepare('SELECT admin_id, banner_url FROM hackathons WHERE id = ?');
    $s->execute([$id]);
    $row = $s->fetch();
    if (!$row) fail('Hackathon not found.', 404);
    if (!is_superadmin() && (int)$row['admin_id'] !== $aid) {
        fail('You do not own this hackathon.', 403);
    }
    $old = $row['banner_url'];
}

/* ---- store it ---- */
$dir = banner_root();
if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
    fail('The uploads/banners folder does not exist and could not be created. '
       . 'Create it manually and make sure PHP can write to it.', 500);
}
if (!is_writable($dir)) {
    fail('The uploads/banners folder is not writable by PHP. Check its permissions.', 500);
}

$name = 'hack-' . ($id > 0 ? $id . '-' : '') . date('Ymd-His') . '-'
      . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
$dest = $dir . '/' . $name;

if (!@move_uploaded_file($file['tmp_name'], $dest)) {
    fail('The image could not be saved to uploads/banners. Check folder permissions.', 500);
}
@chmod($dest, 0644);

$url = BANNER_DIR_REL . '/' . $name;

/* ---- attach it now if we know which hackathon it belongs to ---- */
if ($id > 0) {
    try {
        db()->prepare('UPDATE hackathons SET banner_url = ? WHERE id = ?')->execute([$url, $id]);
    } catch (Throwable $e) {
        @unlink($dest);                      // don't leave an orphan behind
        throw $e;
    }
    banner_unlink($old);                     // the image this one replaces
}

ok(['bannerUrl' => $url, 'attached' => $id > 0]);

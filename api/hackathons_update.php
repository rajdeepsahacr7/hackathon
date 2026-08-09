<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$aid = require_admin();
$id = (int)(body()['id'] ?? 0);
if ($id <= 0) fail('No hackathon specified.');
$s = db()->prepare('SELECT admin_id, fields, banner_url FROM hackathons WHERE id = ?');
$s->execute([$id]);
$row = $s->fetch();
if (!$row) fail('Hackathon not found.', 404);
if (!is_superadmin() && (int)$row['admin_id'] !== $aid) fail('You do not own this hackathon.', 403);
$map = ['hackathonName'=>'name','hackathonAbout'=>'about','venue'=>'venue','mode'=>'mode',
        'applicationStart'=>'application_start','applicationEnd'=>'application_end',
        'hackathonStart'=>'hackathon_start','hackathonEnd'=>'hackathon_end','status'=>'status'];
$sets = []; $vals = []; $in = body();
foreach ($map as $k => $col) {
    if (!array_key_exists($k, $in)) continue;
    $v = f($k);
    if (in_array($col, ['application_start','application_end','hackathon_start','hackathon_end'], true)) {
        $v = fdate($k);
    }
    if ($col === 'mode'   && !in_array($v, ['online','offline','hybrid'], true))  continue;
    if ($col === 'status' && !in_array($v, ['draft','published','closed'], true)) continue;
    $sets[] = "$col = ?"; $vals[] = $v;
}
foreach (['teamMin'=>'team_min','teamMax'=>'team_max',
          'durationHours'=>'duration_hours','seats'=>'seats'] as $k => $col) {
    if (array_key_exists($k, $in)) { $sets[] = "$col = ?"; $vals[] = fint($k, 1); }
}
// An explicitly empty array is how the edit form says "no prizes / no judges",
// so store NULL and the details page hides that section.
if (isset($in['prizes']) && is_array($in['prizes'])) {
    $p = sanitize_prizes($in['prizes']);
    $sets[] = 'prizes = ?'; $vals[] = $p ? json_encode($p) : null;
}
if (isset($in['judges']) && is_array($in['judges'])) {
    $j = sanitize_judges($in['judges']);
    $sets[] = 'judges = ?'; $vals[] = $j ? json_encode($j) : null;
}
if (isset($in['fields']) && is_array($in['fields'])) {
    $f = array_merge(default_fields(), array_map('boolval', $in['fields']));
    $sets[] = 'fields = ?'; $vals[] = json_encode($f);
}
// Banner: only an explicitly empty string clears it. A non-empty value that
// isn't one of our own uploads/banners paths is rejected outright rather than
// stored or treated as "clear it" — the edit form posts this field on every
// save, so a bad value must never be able to wipe a good image.
$dropOldBanner = null;
if (array_key_exists('bannerUrl', $in)) {
    $raw = f('bannerUrl');
    $new = clean_banner_url($raw);
    if ($raw !== '' && $new === '') fail('That is not a valid uploaded banner image.');
    $cur = (string)$row['banner_url'];
    if ($new !== $cur) {
        $sets[] = 'banner_url = ?';
        $vals[] = ($new !== '' ? $new : null);
        $dropOldBanner = $cur;
    }
}
if (!$sets) fail('Nothing to update.');
$vals[] = $id;
db()->prepare('UPDATE hackathons SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
if ($dropOldBanner !== null) banner_unlink($dropOldBanner);
ok();

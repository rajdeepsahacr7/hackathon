<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$aid = require_admin();
$name = f('hackathonName');
if ($name === '')             fail('Please give the hackathon a name.');
if (mb_strlen($name) > 190)   fail('That name is too long (190 characters max).');
$appStart = fdate('applicationStart'); $appEnd = fdate('applicationEnd');
$hkStart  = fdate('hackathonStart');   $hkEnd  = fdate('hackathonEnd');
if ($appStart && $appEnd && $appStart > $appEnd) fail('Applications cannot close before they open.');
if ($hkStart && $hkEnd && $hkStart > $hkEnd)     fail('The hackathon cannot end before it begins.');
if ($appEnd && $hkStart && $appEnd > $hkStart)   fail('Applications must close on or before the hackathon starts.');
$mode = in_array(f('mode'), ['online','offline','hybrid'], true) ? f('mode') : 'online';
$teamMin = fint('teamMin', 2); $teamMax = fint('teamMax', 5);
if ($teamMin > $teamMax) fail('Minimum team size cannot exceed the maximum.');
$fields = [
    'fullName'        => fb('fieldFullName'),
    'bio'             => fb('fieldBio'),
    'gender'          => fb('fieldGender'),
    'domainExpertise' => fb('fieldDomainExpertise'),
    'skills'          => fb('fieldSkills'),
    'github'          => fb('fieldGithub'),
    'linkedin'        => fb('fieldLinkedin'),
    'phone'           => fb('fieldPhone'),
    'email'           => fb('fieldEmail'),
];
// Prize tiers and judges from the wizard's third step. Empty tiers / unnamed
// judges are dropped by the sanitizers, so an organiser who skipped that step
// simply gets no prize or judge section on the details page.
$prizes = sanitize_prizes(body()['prizes'] ?? null);
$judges = sanitize_judges(body()['judges'] ?? null);
// Uploaded ahead of the hackathon existing, via api/banner_upload.php with no id.
// Anything that isn't one of our own uploads/banners paths is dropped rather
// than rejected — a stale value in the wizard's localStorage shouldn't be able
// to block creating the hackathon, it just means no image.
$banner = clean_banner_url(f('bannerUrl'));
$st = db()->prepare(
 'INSERT INTO hackathons
   (admin_id,name,about,banner_url,mode,venue,team_min,team_max,duration_hours,seats,
    application_start,application_end,hackathon_start,hackathon_end,status,fields,prizes,judges)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$st->execute([
    $aid, $name, f('hackathonAbout'), ($banner !== '' ? $banner : null), $mode, f('venue'),
    $teamMin, $teamMax, fint('durationHours', 48), fint('seats', 200),
    $appStart, $appEnd, $hkStart, $hkEnd,
    in_array(f('status'), ['draft','published','closed'], true) ? f('status') : 'published',
    json_encode($fields),
    $prizes ? json_encode($prizes) : null,
    $judges ? json_encode($judges) : null,
]);
ok(['id' => (int)db()->lastInsertId()]);

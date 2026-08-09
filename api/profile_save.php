<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$pid = require_participant();
$in  = body();
$db  = db();
/* names live on the participants row */
$nameCols = ['firstName' => 'first_name', 'lastName' => 'last_name'];
$set = []; $vals = [];
foreach ($nameCols as $k => $col) {
    if (array_key_exists($k, $in)) { $set[] = "$col = ?"; $vals[] = f($k); }
}
if ($set) {
    $vals[] = $pid;
    $db->prepare('UPDATE participants SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
}
/* everything else lives on the profile row */
$map = ['aboutYou'=>'about_you','stream'=>'stream','branch'=>'branch',
        'institution'=>'institution','currentYear'=>'current_year',
        'phoneNumber'=>'phone_number','emailAddress'=>'email_address',
        'githubUsername'=>'github_username','linkedinUsername'=>'linkedin_username',
        'gender'=>'gender'];
$cols = []; $pv = [];
foreach ($map as $k => $col) {
    if (array_key_exists($k, $in)) { $cols[$col] = f($k); }
}
if (array_key_exists('skills', $in)) { $cols['skills'] = json_encode(fa('skills')); }
if (isset($cols['email_address']) && $cols['email_address'] !== ''
    && !filter_var($cols['email_address'], FILTER_VALIDATE_EMAIL)) {
    fail('Please enter a valid email address.');
}
if ($cols) {
    $db->prepare('INSERT IGNORE INTO participant_profiles (participant_id) VALUES (?)')->execute([$pid]);
    $sets = [];
    foreach ($cols as $col => $v) { $sets[] = "$col = ?"; $pv[] = $v; }
    $pv[] = $pid;
    $db->prepare('UPDATE participant_profiles SET ' . implode(', ', $sets) . ' WHERE participant_id = ?')
       ->execute($pv);
}
ok();

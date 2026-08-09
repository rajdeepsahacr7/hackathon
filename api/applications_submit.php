<?php
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_riddles.php';
require_method('POST'); require_same_origin();
$pid = require_participant();

/* The riddle gate. The lock on each step page is only the visible half —
   this is the half that matters. Without a solved row in riddle_progress
   for every section, no application is accepted, however the request was
   made. Editing the DOM or localStorage gets you exactly this error. */
$unsolved = riddle_unsolved_sections($pid);
if ($unsolved) {
    $names = array_map('riddle_section_label', $unsolved);
    json_out([
        'success'  => false,
        'error'    => 'Solve the riddle on each section before submitting. Still locked: '
                    . implode(', ', $names) . '.',
        'locked'   => $unsolved,
    ], 403);
}
$hid = (int)(body()['hackathonId'] ?? 0);
if ($hid <= 0) fail('No hackathon was specified for this application.');
$s = db()->prepare('SELECT * FROM hackathons WHERE id = ?');
$s->execute([$hid]);
$h = $s->fetch();
if (!$h) fail('That hackathon no longer exists.', 404);
$shaped = shape_hackathon($h);
if (!$shaped['applicationsOpen']) fail('Applications for this hackathon are closed.', 403);
$fields = $shaped['fields'];
$first = f('firstName'); $last = f('lastName');
$email = f('emailAddress'); $phone = f('phoneNumber');
/* collect skills from either an array or the legacy skill* checkbox keys */
$skills = fa('skills');
if (!$skills) {
    foreach (body() as $k => $v) {
        if (strpos($k, 'skill') === 0 && ($v === true || $v === 'true' || $v === 1)) {
            $skills[] = ucfirst(substr($k, 5));
        }
    }
}
if (!empty($fields['fullName']) && ($first === '' || $last === '')) fail('Please complete the "About you" section.');
if (!empty($fields['email'])) {
    if ($email === '') fail('Please provide an email address in the Contact section.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');
}
if (!empty($fields['phone']) && $phone === '')  fail('Please provide a phone number in the Contact section.');
if (!empty($fields['skills']) && !$skills)      fail('Please select at least one technical skill.');
if (!empty($fields['github']) && f('githubUsername') === '') fail('Please provide your GitHub username.');
$db = db();
$chk = $db->prepare('SELECT id, referral_code FROM applications WHERE hackathon_id = ? AND participant_id = ?');
$chk->execute([$hid, $pid]);
$existing = $chk->fetch();
$cols = [$first, $last, f('bio'), f('gender'), f('domainExpertise'),
         json_encode($skills), f('githubUsername'), f('linkedinUsername'),
         $phone, $email, f('address')];
if ($existing) {
    $db->prepare(
      'UPDATE applications SET first_name=?,last_name=?,bio=?,gender=?,domain_expertise=?,
              skills=?,github_username=?,linkedin_username=?,phone_number=?,email_address=?,address=?
       WHERE id = ?')->execute(array_merge($cols, [$existing['id']]));
    ok(['id' => (int)$existing['id'], 'referralCode' => $existing['referral_code'], 'updated' => true]);
}
for ($try = 0; $try < 5; $try++) {
    $code = referral_code();
    try {
        $db->prepare(
          'INSERT INTO applications
             (hackathon_id,participant_id,first_name,last_name,bio,gender,domain_expertise,
              skills,github_username,linkedin_username,phone_number,email_address,address,referral_code)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          ->execute(array_merge([$hid, $pid], $cols, [$code]));
        ok(['id' => (int)$db->lastInsertId(), 'referralCode' => $code, 'updated' => false]);
    } catch (PDOException $e) {
        if ($e->getCode() !== '23000') throw $e;   // not a duplicate — real error
    }
}
fail('Could not generate a unique referral code. Please try again.', 500);

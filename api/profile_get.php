<?php
require __DIR__ . '/_bootstrap.php';
require_method('GET');
$pid = require_participant();
$s = db()->prepare(
  'SELECT p.first_name, p.last_name, p.email, pr.*
     FROM participants p
     LEFT JOIN participant_profiles pr ON pr.participant_id = p.id
    WHERE p.id = ?');
$s->execute([$pid]);
$r = $s->fetch() ?: [];
ok(['profile' => [
    'firstName' => $r['first_name'] ?? '', 'lastName' => $r['last_name'] ?? '',
    'aboutYou' => $r['about_you'] ?? '', 'stream' => $r['stream'] ?? '',
    'branch' => $r['branch'] ?? '', 'institution' => $r['institution'] ?? '',
    'currentYear' => $r['current_year'] ?? '',
    'phoneNumber' => $r['phone_number'] ?? '',
    'emailAddress' => $r['email_address'] ?: ($r['email'] ?? ''),
    'githubUsername' => $r['github_username'] ?? '',
    'linkedinUsername' => $r['linkedin_username'] ?? '',
    'gender' => $r['gender'] ?? '', 'skills' => jdec($r['skills'] ?? ''),
]]);

<?php
declare(strict_types=1);

/* ================= CONFIG — edit these four for your MySQL ================= */
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'hackathon_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('APP_DEBUG', false);          // true while developing
/* ========================================================================== */

error_reporting(E_ALL);
ini_set('display_errors', APP_DEBUG ? '1' : '0');

if (session_status() === PHP_SESSION_NONE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => '/', 'domain' => '',
        'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax',
    ]);
    session_name('CIPHERSESS');
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

function json_out(array $p, int $code = 200) {
    http_response_code($code);
    echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function ok(array $p = [])              { json_out(array_merge(['success' => true], $p)); }
function fail(string $m, int $c = 400)  { json_out(['success' => false, 'error' => $m], $c); }

set_exception_handler(function ($e) {
    error_log((string)$e);
    json_out(['success' => false,
              'error' => APP_DEBUG ? $e->getMessage() : 'Something went wrong on the server.'], 500);
});

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            fail(APP_DEBUG ? $e->getMessage() : 'Database connection failed. Is MySQL running?', 500);
        }
    }
    return $pdo;
}

/* ---------- request helpers ---------- */
function body(): array {
    static $c = null;
    if ($c !== null) return $c;
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw !== false ? $raw : '', true);
    if (!is_array($data)) $data = $_POST;
    return $c = (is_array($data) ? $data : []);
}
function f(string $k, string $d = ''): string {
    $b = body();
    return (isset($b[$k]) && is_scalar($b[$k])) ? trim((string)$b[$k]) : $d;
}
function fb(string $k): bool {
    $v = body()[$k] ?? false;
    return $v === true || $v === 1 || $v === '1' || $v === 'true' || $v === 'on';
}
function fa(string $k): array {
    $v = body()[$k] ?? [];
    return is_array($v) ? array_values(array_filter(array_map(
        function ($x) { return is_scalar($x) ? trim((string)$x) : ''; }, $v))) : [];
}
function fint(string $k, int $d): int {
    $v = body()[$k] ?? null;
    return (is_numeric($v) && (int)$v > 0) ? (int)$v : $d;
}
function fdate(string $k) {
    $v = f($k);
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
}
function q(string $k, string $d = ''): string {
    return isset($_GET[$k]) && is_scalar($_GET[$k]) ? trim((string)$_GET[$k]) : $d;
}
function require_method(string $m) {
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== $m) fail('Method not allowed.', 405);
}
function require_same_origin() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') return;
    $src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    if ($src === '') return;                       // non-browser client (curl) — no CSRF risk
    $p = parse_url($src);
    $h = ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
    if (strcasecmp($h, (string)($_SERVER['HTTP_HOST'] ?? '')) !== 0) fail('Blocked: cross-origin request.', 403);
}

/* ---------- auth ---------- */
function participant_id(): int { return (int)($_SESSION['participant_id'] ?? 0); }
function admin_id(): int       { return (int)($_SESSION['admin_id'] ?? 0); }
function is_superadmin(): bool { return ($_SESSION['admin_role'] ?? '') === 'superadmin'; }
function require_participant(): int {
    $id = participant_id();
    if (!$id) fail('Please log in to continue.', 401);
    return $id;
}
function require_admin(): int {
    $id = admin_id();
    if (!$id) fail('Admin login required.', 401);
    return $id;
}
function login_as(string $kind, array $row) {
    session_regenerate_id(true);
    if ($kind === 'participant') {
        $_SESSION['participant_id'] = (int)$row['id'];
    } else {
        $_SESSION['admin_id']   = (int)$row['id'];
        $_SESSION['admin_role'] = $row['role'];
    }
}

/* ---------- throttling ---------- */
function throttle(string $identifier) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    db()->prepare('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 15 MINUTE)')->execute();
    $s = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND identifier = ?');
    $s->execute([$ip, $identifier]);
    if ((int)$s->fetchColumn() >= 8) fail('Too many failed attempts. Try again in 15 minutes.', 429);
}
function record_attempt(string $identifier) {
    db()->prepare('INSERT INTO login_attempts (ip, identifier, attempted_at) VALUES (?,?,NOW())')
        ->execute([$_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', $identifier]);
}
function clear_attempts(string $identifier) {
    db()->prepare('DELETE FROM login_attempts WHERE ip = ? AND identifier = ?')
        ->execute([$_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', $identifier]);
}

/* ---------- banner images ---------- */
define('BANNER_DIR_REL', 'uploads/banners');            // relative to the project root
define('BANNER_MAX_BYTES', 4 * 1024 * 1024);            // 4 MB per image

function banner_root(): string {                        // absolute path of uploads/banners
    return dirname(__DIR__) . '/' . BANNER_DIR_REL;
}

/** Allowed image types, keyed by the extension we save them as. */
function banner_types(): array {
    return ['image/jpeg' => 'jpg', 'image/png' => 'png',
            'image/webp' => 'webp', 'image/gif' => 'gif'];
}

/**
 * Only ever let a banner_url that looks exactly like one of ours into the DB —
 * this is what a card's background-image ends up being built from, so it must
 * never be able to hold a caller-supplied path, absolute URL, or `..` segment.
 */
function clean_banner_url(string $v): string {
    $v = trim($v);
    if ($v === '') return '';
    return preg_match('#^' . preg_quote(BANNER_DIR_REL, '#') . '/[A-Za-z0-9_-]+\.(jpg|png|webp|gif)$#', $v)
        ? $v : '';
}

/** Delete a banner file off disk, ignoring anything that isn't one of ours. */
function banner_unlink(?string $url) {
    $url = clean_banner_url((string)$url);
    if ($url === '') return;
    $path = dirname(__DIR__) . '/' . $url;
    if (is_file($path)) @unlink($path);
}

/* ---------- prizes + judges (JSON columns) ---------- */
/*
 * Both arrive as JSON arrays from the create wizard and the edit form. They go
 * straight into a LONGTEXT column and straight back out to the details page, so
 * clamp the shape here rather than trusting the client: fixed set of keys, a
 * cap on how many entries and how long each string is, and empty entries thrown
 * away so a half-filled form never publishes a blank card.
 *
 * Both return [] when there is nothing usable, which is what tells
 * hackathon-details.js to hide the section entirely.
 */
define('MAX_PRIZES', 6);
define('MAX_JUDGES', 12);
define('MAX_PERKS', 8);

/** Trim, collapse newlines/tabs, and cut to a sane length. */
function short_text($v, int $max): string {
    if (!is_scalar($v)) return '';
    $v = preg_replace('/\s+/u', ' ', trim((string)$v));
    return mb_substr($v, 0, $max);
}

function sanitize_prizes($in): array {
    if (!is_array($in)) return [];
    $out = [];
    foreach ($in as $p) {
        if (!is_array($p)) continue;
        $perks = [];
        if (isset($p['perks']) && is_array($p['perks'])) {
            foreach ($p['perks'] as $k) {
                $k = short_text($k, 120);
                if ($k !== '') $perks[] = $k;
                if (count($perks) >= MAX_PERKS) break;
            }
        }
        $amount = short_text($p['amount'] ?? '', 60);
        $award  = short_text($p['award']  ?? '', 120);
        // Nothing to show means nothing to store.
        if ($amount === '' && $award === '' && !$perks) continue;
        $out[] = [
            'place'  => short_text($p['place'] ?? '', 40),
            'icon'   => short_text($p['icon'] ?? '', 8),
            'amount' => $amount,
            'award'  => $award,
            'perks'  => $perks,
        ];
        if (count($out) >= MAX_PRIZES) break;
    }
    return $out;
}

function sanitize_judges($in): array {
    if (!is_array($in)) return [];
    $out = [];
    foreach ($in as $j) {
        if (!is_array($j)) continue;
        $name = short_text($j['name'] ?? '', 120);
        if ($name === '') continue;               // a judge with no name is not a judge
        $out[] = [
            'name'  => $name,
            'title' => short_text($j['title'] ?? '', 160),
            // Reserved for a future upload; only ever one of our own paths.
            'photo' => clean_banner_url((string)($j['photo'] ?? '')),
        ];
        if (count($out) >= MAX_JUDGES) break;
    }
    return $out;
}

/* ---------- misc ---------- */
function jdec($s, array $fallback = []): array {
    $v = json_decode((string)$s, true);
    return is_array($v) ? $v : $fallback;
}
function referral_code(): string {
    return 'CIP-' . strtoupper(bin2hex(random_bytes(3)));
}
function default_fields(): array {
    return ['fullName'=>true,'bio'=>false,'gender'=>false,'domainExpertise'=>true,
            'skills'=>true,'github'=>true,'linkedin'=>false,'phone'=>true,'email'=>false];
}
function shape_hackathon(array $r): array {
    return [
        'id' => (int)$r['id'], 'name' => $r['name'], 'about' => (string)$r['about'],
        'bannerUrl' => (string)$r['banner_url'], 'mode' => $r['mode'],
        'venue' => (string)$r['venue'],
        'teamMin' => (int)$r['team_min'], 'teamMax' => (int)$r['team_max'],
        'durationHours' => (int)$r['duration_hours'], 'seats' => (int)$r['seats'],
        'applicationStart' => $r['application_start'], 'applicationEnd' => $r['application_end'],
        'hackathonStart' => $r['hackathon_start'], 'hackathonEnd' => $r['hackathon_end'],
        'status' => $r['status'],
        'fields' => jdec($r['fields'], default_fields()),
        'prizes' => jdec($r['prizes']), 'judges' => jdec($r['judges']),
        'applicationsOpen' => (
            $r['status'] === 'published' &&
            (empty($r['application_start']) || $r['application_start'] <= date('Y-m-d')) &&
            (empty($r['application_end'])   || $r['application_end']   >= date('Y-m-d'))
        ),
    ];
}

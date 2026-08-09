SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS hackathon_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hackathon_db;

DROP TABLE IF EXISTS applications, participant_profiles, hackathons,
  participants, admins, contact_messages, newsletter_subscribers, login_attempts;

CREATE TABLE participants (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80)  NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admins (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  email         VARCHAR(190) NOT NULL UNIQUE,
  display_name  VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE participant_profiles (
  participant_id    INT UNSIGNED PRIMARY KEY,
  about_you         TEXT,
  stream            VARCHAR(120),
  branch            VARCHAR(120),
  institution       VARCHAR(190),
  current_year      VARCHAR(40),
  phone_number      VARCHAR(40),
  email_address     VARCHAR(190),
  github_username   VARCHAR(100),
  linkedin_username VARCHAR(100),
  gender            VARCHAR(40),
  skills            LONGTEXT,          -- JSON array
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_participant FOREIGN KEY (participant_id)
    REFERENCES participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE hackathons (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id          INT UNSIGNED NOT NULL,
  name              VARCHAR(190) NOT NULL,
  about             TEXT,
  banner_url        VARCHAR(255),
  mode              ENUM('online','offline','hybrid') NOT NULL DEFAULT 'online',
  venue             VARCHAR(255),
  team_min          TINYINT UNSIGNED NOT NULL DEFAULT 2,
  team_max          TINYINT UNSIGNED NOT NULL DEFAULT 5,
  duration_hours    SMALLINT UNSIGNED NOT NULL DEFAULT 48,
  seats             SMALLINT UNSIGNED NOT NULL DEFAULT 200,
  application_start DATE,
  application_end   DATE,
  hackathon_start   DATE,
  hackathon_end     DATE,
  status            ENUM('draft','published','closed') NOT NULL DEFAULT 'published',
  fields            LONGTEXT,          -- JSON object of enabled application fields
  prizes            LONGTEXT,          -- JSON array
  judges            LONGTEXT,          -- JSON array
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
  INDEX (admin_id), INDEX (status),
  CONSTRAINT fk_hack_admin FOREIGN KEY (admin_id)
    REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE applications (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hackathon_id      INT UNSIGNED NOT NULL,
  participant_id    INT UNSIGNED NOT NULL,
  first_name        VARCHAR(80),
  last_name         VARCHAR(80),
  bio               TEXT,
  gender            VARCHAR(40),
  domain_expertise  VARCHAR(190),
  skills            LONGTEXT,          -- JSON array
  github_username   VARCHAR(100),
  linkedin_username VARCHAR(100),
  phone_number      VARCHAR(40),
  email_address     VARCHAR(190),
  address           TEXT,
  referral_code     VARCHAR(20) NOT NULL UNIQUE,
  status            ENUM('submitted','under_review','accepted','rejected')
                      NOT NULL DEFAULT 'submitted',
  submitted_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_entry (hackathon_id, participant_id),
  CONSTRAINT fk_app_hack FOREIGN KEY (hackathon_id)
    REFERENCES hackathons(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_part FOREIGN KEY (participant_id)
    REFERENCES participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contact_messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80), last_name VARCHAR(80),
  email      VARCHAR(190) NOT NULL,
  role       VARCHAR(120), phone VARCHAR(40),
  message    TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE newsletter_subscribers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE login_attempts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip           VARCHAR(45)  NOT NULL,
  identifier   VARCHAR(190) NOT NULL,
  attempted_at DATETIME     NOT NULL,
  INDEX (ip, identifier, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which application riddles a participant has solved. The riddles and their
-- answers live in api/_riddles.php and never reach the browser; this table is
-- the server's record of who has earned their way past which section.
-- applications_submit.php refuses any application with a row missing here.
CREATE TABLE riddle_progress (
  participant_id INT UNSIGNED  NOT NULL,
  section        VARCHAR(32)   NOT NULL,   -- about | skills | links | contact
  solved         TINYINT(1)    NOT NULL DEFAULT 0,
  attempts       INT UNSIGNED  NOT NULL DEFAULT 0,
  last_wrong_at  DATETIME      NULL,
  solved_at      DATETIME      NULL,
  PRIMARY KEY (participant_id, section),
  CONSTRAINT fk_riddle_participant FOREIGN KEY (participant_id)
    REFERENCES participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed admin: username "admin", password "admin123" (change after first login)
INSERT INTO admins (username, email, display_name, password_hash, role) VALUES
('admin', 'admin@codedcipher.test', 'Rajdeep Saha',
 '$2y$10$e0NRzS9Rk3n0Q5V2yq0S4uZ0Zx1oW0M1r2r7T7c9wLJ1yqz0y2mYS', 'superadmin');

INSERT INTO hackathons
 (admin_id, name, about, mode, venue, team_min, team_max, duration_hours, seats,
  application_start, application_end, hackathon_start, hackathon_end, status,
  fields, prizes, judges)
VALUES
(1, 'The Deductive Engine',
 'AI and machine learning. Build models that reason, infer, and deduce as Holmes himself — finding patterns hidden in plain sight.',
 'hybrid', '221B Baker Street, London', 2, 5, 48, 200,
 '2026-01-05', '2026-02-20', '2026-03-06', '2026-03-08', 'published',
 '{"fullName":true,"bio":true,"gender":false,"domainExpertise":true,"skills":true,"github":true,"linkedin":true,"phone":true,"email":true}',
 '[{"place":"First Prize","icon":"🏆","amount":"$50,000","award":"The Holmes Award","perks":["Cash Prize per Team","Gold Deerstalker Trophy","1:1 Mentorship with Judges","Guaranteed Internship Interview"]},{"place":"Second Prize","icon":"🥈","amount":"$3,000","award":"The Watson Award","perks":["Cash Prize per Team","Silver Deerstalker Trophy","Mentorship Session","Internship Interview"]},{"place":"Third Prize","icon":"🥉","amount":"$1,500","award":"The Lestrade Award","perks":["Cash Prize per Team","Bronze Pipe Trophy","Cloud Credits","Exclusive Swag Kit"]}]',
 '[{"name":"Dr. Ada Hartley","title":"Principal Engineer","photo":""},{"name":"Miles Okoro","title":"Design Director","photo":""},{"name":"Priya Sen","title":"Head of ML","photo":""}]');

SET FOREIGN_KEY_CHECKS = 1;

Hackathon banner images uploaded by admins live here.

They are written by api/banner_upload.php, which only accepts real JPG / PNG /
WebP / GIF files (verified by reading the image header, not by trusting the
filename) up to 4 MB, and always renames them to hack-<id>-<date>-<random>.<ext>.
Nothing here is ever included or executed by PHP — see ../.htaccess.

This folder must be writable by the web server (Apache/PHP). On XAMPP for
Windows that is already the case. On Mac/Linux, if an upload fails with a
permissions error:

    chmod -R 775 uploads

Files are deleted automatically when a banner is replaced, removed, or when the
hackathon itself is deleted. Safe to empty by hand if you also clear the
hackathons.banner_url column.

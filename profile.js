 (function () {
    var dropdown = document.querySelector('.nav-user-dropdown');
    var trigger = dropdown.querySelector('.nav-user-trigger');
    var logoutLink = document.getElementById('logoutLink');

    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');

    function closeMenu() {
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
      var isOpen = dropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });

    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    if (logoutLink) {
      logoutLink.addEventListener('click', function (e) {
        e.preventDefault();
        closeMenu();
        fetch('api/logout.php', { method: 'POST' })
          .catch(function () { /* proceed to redirect regardless */ })
          .then(function () { window.location.href = 'index.html'; });
      });
    }

    // ----- Load the logged-in participant's real details -----
    var navUserName = document.getElementById('navUserName');
    var navUserAvatar = document.getElementById('navUserAvatar');
    var heroTitle = document.getElementById('heroTitle');
    var dossierAboutText = document.getElementById('dossierAboutText');
    var dossierFacts = document.getElementById('dossierFacts');

    fetch('api/me.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.participant) {
          window.location.href = 'login.html';
          return;
        }
        var fullName = (data.participant.firstName + ' ' + data.participant.lastName).trim();
        if (navUserName) navUserName.textContent = fullName.toUpperCase();
        if (heroTitle) heroTitle.textContent = fullName;
        if (navUserAvatar) {
          var initA = (data.participant.firstName || '').trim().charAt(0);
          var initB = (data.participant.lastName || '').trim().charAt(0);
          navUserAvatar.textContent = (initA + initB).toUpperCase() || 'U';
        }

        return fetch('api/profile_get.php').then(function (res) { return res.json(); });
      })
      .then(function (data) {
        if (!data || !data.success) return;
        var profile = data.profile;

        if (dossierAboutText && profile.aboutYou) {
          dossierAboutText.textContent = profile.aboutYou;
        }

        if (dossierFacts) {
          var extra = [];
          if (profile.institution) extra.push(['Institution', profile.institution]);
          if (profile.stream) extra.push(['Stream', profile.stream]);
          if (profile.branch) extra.push(['Branch', profile.branch]);
          if (profile.currentYear) extra.push(['Year', profile.currentYear]);
          if (profile.phoneNumber) extra.push(['Phone', profile.phoneNumber]);
          if (profile.emailAddress) extra.push(['Email', profile.emailAddress]);

          extra.forEach(function (pair) {
            var li = document.createElement('li');
            var label = document.createElement('span');
            label.className = 'label';
            label.textContent = pair[0];
            li.appendChild(label);
            li.appendChild(document.createTextNode(pair[1]));
            dossierFacts.appendChild(li);
          });
        }
      })
      .catch(function () {
        // Backend unreachable — leave the placeholder dossier text in place.
      });
  })();

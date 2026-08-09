/* Shared site behaviour: auth-aware navbar, consult form, newsletter. */

window.api = {
  get(url) { return fetch(url, { credentials: 'same-origin' }).then(r => r.json().then(d => ({ ok: r.ok, data: d }))); },
  post(url, payload) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    }).then(r => r.json().then(d => ({ ok: r.ok, data: d })));
  }
};

function initialsFor(participant, admin) {
  if (participant) {
    const a = (participant.firstName || '').trim().charAt(0);
    const b = (participant.lastName || '').trim().charAt(0);
    return (a + b).toUpperCase() || 'U';
  }
  const source = (admin.displayName || admin.username || '').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return source.slice(0, 2).toUpperCase() || 'A';
}

function renderUserNav(container, participant, admin) {
  const name = participant
    ? (participant.firstName + ' ' + participant.lastName).trim()
    : (admin.displayName || admin.username);
  const initials = initialsFor(participant, admin);

  const links = participant
    ? '<a href="profile.html">My Profile</a>' +
      '<a href="my-applications.html">My Applications</a>' +
      '<a href="about.html">Edit Profile</a>'
    : '<a href="organise_hackathon.html">Organiser Dashboard</a>' +
      '<a href="organise_hackathon.html">My Hackathons</a>' +
      '<a href="admin-registrations.html">Registrations</a>';

  const onLandingPage = (window.location.pathname.split('/').pop() || 'index.html') === 'index.html';
  const adminTag = (admin && onLandingPage) ? '<span class="nav-admin-tag">Welcome, Admin</span>' : '';

  container.innerHTML =
    adminTag +
    '<div class="nav-user-dropdown">' +
      '<button class="nav-user-trigger" type="button" aria-haspopup="true" aria-expanded="false">' +
        '<span class="nav-user-avatar">' + initials + '</span>' +
        '<span class="nav-user-name">' + name.toUpperCase() + '</span>' +
        '<span class="nav-user-caret">&#9662;</span>' +
      '</button>' +
      '<div class="nav-user-menu">' + links +
        '<a href="#" data-logout="' + (participant ? 'participant' : 'admin') + '">Logout</a>' +
      '</div>' +
    '</div>';

  const dd = container.querySelector('.nav-user-dropdown');
  const trigger = dd.querySelector('.nav-user-trigger');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dd.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', () => dd.classList.remove('open'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dd.classList.remove('open'); });

  dd.querySelector('[data-logout]').addEventListener('click', (e) => {
    e.preventDefault();
    const kind = e.currentTarget.getAttribute('data-logout');
    api.post(kind === 'admin' ? 'api/admin_logout.php' : 'api/logout.php')
       .catch(() => {})
       .then(() => { window.location.href = 'index.html'; });
  });
}

function initAuthNav() {
  const slot = document.querySelector('.nav-right');
  api.get('api/me.php').then(({ data }) => {
    if (slot && data.participant) renderUserNav(slot, data.participant, null);
    else if (slot && data.admin)  renderUserNav(slot, null, data.admin);
  }).catch(() => {});
}

function initConsultForm() {
  const form = document.querySelector('.consult-form');
  if (!form) return;

  let feedback = form.querySelector('.form-feedback');
  if (!feedback) {
    feedback = document.createElement('p');
    feedback.className = 'form-feedback';
    feedback.style.cssText = 'min-height:1.3em;margin-top:14px;font-family:"Courier Prime",monospace;font-size:.85rem;';
    form.appendChild(feedback);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('.submit-btn');
    const val = (sel) => { const el = form.querySelector(sel); return el ? el.value.trim() : ''; };

    feedback.textContent = '';
    if (btn) btn.disabled = true;

    api.post('api/contact_submit.php', {
      firstName: val('#firstName'), lastName: val('#lastName'),
      email: val('#email'), role: val('#role'), phone: val('#phone'),
      message: val('#message')
    }).then(({ ok, data }) => {
      if (btn) btn.disabled = false;
      if (ok && data.success) {
        feedback.style.color = '#7fbf7f';
        feedback.textContent = 'Thank you — the case is noted. We will be in touch.';
        form.reset();
      } else {
        feedback.style.color = '#d16a6a';
        feedback.textContent = (data && data.error) || 'Something went wrong. Please try again.';
      }
    }).catch(() => {
      if (btn) btn.disabled = false;
      feedback.style.color = '#d16a6a';
      feedback.textContent = 'Could not reach the server.';
    });
  });
}

function initNewsletter() {
  document.querySelectorAll('.newsletter-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.newsletter-input');
      const btn = form.querySelector('.newsletter-btn');
      const email = input ? input.value.trim() : '';
      if (!email) return;
      if (btn) btn.disabled = true;

      api.post('api/newsletter_subscribe.php', { email }).then(({ ok, data }) => {
        if (btn) btn.disabled = false;
        if (!input) return;
        if (ok && data.success) { input.value = ''; input.placeholder = 'Subscribed — thank you.'; }
        else { input.placeholder = (data && data.error) || 'Please try again.'; }
      }).catch(() => { if (btn) btn.disabled = false; });
    });
  });
}

function initLoginDropdown() {
  document.querySelectorAll('.nav-login-dropdown').forEach((dd) => {
    const btn = dd.querySelector('.nav-login-btn');
    if (!btn) return;
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('click', (e) => { e.stopPropagation(); dd.classList.toggle('open'); });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-login-dropdown.open').forEach((d) => d.classList.remove('open'));
  });
}

function markActiveNav() {
  const here = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-center a').forEach((a) => {
    if (a.getAttribute('href') === here) a.style.color = 'var(--gold-accent)';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthNav();
  initLoginDropdown();
  initConsultForm();
  initNewsletter();
  markActiveNav();
});

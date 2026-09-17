// Minimal vanilla-JS client for the three user faces.
let token = null;
let currentUser = null;
let candidatePhotoUrl = '';

const $ = (id) => document.getElementById(id);

async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(path, { method, headers, body: payload });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function setMsg(el, text, ok = false) {
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'error');
}

function csv(value) {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Upload a company logo file (if one is selected) and return its URL.
// Falls back to a pasted URL field if no file was chosen.
async function resolveLogo(fileInputId, urlInputId) {
  const fileInput = $(fileInputId);
  const file = fileInput && fileInput.files && fileInput.files[0];
  if (file) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await api('/api/uploads/image', { method: 'POST', body: fd, isForm: true });
    return res.url;
  }
  return urlInputId ? ($(urlInputId).value || '') : '';
}

function showFace() {
  $('auth-section').classList.add('hidden');
  ['candidate-face', 'mentor-face', 'admin-face'].forEach((id) => $(id).classList.add('hidden'));
  $('session').textContent = `${currentUser.email} · ${currentUser.role}`;
  $('btn-home').classList.remove('hidden');
  if (currentUser.role === 'candidate') $('candidate-face').classList.remove('hidden');
  if (currentUser.role === 'mentor') $('mentor-face').classList.remove('hidden');
  if (currentUser.role === 'admin') $('admin-face').classList.remove('hidden');
}

// Return to the home/landing (sign-in) page by ending the session.
function goHome() {
  token = null;
  currentUser = null;
  ['candidate-face', 'mentor-face', 'admin-face'].forEach((id) => $(id).classList.add('hidden'));
  $('auth-section').classList.remove('hidden');
  $('session').textContent = '';
  $('btn-home').classList.add('hidden');
  $('auth-msg').textContent = '';
  window.scrollTo(0, 0);
}

$('btn-home').onclick = goHome;
document.querySelectorAll('.home-btn').forEach((b) => { b.onclick = goHome; });

function aiBadge() {
  return '<span class="ai-badge">AI-generated · decision support</span>';
}

// ---------- Auth ----------
$('btn-register').onclick = async () => {
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: { email: $('email').value, password: $('password').value, role: $('role').value },
    });
    setMsg($('auth-msg'), 'Registered. You can now log in.', true);
  } catch (e) { setMsg($('auth-msg'), e.message); }
};

$('btn-login').onclick = async () => {
  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: { email: $('email').value, password: $('password').value },
    });
    token = res.token;
    currentUser = res.user;
    showFace();
    if (currentUser.role === 'candidate') {
      // Jobs are the landing view; profile editor stays hidden until requested.
      $('profile-card').classList.add('hidden');
      loadProfile();
      loadCvs();
      loadJobs();
    }
  } catch (e) { setMsg($('auth-msg'), e.message); }
};

// ---------- Candidate ----------
async function loadProfile() {
  try {
    const p = await api('/api/profile/me');
    $('c-name').value = p.full_name || '';
    $('c-skills').value = (p.skills || []).join(', ');
    $('c-goals').value = p.career_goals || '';
    $('c-roles').value = (p.preferred_roles || []).join(', ');
    candidatePhotoUrl = p.photo || '';
    const prev = $('c-photo-preview');
    if (p.photo) { prev.src = p.photo; prev.classList.remove('hidden'); }
    else { prev.classList.add('hidden'); }
    updateCandidateName(p.full_name);
  } catch (e) { /* ignore on first load */ }
}

// Show the candidate's real name in the header; fall back to email/"Candidate".
function updateCandidateName(name) {
  const display = (name && name.trim()) ? name.trim() : (currentUser ? currentUser.email : 'Candidate');
  $('candidate-title').textContent = display;
  if (currentUser) $('session').textContent = `${display} · ${currentUser.role}`;
}

// Toggle the profile editor (hidden by default so jobs are the landing view).
$('btn-profile').onclick = () => {
  const card = $('profile-card');
  const willShow = card.classList.contains('hidden');
  card.classList.toggle('hidden');
  if (willShow) { loadProfile(); loadCvs(); card.scrollIntoView({ behavior: 'smooth' }); }
};

$('btn-save-profile').onclick = async () => {
  try {
    // Upload a newly chosen photo first; otherwise keep the existing one.
    const photo = await resolveLogo('c-photo-file', null) || candidatePhotoUrl;
    await api('/api/profile/me', {
      method: 'PUT',
      body: {
        full_name: $('c-name').value,
        skills: csv($('c-skills').value),
        career_goals: $('c-goals').value,
        preferred_roles: csv($('c-roles').value),
        photo: photo,
      },
    });
    updateCandidateName($('c-name').value);
    alert('Profile saved');
    loadProfile();
  } catch (e) { alert(e.message); }
};

async function loadCvs() {
  const cvs = await api('/api/cv');
  $('cv-list').innerHTML = cvs
    .map((c) => `<li>${c.filename} <small>(${c.format})</small>
      <button data-cv="${c.id}" class="secondary del-cv">Delete</button></li>`)
    .join('') || '<li>No CVs uploaded yet.</li>';
  document.querySelectorAll('.del-cv').forEach((b) => {
    b.onclick = async () => { await api('/api/cv/' + b.dataset.cv, { method: 'DELETE' }); loadCvs(); };
  });
}

$('btn-upload-cv').onclick = async () => {
  const file = $('cv-file').files[0];
  if (!file) { alert('Choose a file first'); return; }
  const fd = new FormData();
  fd.append('cv', file);
  try {
    await api('/api/cv', { method: 'POST', body: fd, isForm: true });
    loadCvs();
  } catch (e) { alert(e.message); }
};

// Escape untrusted text before injecting into HTML.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// A placeholder used when a job has no company photo: shows the company/title initial.
function logoPlaceholder(j) {
  const label = (j.company_name || j.title || '?').trim().charAt(0).toUpperCase();
  return `<div class="job-logo job-logo-fallback">${esc(label)}</div>`;
}

// Rating badge shown at the top-left of a job card (out of 10, with a star).
function ratingBadge(rating) {
  if (rating == null) return '';
  return `<div class="rating-badge" title="AI match rating out of 10">★ ${esc(rating)}/10</div>`;
}

// Renders one job as a rich card: big company photo on top, details below.
// opts: { withApply, rating, clickable }
function jobCard(j, opts) {
  opts = opts || {};
  const photo = j.company_logo
    ? `<img class="job-logo" src="${esc(j.company_logo)}" alt="${esc(j.company_name || j.title)} logo"
         onerror="this.outerHTML='<div class=\\'job-logo job-logo-fallback\\'>${esc((j.company_name || j.title || '?').charAt(0).toUpperCase())}</div>'"/>`
    : logoPlaceholder(j);
  const skills = (j.required_skills || []).join(', ') || 'n/a';
  const link = j.url
    ? `<a class="job-link" href="${esc(j.url)}" target="_blank" rel="noopener noreferrer">View job posting ↗</a>`
    : '';
  const apply = opts.withApply ? `<button data-job="${j.id}" class="apply-job">Apply</button>` : '';
  const details = opts.clickable ? `<button data-detail="${j.id}" class="secondary detail-job">Why this rating?</button>` : '';
  const clickClass = opts.clickable ? ' job-card-clickable' : '';
  return `<li class="job-card${clickClass}" ${opts.clickable ? `data-open="${j.id}"` : ''}>
    <div class="job-logo-wrap">
      ${ratingBadge(opts.rating)}
      ${photo}
    </div>
    <div class="job-body">
      <div class="job-title-row">
        <h4 class="job-title">${esc(j.title)}</h4>
        <span class="job-loc">${esc(j.location || 'n/a')}</span>
      </div>
      ${j.company_name ? `<div class="job-company">${esc(j.company_name)}</div>` : ''}
      ${j.description ? `<p class="job-desc">${esc(j.description)}</p>` : ''}
      <div class="job-skills">Skills: ${esc(skills)}</div>
      <div class="job-actions">${apply}${details}${link}</div>
    </div>
  </li>`;
}

// Candidate jobs list: rated & ordered by the AI (Agent 1).
async function loadJobs() {
  const res = await api('/api/ai/rated-jobs');
  const jobs = res.ratedJobs || [];
  $('job-list').innerHTML = jobs.map((j) => jobCard(j, { withApply: true, rating: j.rating, clickable: true })).join('')
    || '<li>No jobs available.</li>';

  document.querySelectorAll('.apply-job').forEach((b) => {
    b.onclick = async (ev) => {
      ev.stopPropagation();
      try { await api('/api/jobs/' + b.dataset.job + '/apply', { method: 'POST' }); alert('Applied!'); }
      catch (e) { alert(e.message); }
    };
  });
  // Open the detail page from the card or the "Why this rating?" button.
  document.querySelectorAll('.detail-job').forEach((b) => {
    b.onclick = (ev) => { ev.stopPropagation(); openJobDetail(b.dataset.detail); };
  });
  document.querySelectorAll('.job-card-clickable').forEach((li) => {
    li.onclick = () => openJobDetail(li.dataset.open);
  });
}
$('btn-load-jobs').onclick = loadJobs;

// Agent 1 detail page: job description + why this rating (evidence-based).
async function openJobDetail(jobId) {
  try {
    const res = await api('/api/ai/rated-jobs/' + jobId);
    const j = res.job;
    const skills = (j.required_skills || []).join(', ') || 'n/a';
    const photo = j.company_logo
      ? `<img class="job-logo" src="${esc(j.company_logo)}" alt="logo"/>`
      : `<div class="job-logo job-logo-fallback">${esc((j.company_name || j.title || '?').charAt(0).toUpperCase())}</div>`;
    const reasons = (j.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('');
    $('job-detail').innerHTML = `
      <div class="detail-hero">
        <div class="job-logo-wrap">${ratingBadge(j.rating)}${photo}</div>
        <div>
          <h3 class="detail-title">${esc(j.title)}</h3>
          ${j.company_name ? `<div class="job-company">${esc(j.company_name)}</div>` : ''}
          <div class="job-loc">${esc(j.location || 'n/a')}</div>
        </div>
      </div>
      ${j.description ? `<p class="job-desc">${esc(j.description)}</p>` : ''}
      <div class="job-skills">Required skills: ${esc(skills)}</div>
      ${j.url ? `<p><a class="job-link" href="${esc(j.url)}" target="_blank" rel="noopener noreferrer">View job posting ↗</a></p>` : ''}
      <div class="ai-output">
        ${aiBadge()}
        <p><strong>Why you got ${esc(j.rating)}/10:</strong></p>
        <ul>${reasons || '<li>No specific reasons available.</li>'}</ul>
        <p>${esc(j.explanation)}</p>
      </div>
      <button data-job="${j.id}" class="apply-job-detail">Apply to this job</button>
    `;
    $('jobs-view').classList.add('hidden');
    $('job-detail-view').classList.remove('hidden');
    window.scrollTo(0, 0);
    const applyBtn = document.querySelector('.apply-job-detail');
    if (applyBtn) applyBtn.onclick = async () => {
      try { await api('/api/jobs/' + applyBtn.dataset.job + '/apply', { method: 'POST' }); alert('Applied!'); }
      catch (e) { alert(e.message); }
    };
  } catch (e) { alert(e.message); }
}

$('btn-back-jobs').onclick = () => {
  $('job-detail-view').classList.add('hidden');
  $('jobs-view').classList.remove('hidden');
};

$('btn-dashboard').onclick = async () => {
  const d = await api('/api/ai/dashboard');
  const jobs = (d.recommendedJobs || []).map((j) =>
    `<li>${j.title} — <span class="match-score">${j.matchScore}%</span><br/><small>${j.explanation}</small></li>`).join('');
  const actions = (d.recommendedActions || []).map((a) => `<li>${a.action} <small>(${a.source})</small></li>`).join('');
  $('dashboard').innerHTML = `${aiBadge()}
    <p><strong>Profile:</strong> ${d.profileStatus.complete ? 'complete' : 'incomplete'} ·
       ${d.profileStatus.skills} skills · ${d.profileStatus.cvVersions}/${d.profileStatus.cvLimit} CVs</p>
    <p><strong>Recommended jobs:</strong></p><ul>${jobs || '<li>none</li>'}</ul>
    <p><strong>Recommended actions:</strong></p><ul>${actions || '<li>none</li>'}</ul>
    <p><small>${d.aiSummary}</small></p>`;
};

$('btn-interview').onclick = async () => {
  const r = await api('/api/ai/interview', { method: 'POST', body: {} });
  const iv = r.outputs.find((o) => o.agent === 'InterviewAgent')?.findings || {};
  $('interview-output').innerHTML = `${aiBadge()}
    <p><strong>Technical:</strong></p><ul>${(iv.technicalQuestions || []).map((q) => `<li>${q}</li>`).join('')}</ul>
    <p><strong>Behavioral:</strong></p><ul>${(iv.behavioralQuestions || []).map((q) => `<li>${q}</li>`).join('')}</ul>`;
};

$('btn-interview-feedback').onclick = async () => {
  const r = await api('/api/ai/interview', {
    method: 'POST',
    body: { question: $('iv-question').value, answer: $('iv-answer').value },
  });
  const fb = r.outputs.find((o) => o.agent === 'InterviewAgent')?.findings || {};
  $('interview-output').innerHTML = `${aiBadge()}
    <p><strong>Feedback:</strong></p><ul>${(fb.feedback || []).map((f) => `<li>${f}</li>`).join('')}</ul>`;
};

// ---------- Mentor ----------
$('btn-save-mentor').onclick = async () => {
  const contact = $('m-contact').value.trim();
  await api('/api/profile/me', {
    method: 'PUT',
    body: { full_name: $('m-name').value, contact_info: contact ? { info: contact } : null },
  });
  alert('Mentor profile saved');
};

$('btn-post-job').onclick = async () => {
  try {
    const logo = await resolveLogo('j-logo-file', 'j-logo');
    await api('/api/jobs', {
      method: 'POST',
      body: {
        title: $('j-title').value,
        company_name: $('j-company').value,
        company_logo: logo,
        description: $('j-desc').value,
        required_skills: csv($('j-skills').value),
        location: $('j-location').value,
        url: $('j-url').value,
      },
    });
    alert('Job published');
    loadMentorJobs();
  } catch (e) { alert(e.message); }
};

async function loadMentorJobs() {
  const jobs = await api('/api/jobs');
  $('mentor-job-list').innerHTML = jobs.map((j) => jobCard(j, { withApply: false })).join('') || '<li>No jobs.</li>';
}
$('btn-mentor-jobs').onclick = loadMentorJobs;

// ---------- Admin: post/list jobs ----------
$('btn-admin-post-job').onclick = async () => {
  try {
    const logo = await resolveLogo('aj-logo-file', 'aj-logo');
    await api('/api/jobs', {
      method: 'POST',
      body: {
        title: $('aj-title').value,
        company_name: $('aj-company').value,
        company_logo: logo,
        description: $('aj-desc').value,
        required_skills: csv($('aj-skills').value),
        location: $('aj-location').value,
        url: $('aj-url').value,
      },
    });
    alert('Job published');
    loadAdminJobs();
  } catch (e) { alert(e.message); }
};

async function loadAdminJobs() {
  const jobs = await api('/api/jobs');
  $('admin-job-list').innerHTML = jobs.map((j) => jobCard(j, { withApply: false, clickable: true })).join('')
    || '<li>No jobs.</li>';
  document.querySelectorAll('#admin-job-list .job-card-clickable').forEach((li) => {
    li.onclick = () => openAdminJobCandidates(li.dataset.open, li);
  });
  // Remove the candidate-oriented "Why this rating?" button for admin cards.
  document.querySelectorAll('#admin-job-list .detail-job').forEach((b) => b.remove());
}
$('btn-admin-jobs').onclick = loadAdminJobs;

// Agent 2: show the top-10 matching candidates for a clicked job.
async function openAdminJobCandidates(jobId) {
  const card = $('job-candidates-card');
  const list = $('job-candidates-list');
  card.classList.remove('hidden');
  list.innerHTML = '<li>Ranking candidates…</li>';
  card.scrollIntoView({ behavior: 'smooth' });
  try {
    const res = await api('/api/admin/jobs/' + jobId + '/candidates');
    $('job-candidates-title').textContent = `Top matching candidates for "${res.jobTitle}"`;
    const rows = (res.topCandidates || []).map((c, i) => {
      const photo = c.photo
        ? `<img class="cand-photo" src="${esc(c.photo)}" alt="candidate photo"/>`
        : `<div class="cand-photo cand-photo-fallback">${esc((c.fullName || '?').charAt(0).toUpperCase())}</div>`;
      const reasons = (c.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('');
      return `<li class="cand-card">
        <div class="cand-rank">#${i + 1}</div>
        ${photo}
        <div class="cand-body">
          <div class="cand-head">
            <strong>${esc(c.fullName || '(no name)')}</strong>
            <span class="rating-badge inline">★ ${esc(c.rating)}/10</span>
          </div>
          <p class="job-desc">${esc(c.explanation)}</p>
          <details><summary>Why this rating</summary><ul>${reasons || '<li>n/a</li>'}</ul></details>
        </div>
      </li>`;
    });
    list.innerHTML = rows.join('') || '<li>No candidates to rank yet.</li>';
  } catch (e) {
    list.innerHTML = '<li>Error: ' + esc(e.message) + '</li>';
  }
}

// ---------- Admin ----------
$('btn-load-candidates').onclick = async () => {
  const cands = await api('/api/admin/candidates');
  $('candidate-list').innerHTML = cands
    .map((c) => `<li>#${c.id} ${c.full_name || '(no name)'} — ${c.email}
      <button data-c="${c.id}" class="view-c">View</button></li>`)
    .join('') || '<li>No candidates.</li>';
  document.querySelectorAll('.view-c').forEach((b) => { b.onclick = () => viewCandidate(b.dataset.c); });
};

async function viewCandidate(id) {
  const d = await api('/api/admin/candidates/' + id);
  const cvs = (d.cvVersions || []).map((c) =>
    `<li>${c.filename} <button data-c="${id}" data-cv="${c.id}" class="review-cv">AI review</button></li>`).join('');
  $('candidate-detail').innerHTML = `
    <p><strong>${d.profile.full_name || '(no name)'}</strong></p>
    <p>Skills: ${(d.profile.skills || []).join(', ') || 'none'}</p>
    <p>Goals: ${d.profile.career_goals || 'n/a'}</p>
    <p><strong>CVs:</strong></p><ul>${cvs || '<li>none</li>'}</ul>`;
  document.querySelectorAll('.review-cv').forEach((b) => {
    b.onclick = () => reviewCv(b.dataset.c, b.dataset.cv);
  });
}

async function reviewCv(candidateId, cvId) {
  $('admin-review').innerHTML = 'Running AI review…';
  try {
    const r = await api(`/api/admin/candidates/${candidateId}/cv/${cvId}/review`, { method: 'POST' });
    const cv = r.outputs.find((o) => o.agent === 'CvAnalysisAgent')?.findings || {};
    $('admin-review').innerHTML = `${aiBadge()}
      <p class="conflict">${r.disclaimer}</p>
      <p><strong>Detected skills:</strong> ${(cv.detectedSkills || []).join(', ') || 'none'}</p>
      <p><strong>Strengths:</strong></p><ul>${(cv.strengths || []).map((s) => `<li>${s}</li>`).join('') || '<li>none</li>'}</ul>
      <p><strong>Missing info:</strong> ${(cv.missingInformation || []).join(', ') || 'none'}</p>
      <p><strong>Improvements:</strong></p><ul>${(cv.suggestedImprovements || []).map((s) => `<li>${s}</li>`).join('') || '<li>none</li>'}</ul>
      <p><small>${r.summary}</small></p>`;
  } catch (e) { $('admin-review').innerHTML = 'Error: ' + e.message; }
}

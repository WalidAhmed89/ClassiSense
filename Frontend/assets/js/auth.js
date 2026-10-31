/* =====================================================================
   WolfEye / ClassiSense Auth & Intro Controller
   ===================================================================== */
const $ = s => document.querySelector(s);

// If already logged in, redirect straight to dashboard
if (window.WE && WE.session()) {
  location.replace('app.html');
}

// Splash Screen Dismiss Logic
const splashScene = $('#splashScene');

function dismissSplash() {
  if (splashScene && !splashScene.classList.contains('dismissed')) {
    splashScene.classList.add('dismissed');
  }
}

// Auto dismiss splash screen after intro sequence (~4.5s) or instant if reduced motion
const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setTimeout(dismissSplash, isReducedMotion ? 50 : 4500);

// Tab switching between Sign In and Create Account
function setTab(isRegister) {
  $('#fL').classList.toggle('hide', isRegister);
  $('#fR').classList.toggle('hide', !isRegister);
  $('#tL').classList.toggle('on', !isRegister);
  $('#tR').classList.toggle('on', isRegister);
}

$('#tL').onclick = () => setTab(false);
$('#tR').onclick = () => setTab(true);

// Form submission handler
async function handleFormSubmit(e, actionFn, errEl) {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target));
  const submitBtn = e.target.querySelector('button[type=submit], .btn');
  errEl.textContent = '';

  if (formData.confirm !== undefined && formData.confirm !== formData.password) {
    errEl.textContent = 'Passwords do not match.';
    return;
  }

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Please wait...';

  try {
    await actionFn(formData);
    location.href = 'app.html';
  } catch (err) {
    errEl.textContent = err.message || 'Something went wrong. Please try again.';
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

$('#fL').onsubmit = e => handleFormSubmit(e, f => WE.login(f.email, f.password), $('#eL'));
$('#fR').onsubmit = e => handleFormSubmit(e, f => WE.register(f.name, f.email, f.password), $('#eR'));


const phraseDisplay = document.getElementById('phraseDisplay');
const statusEl = document.getElementById('status');
const speakButton = document.getElementById('speakButton');
const nextButton = document.getElementById('nextButton');

let phrases = [];
let phrasePool = []; // the pool used for random selection (may be subset of `phrases`)
let selectedPhrase = '';
let availableVoices = [];
let phraseToCategory = {};
let isIndexPage = false;

function setStatus(message) {
  statusEl.textContent = message;
}

function parseMarkdownPhrases(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.replace(/^[-*+]\s+/, ''))
    .map((line) => line.replace(/^\d+[.)]\s+/, ''))
    .map((line) => line.replace(/^\[[ xX]\]\s+/, ''))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseMarkdownByCategory(markdown) {
  const lines = markdown.split(/\r?\n/);
  const categories = {};
  let current = 'General';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      current = line.replace(/^##\s*/, '').trim() || 'General';
      categories[current] = categories[current] || [];
      continue;
    }
    if (/^[-*+]\s+/.test(line)) {
      categories[current] = categories[current] || [];
      categories[current].push(line.replace(/^[-*+]\s+/, '').trim());
    }
  }
  return categories;
}

function renderCategories(categories) {
  const container = document.getElementById('phrasesList');
  if (!container) return;
  container.innerHTML = '';
  Object.keys(categories).forEach((cat) => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${cat} (${categories[cat].length})`;
    details.appendChild(summary);
    const ul = document.createElement('ul');
    categories[cat].forEach((p) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = p;
      span.className = 'phrase-item-text';
      const btn = document.createElement('button');
      btn.className = 'play-phrase';
      btn.type = 'button';
      btn.setAttribute('aria-label', `Play phrase: ${p}`);
      btn.textContent = '▶';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakPhrase(p);
      });
      li.appendChild(span);
      li.appendChild(btn);
      ul.appendChild(li);
    });
    details.appendChild(ul);
    container.appendChild(details);
  });
}

function chooseRandomPhrase() {
  // Refill pool when empty
  if (!phrasePool || phrasePool.length === 0) {
    if (isIndexPage) {
      // pick up to 3 unique random phrases from the master list
      const poolSize = Math.min(3, phrases.length);
      const picked = new Set();
      while (picked.size < poolSize) {
        picked.add(phrases[Math.floor(Math.random() * phrases.length)]);
      }
      phrasePool = Array.from(picked);
    } else {
      // for user pages, copy full list so we can pop used phrases
      phrasePool = phrases.slice();
    }
  }

  if (!phrasePool.length) {
    selectedPhrase = 'No phrases were found in phrases.md';
    phraseDisplay.textContent = selectedPhrase;
    setStatus('Add some lines to phrases.md and reload.');
    return;
  }

  // choose one phrase and remove it from the pool so it rotates
  const index = Math.floor(Math.random() * phrasePool.length);
  selectedPhrase = phrasePool.splice(index, 1)[0];

  // display category (if available) and phrase
  updatePhraseDisplay(selectedPhrase);
  setStatus('Phrase loaded.');
}

function loadVoices() {
  availableVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
}

function pickBestVoice() {
  if (!availableVoices.length) {
    return null;
  }

  const femaleHints = [
    'female', 'woman', 'samantha', 'victoria', 'karen', 'moira',
    'ava', 'allison', 'susan', 'zira', 'aria', 'joanna', 'serena'
  ];

  const englishVoices = availableVoices.filter((voice) => /^en[-_]/i.test(voice.lang) || /^en$/i.test(voice.lang));
  const femaleEnglish = englishVoices.find((voice) => {
    const text = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    return femaleHints.some((hint) => text.includes(hint));
  });

  if (femaleEnglish) {
    return femaleEnglish;
  }

  const anyFemale = availableVoices.find((voice) => {
    const text = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    return femaleHints.some((hint) => text.includes(hint));
  });

  return anyFemale || englishVoices[0] || availableVoices[0] || null;
}

function speakPhrase(phraseArg) {
  if (!('speechSynthesis' in window)) {
    setStatus('This browser does not support speech synthesis.');
    return;
  }
  if (phraseArg) {
    selectedPhrase = phraseArg;
  }

  if (!selectedPhrase) {
    setStatus('No phrase is loaded yet.');
    return;
  }

  // update displayed phrase (respect category label if available)
  updatePhraseDisplay(selectedPhrase);

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(selectedPhrase);
  const voice = pickBestVoice();

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'en-US';
  } else {
    utterance.lang = 'en-US';
  }

  utterance.rate = 0.95;
  utterance.pitch = 1.08;
  utterance.volume = 1;

  utterance.onstart = () => {
    const voiceName = voice ? voice.name : 'default voice';
    setStatus(`Reading aloud with ${voiceName}.`);
  };

  utterance.onend = () => {
    setStatus('Done reading. Tap a button to hear it again or load another.');
  };

  utterance.onerror = () => {
    setStatus('Speech was blocked or failed. Tap "Read it aloud" to try again.');
  };

  window.speechSynthesis.speak(utterance);
}

function updatePhraseDisplay(phrase) {
  const category = phraseToCategory[phrase] || '';
  if (category) {
    phraseDisplay.innerHTML = `<div class="phrase-category">${category}</div><div class="phrase-text">${phrase}</div>`;
  } else {
    phraseDisplay.textContent = phrase;
  }
}


function getPhraseFileFromPath() {
  // Deprecated: this function is replaced by getCandidatePhraseFiles used by loadPhrases.
  // Keep for backward compatibility but return master phrases.md by default.
  const path = window.location.pathname;
  const repoName = '/old_person_roast_site';
  const idx = path.indexOf(repoName);
  const repoBase = idx !== -1 ? path.slice(0, idx + repoName.length) : (path.startsWith(repoName) ? repoName : '');
  return (repoBase || '') + '/phrases.md';
}

function getCandidatePhraseFiles() {
  const path = window.location.pathname || '';
  const repoName = '/old_person_roast_site';
  const candidates = [];

  // Determine repo base if present (for project pages)
  const idx = path.indexOf(repoName);
  const repoBase = idx !== -1 ? path.slice(0, idx + repoName.length) : (path.startsWith(repoName) ? repoName : '');

  // helper to push with repoBase
  const withBase = (p) => (repoBase ? repoBase + p : p);

  // Try to extract a user slug from a few URL shapes:
  // /old_person_roast_site/slug or /old_person_roast_site/slug/ or /slug or /slug/
  const slugMatch = path.match(/(?:\/old_person_roast_site)?\/?([^/]+)(?:\/|$)/);
  if (slugMatch && slugMatch[1] && !slugMatch[1].includes('index.html') && slugMatch[1] !== '') {
    const slug = slugMatch[1];
    // candidate: /slug/slug.md (per-user file)
    candidates.push(withBase(`/${slug}/${slug}.md`));
    // candidate: /slug.md (alternate location)
    candidates.push(withBase(`/${slug}.md`));
  }

  // Next try: categorized phrases file (prefer over master if present)
  candidates.push(withBase('/phrases_categorized.md'));
  // Fallback master file
  candidates.push(withBase('/phrases.md'));

  // Also add top-level versions without repoBase as fallback
  candidates.push('/phrases_categorized.md');
  candidates.push('/phrases.md');

  // Deduplicate while preserving order
  return Array.from(new Set(candidates));
}

async function loadPhrases() {
  try {
    // Try multiple candidate files (user slug first, categorized, then master)
    const candidates = getCandidatePhraseFiles();
    let response = null;
    let phraseFile = null;
    let markdown = null;
    for (const candidate of candidates) {
      try {
        const resp = await fetch(candidate, { cache: 'no-store' });
        if (resp && resp.ok) {
          response = resp;
          phraseFile = candidate;
          markdown = await resp.text();
          break;
        }
      } catch (e) {
        // ignore and try next candidate
      }
    }

    if (!response) {
      throw new Error('No phrase file found among candidates: ' + candidates.join(', '));
    }
    // build category view and flatten phrases for rendering
    let categories = parseMarkdownByCategory(markdown);

    // If the file parsed into a single large "General" category, prefer a categorized fallback
    if (Object.keys(categories).length === 1 && categories['General'] && categories['General'].length > 50) {
      try {
        const baseDir = (phraseFile || '').replace(/\/phrases\.md$/i, '').replace(/phrases\.md$/i, '');
        const altFile = (baseDir ? baseDir : '') + '/phrases_categorized.md';
        const altResp = await fetch(altFile, { cache: 'no-store' });
        if (altResp.ok) {
          const altMd = await altResp.text();
          const altCats = parseMarkdownByCategory(altMd);
          if (Object.keys(altCats).length > 1) {
            categories = altCats;
          }
        }
      } catch (e) {
        // silently ignore fallback errors and use original categories
        console.warn('Could not load phrases_categorized.md fallback:', e);
      }
    }

    renderCategories(categories);
    // flatten categories into phrases array (master list) and build phrase->category map
    phrases = [];
    phraseToCategory = {};
    Object.keys(categories).forEach((cat) => {
      categories[cat].forEach((p) => {
        phrases.push(p);
        phraseToCategory[p] = cat;
      });
    });

    // detect index file and setup pool; chooseRandomPhrase will refill/populate dynamically
    const phraseFileLower = (phraseFile || '').toLowerCase();
    isIndexPage = phraseFileLower.endsWith('/phrases.md') || phraseFileLower.endsWith('phrases.md');
    phrasePool = isIndexPage ? [] : phrases.slice();
    chooseRandomPhrase();

    setTimeout(() => {
      loadVoices();
      speakPhrase();
    }, 250);
  } catch (error) {
    console.error(error);
    selectedPhrase = 'Could not load phrases.';
    phraseDisplay.textContent = selectedPhrase;
    setStatus('Make sure the phrase file exists.');
  }
}

// Purchase form handling: opens mail client with prefilled details for manual fulfillment.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('purchaseForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const slug = document.getElementById('slug').value.trim();
    const txn = document.getElementById('txn').value.trim();
    const choices = document.getElementById('choices').value.trim();
    const ownerEmail = 'youremail@example.com'; // TODO: replace with your real email
    const subject = encodeURIComponent(`OldRoast purchase: ${slug}`);
    const body = encodeURIComponent(`Slug: ${slug}\nPayPal TXN: ${txn}\nPhrases:\n${choices}`);
    const mailto = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  });
});

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

speakButton.addEventListener('click', () => {
  speakPhrase();
});

nextButton.addEventListener('click', () => {
  chooseRandomPhrase();
  speakPhrase();
});

loadPhrases();

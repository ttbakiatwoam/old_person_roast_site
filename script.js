const phraseDisplay = document.getElementById('phraseDisplay');
const statusEl = document.getElementById('status');
const speakButton = document.getElementById('speakButton');
const nextButton = document.getElementById('nextButton');

let phrases = [];
let selectedPhrase = '';
let availableVoices = [];

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

function chooseRandomPhrase() {
  if (!phrases.length) {
    selectedPhrase = 'No phrases were found in phrases.md';
    phraseDisplay.textContent = selectedPhrase;
    setStatus('Add some lines to phrases.md and reload.');
    return;
  }

  const index = Math.floor(Math.random() * phrases.length);
  selectedPhrase = phrases[index];
  phraseDisplay.textContent = selectedPhrase;
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

function speakPhrase() {
  if (!('speechSynthesis' in window)) {
    setStatus('This browser does not support speech synthesis.');
    return;
  }

  if (!selectedPhrase) {
    setStatus('No phrase is loaded yet.');
    return;
  }

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


function getPhraseFileFromPath() {
  const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!path || path === 'index.html') {
    return '/phrases.md';
  }
  const parts = path.split('/');
  if (parts.length === 1) {
    // e.g. /jeanetaylor
    return '/' + parts[0] + '/' + parts[0] + '.md';
  }
  if (parts.length === 2 && parts[1] === 'index.html') {
    // e.g. /jeanetaylor/index.html
    return '/' + parts[0] + '/' + parts[0] + '.md';
  }
  // fallback: just try the last part as a .md in the current folder
  return '/' + parts.join('/') + '.md';
}

async function loadPhrases() {
  try {
    const phraseFile = getPhraseFileFromPath();
    const response = await fetch(phraseFile, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const markdown = await response.text();
    console.log('[DEBUG] Loaded markdown:', markdown);
    phrases = parseMarkdownPhrases(markdown);
    console.log('[DEBUG] Parsed phrases:', phrases);
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

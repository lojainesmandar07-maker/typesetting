(function () {
  const inputText = document.getElementById('inputText');
  const languageSelect = document.getElementById('languageSelect');
  const shapeSelect = document.getElementById('shapeSelect');
  const processBtn = document.getElementById('processBtn');
  const clearBtn = document.getElementById('clearBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const results = document.getElementById('results');
  const toast = document.getElementById('toast');
  const compactToggle = document.getElementById('compactToggle');
  const collapseBtn = document.getElementById('collapseBtn');

  function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('bubbleLinerSettings') || '{}');
    if (saved.lang) languageSelect.value = saved.lang;
    if (saved.shape) shapeSelect.value = saved.shape;
    if (saved.compact) {
      document.body.classList.add('compact-mode');
      compactToggle.textContent = '↩️ وضع عادي';
    }
    if (saved.collapsed) {
      document.body.classList.add('settings-collapsed');
      collapseBtn.textContent = 'إظهار الإعدادات';
    }
  }

  function saveSettings() {
    localStorage.setItem(
      'bubbleLinerSettings',
      JSON.stringify({
        lang: languageSelect.value,
        shape: shapeSelect.value,
        compact: document.body.classList.contains('compact-mode'),
        collapsed: document.body.classList.contains('settings-collapsed'),
      })
    );
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 1500);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم النسخ ✓');
    } catch {
      showToast('تعذّر النسخ');
    }
  }

  function makeCard(original, out, index) {
    const allOptions = [out.best, ...out.alternatives].filter((v, i, arr) => v && arr.indexOf(v) === i);
    let currentIdx = 0;

    const card = document.createElement('article');
    card.className = 'result-card';
    card.style.animationDelay = `${index * 40}ms`;
    if (out.lang === 'en') card.classList.add('card-ltr');

    const origEl = document.createElement('div');
    origEl.className = 'original';
    origEl.textContent = original;

    const suggestionEl = document.createElement('div');
    suggestionEl.className = 'suggestion-main';
    suggestionEl.textContent = allOptions[currentIdx] || '';

    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'نسخ ✓';

    const altBtn = document.createElement('button');
    altBtn.className = 'alt-btn';
    altBtn.type = 'button';
    altBtn.textContent = allOptions.length > 1 ? `بديل 1/${allOptions.length} ←` : 'بديل';
    altBtn.disabled = allOptions.length <= 1;

    function renderOption() {
      suggestionEl.textContent = allOptions[currentIdx] || '';
      if (allOptions.length > 1) {
        altBtn.textContent = `بديل ${currentIdx + 1}/${allOptions.length} ←`;
      }
    }

    suggestionEl.addEventListener('click', () => copyText(allOptions[currentIdx] || ''));

    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      copyText(allOptions[currentIdx] || '');
    });

    copyBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      copyText(allOptions[currentIdx] || '');
    });

    altBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      currentIdx = (currentIdx + 1) % allOptions.length;
      renderOption();
    });

    btnRow.append(copyBtn, altBtn);
    card.append(origEl, suggestionEl, btnRow);
    return card;
  }

  function processText() {
    const rawBubbles = window.splitIntoBubbles(inputText.value);
    results.innerHTML = '';
    if (!rawBubbles.length) return;

    const defaultShape = shapeSelect.value;
    const defaultLang = languageSelect.value;

    rawBubbles.forEach((bubble, i) => {
      const shape = bubble.shape || defaultShape;
      const out = window.formatBubble(bubble.text, defaultLang, shape);
      const card = makeCard(bubble.text, out, i);
      results.append(card);
    });
  }

  [languageSelect, shapeSelect].forEach((el) => {
    el.addEventListener('change', () => {
      saveSettings();
      processText();
    });
  });

  compactToggle.addEventListener('click', () => {
    document.body.classList.toggle('compact-mode');
    const compact = document.body.classList.contains('compact-mode');
    compactToggle.textContent = compact ? '↩️ وضع عادي' : '🖥️ وضع الفوتوشوب';
    saveSettings();
  });

  collapseBtn.addEventListener('click', () => {
    document.body.classList.toggle('settings-collapsed');
    collapseBtn.textContent = document.body.classList.contains('settings-collapsed')
      ? 'إظهار الإعدادات'
      : 'إخفاء الإعدادات';
    saveSettings();
  });

  let debounceTimer;
  inputText.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processText, 300);
  });

  processBtn.addEventListener('click', processText);

  clearBtn.addEventListener('click', () => {
    inputText.value = '';
    results.innerHTML = '';
    inputText.focus();
  });

  sampleBtn.addEventListener('click', () => {
    inputText.value = `[c] القائد قد تصدى وحده لجميع الموتى الذين كانوا في الساحة
[o] وعدتني ساحلاً
[b] الاسم: كيانو ريفز
أشعر أن المشاعر تتراكم في أعماق قلبي
[c] I can't believe you're actually here
The war is finally over`;
    processText();
  });

  inputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      processText();
    }
  });

  loadSettings();
  processText();
})();
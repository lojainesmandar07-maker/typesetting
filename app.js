(function () {
  const inputText = document.getElementById('inputText');
  const languageSelect = document.getElementById('languageSelect');
  const shapeSelect = document.getElementById('shapeSelect');
  const processBtn = document.getElementById('processBtn');
  const clearBtn = document.getElementById('clearBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const results = document.getElementById('results');
  const toast = document.getElementById('toast');

  const sample = `القائد قد تصدى وحده لجميع الموتى الذين كانوا في الساحة
وعدتني ساحلاً
أشعر أن المشاعر أدفن في أعماق قلبي
I can't believe you're actually here
The war is finally over`;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 1500);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      showToast('تم النسخ ✓');
    } catch {
      showToast('تعذر النسخ');
    }
  }

  function makeBlock(title, text, extraClass = '') {
    const block = document.createElement('div');
    block.className = `block ${extraClass}`.trim();

    const row = document.createElement('div');
    row.className = 'inline';

    const label = document.createElement('strong');
    label.textContent = title;

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'نسخ 📋';
    btn.addEventListener('click', () => copyText(text));

    row.append(label, btn);

    const suggestion = document.createElement('div');
    suggestion.className = 'suggestion';
    suggestion.textContent = text;
    suggestion.title = 'اضغطي للنسخ';
    suggestion.addEventListener('click', () => copyText(text));

    block.append(row, suggestion);
    return block;
  }

  function processText() {
    const bubbles = window.splitIntoBubbles(inputText.value);
    results.innerHTML = '';
    if (!bubbles.length) return;

    bubbles.forEach((bubble, index) => {
      const card = document.createElement('article');
      card.className = 'result-card';
      card.style.animationDelay = `${index * 40}ms`;

      const forcedLang = languageSelect.value;
      const out = window.formatBubble(bubble, forcedLang, shapeSelect.value);

      if (out.lang === 'en') {
        card.classList.add('card-ltr');
      }

      const original = document.createElement('div');
      original.className = 'original';
      original.textContent = bubble;

      card.append(original);
      card.append(makeBlock('✨ أفضل اقتراح', out.best, 'best'));
      card.append(makeBlock('بديل 1', out.alternatives[0]));
      card.append(makeBlock('بديل 2', out.alternatives[1]));

      results.append(card);
    });
  }

  processBtn.addEventListener('click', processText);

  clearBtn.addEventListener('click', () => {
    inputText.value = '';
    results.innerHTML = '';
    inputText.focus();
  });

  sampleBtn.addEventListener('click', () => {
    inputText.value = sample;
    inputText.focus();
  });

  inputText.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      processText();
    }
  });
})();

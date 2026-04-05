(function () {
  const ARABIC_RE = /[\u0600-\u06FF]/;
  const LATIN_RE = /[A-Za-z]/;
  const STICKY_PUNCT_RE = /^[!?؟.,;:…]+$/;

  const ARABIC_CONNECTORS = new Set([
    'و', 'في', 'من', 'على', 'إلى', 'عن', 'ثم', 'أو', 'أن', 'إن', 'قد', 'لا', 'ما', 'ب', 'ل'
  ]);
  const ENGLISH_SMALLS = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'of', 'to', 'for', 'and', 'or', 'but', 'as', 'by', 'if'
  ]);

  function detectLanguage(text) {
    const hasArabic = ARABIC_RE.test(text);
    const hasLatin = LATIN_RE.test(text);
    if (hasArabic) return 'ar';
    if (hasLatin) return 'en';
    return 'ar';
  }

  function parseTag(line) {
    const match = line.match(/^\[(c|o|b|w)\]\s*/i);
    if (!match) return { shape: null, text: line.trim() };
    const map = { c: 'circle', o: 'oval', b: 'box', w: 'wide-box' };
    return { shape: map[match[1].toLowerCase()], text: line.slice(match[0].length).trim() };
  }

  function splitIntoBubbles(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => parseTag(line));
  }

  function tokenize(text) {
    return text.split(/\s+/).filter(Boolean);
  }

  function generateAllSplits(words, maxLines) {
    const out = [];
    const n = words.length;

    for (let lineCount = 1; lineCount <= Math.min(maxLines, n); lineCount++) {
      const bucket = [];

      function walk(start, remaining) {
        if (remaining === 1) {
          bucket.push(words.slice(start));
          out.push(bucket.map((arr) => arr.join(' ')));
          bucket.pop();
          return;
        }
        const maxCut = n - remaining;
        for (let cut = start + 1; cut <= maxCut; cut++) {
          bucket.push(words.slice(start, cut));
          walk(cut, remaining - 1);
          bucket.pop();
        }
      }

      walk(0, lineCount);
    }
    return out;
  }

  function lineLengths(lines) {
    return lines.map((l) => l.trim().length);
  }

  function middleIsLongest(lengths) {
    if (lengths.length === 2) return lengths[0] <= lengths[1];
    if (lengths.length < 3) return true;
    const mid = Math.floor(lengths.length / 2);
    return lengths[mid] === Math.max(...lengths);
  }

  function looksHourglass(lengths) {
    if (lengths.length < 4) return false;
    return lengths[0] < lengths[1] && lengths[1] > lengths[2] && lengths[2] < lengths[3];
  }

  function looksPyramid(lengths) {
    if (lengths.length < 3) return false;
    let strictlyDescending = true;
    for (let i = 1; i < lengths.length; i++) {
      if (lengths[i] > lengths[i - 1]) strictlyDescending = false;
    }
    return strictlyDescending && lengths[0] > lengths[lengths.length - 1];
  }

  function hasBadSingleWordLine(lines, lang) {
    return lines.some((line) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (words.length !== 1) return false;
      const token = words[0].toLowerCase().replace(/[!?؟.,;:…]/g, '');
      return lang === 'ar' ? ARABIC_CONNECTORS.has(token) : ENGLISH_SMALLS.has(token);
    });
  }

  function containsIsolatedPunctuation(lines) {
    return lines.some((line) => STICKY_PUNCT_RE.test(line.trim()));
  }

  function recommendedMaxLines(wordCount, shape) {
    const isBox = shape === 'box' || shape === 'wide-box';
    if (wordCount <= 2) return 1;
    if (wordCount <= 4) return isBox ? 2 : 2;
    if (wordCount <= 6) return isBox ? 3 : 3;
    if (wordCount <= 9) return isBox ? 3 : 3;
    return 4;
  }

  function canExtendWithKashida(word) {
    const connectors = 'بتثجحخسشصضطظعغفقكلمنهي';
    for (let i = word.length - 2; i >= 0; i--) {
      if (connectors.includes(word[i])) return i;
    }
    return -1;
  }

  function addKashidaToLine(line, targetLength) {
    const diff = targetLength - line.length;
    if (diff <= 2 || diff > 4) return line;
    const words = line.split(' ');
    for (let w = words.length - 1; w >= 0; w--) {
      const pos = canExtendWithKashida(words[w]);
      if (pos !== -1) {
        words[w] =
          words[w].slice(0, pos + 1) + 'ـ'.repeat(diff) + words[w].slice(pos + 1);
        return words.join(' ');
      }
    }
    return line;
  }

  function applyKashidaBalance(lines) {
    if (lines.length < 2) return lines;
    const lengths = lines.map((l) => l.length);
    const maxLen = Math.max(...lengths);
    return lines.map((line, i) => {
      if (lengths[i] === maxLen) return line;
      return addKashidaToLine(line, maxLen);
    });
  }

  function uniformityDelta(lengths) {
    return Math.max(...lengths) - Math.min(...lengths);
  }

  function scoreSplit(lines, shape, lang) {
    const lengths = lineLengths(lines);
    const isBox = shape === 'box' || shape === 'wide-box';
    const delta = uniformityDelta(lengths);
    let score = 0;

    if (isBox) {
      score += Math.max(0, 40 - delta * 8);
    } else {
      if (middleIsLongest(lengths)) score += 40;
      if (lines.length >= 3 && lengths[0] < lengths[1] && lengths[lines.length - 1] < lengths[1]) {
        score += 10;
      }
    }

    if (delta < 3) score += 30;
    if (delta > 6) score -= 20;

    if (!hasBadSingleWordLine(lines, lang)) score += 20;
    else score -= 30;

    if (!containsIsolatedPunctuation(lines)) score += 10;
    else score -= 30;

    if (looksHourglass(lengths)) score -= 50;
    if (looksPyramid(lengths)) score -= 40;

    if (lines.length === 1 && lines[0].length > 12) score -= 15;

    return score;
  }

  function scoreArabicSplit(lines, bubbleShape) {
    return scoreSplit(lines, bubbleShape, 'ar');
  }

  function scoreEnglishSplit(lines, bubbleShape) {
    return scoreSplit(lines, bubbleShape, 'en');
  }

  function hyphenVariants(words) {
    const variants = [words];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (!/^[A-Za-z]{7,}$/.test(w)) continue;
      if (/^[A-Z][a-z]+$/.test(w)) continue;
      const mid = Math.floor(w.length / 2);
      if (mid < 3 || w.length - mid < 3) continue;
      variants.push([...words.slice(0, i), `${w.slice(0, mid)}-`, w.slice(mid), ...words.slice(i + 1)]);
      break;
    }
    return variants;
  }

  function formatBubble(text, language, bubbleShape) {
    const resolvedLang = language === 'auto' ? detectLanguage(text) : language;
    const words = tokenize(text);
    if (words.length === 0) return { best: '', alternatives: ['', ''], lang: resolvedLang };

    const maxLines = recommendedMaxLines(words.length, bubbleShape);
    const pools = resolvedLang === 'en' ? hyphenVariants(words) : [words];
    const scored = [];

    for (const candidateWords of pools) {
      const splits = generateAllSplits(candidateWords, maxLines);
      for (const lines of splits) {
        if (containsIsolatedPunctuation(lines)) continue;
        const score = resolvedLang === 'ar'
          ? scoreArabicSplit(lines, bubbleShape)
          : scoreEnglishSplit(lines, bubbleShape);
        scored.push({ text: lines.join('\n'), score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const unique = [];
    const seen = new Set();
    for (const row of scored) {
      if (seen.has(row.text)) continue;
      seen.add(row.text);
      unique.push(row.text);
      if (unique.length === 3) break;
    }

    let best = unique[0] || text;
    const alt1 = unique[1] || best;
    const alt2 = unique[2] || alt1;

    if (resolvedLang === 'ar') {
      best = applyKashidaBalance(best.split('\n')).join('\n');
    }

    return {
      best,
      alternatives: [alt1, alt2],
      lang: resolvedLang,
    };
  }

  window.detectLanguage = detectLanguage;
  window.parseTag = parseTag;
  window.splitIntoBubbles = splitIntoBubbles;
  window.generateAllSplits = generateAllSplits;
  window.scoreArabicSplit = scoreArabicSplit;
  window.scoreEnglishSplit = scoreEnglishSplit;
  window.formatBubble = formatBubble;
})();

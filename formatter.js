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

  function splitIntoBubbles(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function tokenize(text) {
    return text.split(/\s+/).filter(Boolean);
  }

  function generateAllSplits(words, maxLines) {
    const out = [];
    const n = words.length;
    for (let lineCount = 1; lineCount <= Math.min(maxLines, n); lineCount++) {
      const result = [];
      function dfs(start, remaining) {
        if (remaining === 1) {
          result.push(words.slice(start));
          out.push(result.map((l) => l.join(' ')));
          result.pop();
          return;
        }

        const maxCut = n - remaining;
        for (let cut = start + 1; cut <= maxCut; cut++) {
          result.push(words.slice(start, cut));
          dfs(cut, remaining - 1);
          result.pop();
        }
      }
      dfs(0, lineCount);
    }
    return out;
  }

  function looksHourglass(lengths) {
    if (lengths.length < 4) return false;
    let changes = 0;
    for (let i = 1; i < lengths.length - 1; i++) {
      const a = lengths[i - 1] < lengths[i];
      const b = lengths[i] > lengths[i + 1];
      if ((a && b) || (!a && !b)) changes++;
    }
    return changes >= 2;
  }

  function looksPyramid(lengths) {
    if (lengths.length < 3) return false;
    return lengths.every((len, i) => i === 0 || len <= lengths[i - 1]) &&
      lengths[0] > lengths[lengths.length - 1];
  }

  function containsIsolatedPunctuation(lines) {
    return lines.some((line) => STICKY_PUNCT_RE.test(line.trim()));
  }

  function lineLengths(lines) {
    return lines.map((l) => l.replace(/\s+/g, '').length);
  }

  function middleIsLongest(lengths) {
    if (lengths.length < 3) return false;
    const mid = Math.floor(lengths.length / 2);
    const max = Math.max(...lengths);
    return lengths[mid] === max;
  }

  function uniformityScore(lengths) {
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    return max - min;
  }

  function hasBadSingleWordLine(lines, lang) {
    return lines.some((line) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (words.length !== 1) return false;
      const token = words[0].toLowerCase().replace(/[!?؟.,;:…]/g, '');
      if (lang === 'ar') return ARABIC_CONNECTORS.has(token);
      return ENGLISH_SMALLS.has(token);
    });
  }

  function scoreCommon(lines, shape, lang) {
    const lengths = lineLengths(lines);
    let score = 0;

    const uniformity = uniformityScore(lengths);
    const isBox = shape === 'box' || shape === 'wide-box';

    if (!isBox && middleIsLongest(lengths)) score += 40;
    if (!isBox && lengths.length >= 3 && lengths[0] < lengths[1] && lengths[lengths.length - 1] < lengths[1]) {
      score += 10;
    }
    if (isBox) {
      score += 40 - Math.min(40, uniformity * 8);
    }

    if (uniformity < 3) score += 30;
    if (uniformity > 6) score -= 20;

    if (!hasBadSingleWordLine(lines, lang)) score += 20;
    else score -= 30;

    if (!containsIsolatedPunctuation(lines)) score += 10;
    else score -= 30;

    if (looksHourglass(lengths)) score -= 50;
    if (looksPyramid(lengths)) score -= 40;

    if (lines.length === 2 && lengths[0] < lengths[1]) score += 8;

    return score;
  }

  function scoreArabicSplit(lines, bubbleShape) {
    return scoreCommon(lines, bubbleShape, 'ar');
  }

  function scoreEnglishSplit(lines, bubbleShape) {
    return scoreCommon(lines, bubbleShape, 'en');
  }

  function recommendedMaxLines(wordCount, shape) {
    if (shape === 'box' || shape === 'wide-box') {
      if (wordCount <= 4) return 2;
      if (wordCount <= 8) return 3;
      return 4;
    }
    if (wordCount <= 3) return 1;
    if (wordCount <= 5) return 2;
    if (wordCount <= 7) return 3;
    return 4;
  }

  function hyphenVariants(words) {
    const variants = [words];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (!/^[A-Za-z]{7,}$/.test(w)) continue;
      if (/^[A-Z][a-z]+$/.test(w)) continue;
      const mid = Math.floor(w.length / 2);
      if (mid < 3 || w.length - mid < 3) continue;
      const splitWord = [w.slice(0, mid) + '-', w.slice(mid)];
      const next = [...words.slice(0, i), ...splitWord, ...words.slice(i + 1)];
      variants.push(next);
      break; // max 1 hyphenation per bubble
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
    for (const wordSet of pools) {
      const splits = generateAllSplits(wordSet, maxLines);
      for (const lines of splits) {
        if (lines.some((line) => STICKY_PUNCT_RE.test(line.trim()))) continue;
        const score = resolvedLang === 'ar'
          ? scoreArabicSplit(lines, bubbleShape)
          : scoreEnglishSplit(lines, bubbleShape);
        scored.push({ score, text: lines.join('\n') });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const unique = [];
    const seen = new Set();
    for (const s of scored) {
      if (seen.has(s.text)) continue;
      seen.add(s.text);
      unique.push(s);
      if (unique.length >= 3) break;
    }

    const best = unique[0]?.text || text;
    const alt1 = unique[1]?.text || best;
    const alt2 = unique[2]?.text || alt1;

    return { best, alternatives: [alt1, alt2], lang: resolvedLang };
  }

  window.detectLanguage = detectLanguage;
  window.splitIntoBubbles = splitIntoBubbles;
  window.generateAllSplits = generateAllSplits;
  window.scoreArabicSplit = scoreArabicSplit;
  window.scoreEnglishSplit = scoreEnglishSplit;
  window.formatBubble = formatBubble;
})();

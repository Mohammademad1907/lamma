// Smart grouping of item names that are "nearly the same":
// case, spacing, punctuation, Arabic letter variants, word order and small typos.
(function (root) {
  const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

  function normalize(s) {
    let t = String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
    t = t.replace(/[ً-ْٰـ]/g, '')          // tashkeel + tatweel
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)));
    t = t.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
    return t;
  }

  // Optimal string alignment distance (Damerau-Levenshtein with adjacent swaps), capped.
  function distance(a, b, cap) {
    if (Math.abs(a.length - b.length) > cap) return cap + 1;
    const m = a.length, n = b.length;
    let prev2 = null, prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur.push(v);
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > cap) return cap + 1;
      prev2 = prev; prev = cur;
    }
    return prev[n];
  }

  const numbers = s => (s.match(/\d+/g) || []).join(',');
  const compact = s => s.replace(/ /g, '');
  const sortedWords = s => s.split(' ').sort().join(' ');

  // a, b are already normalized. Returns '' (not similar) or a reason.
  function similar(a, b) {
    if (a === b) return 'same';
    if (numbers(a) !== numbers(b)) return '';            // "Pepsi 1L" vs "Pepsi 2L" never merge
    const ca = compact(a), cb = compact(b);
    if (ca === cb) return 'spacing';
    if (sortedWords(a) === sortedWords(b)) return 'word order';
    const len = Math.max(ca.length, cb.length);
    const cap = len >= 10 ? 2 : len >= 5 ? 1 : 0;         // short words ("coke"/"cake") stay apart
    if (cap && Math.min(ca.length, cb.length) >= 4 && distance(ca, cb, cap) <= cap) return 'typo';
    return '';
  }

  const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  /**
   * Groups items by name. items: [{name, ...}]. opts: {smart, blocks:Set(pairKey), joins:[[a,b]]}
   * Returns [{anchor, keys, items, variants, fuzzy}] where anchor is a stable key for the group.
   */
  function group(items, opts) {
    opts = opts || {};
    const blocks = opts.blocks || new Set();
    const keys = [...new Set(items.map(it => normalize(it.name)))].filter(Boolean);
    const parent = Object.fromEntries(keys.map(k => [k, k]));
    const find = k => (parent[k] === k ? k : (parent[k] = find(parent[k])));
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra < rb ? rb : ra] = ra < rb ? ra : rb; };
    if (opts.smart !== false) {
      for (let i = 0; i < keys.length; i++)
        for (let j = i + 1; j < keys.length; j++)
          if (!blocks.has(pairKey(keys[i], keys[j])) && similar(keys[i], keys[j])) union(keys[i], keys[j]);
    }
    for (const [a, b] of opts.joins || []) if (a in parent && b in parent) union(a, b);

    const groups = new Map();
    for (const it of items) {
      const k = normalize(it.name);
      if (!k) continue;
      const root = find(k);
      if (!groups.has(root)) groups.set(root, { anchor: root, keys: new Set(), items: [], spellings: new Map() });
      const g = groups.get(root);
      g.keys.add(k);
      g.items.push(it);
      const raw = String(it.name).trim().replace(/\s+/g, ' ');
      g.spellings.set(raw, (g.spellings.get(raw) || 0) + (it.qty || 1));
    }
    return [...groups.values()].map(g => {
      // label: the spelling family most people typed (by entries, not quantity), longest on ties
      const families = new Map();
      for (const it of g.items) { const k = normalize(it.name); families.set(k, (families.get(k) || 0) + 1); }
      const best = [...families.entries()].sort((x, y) => y[1] - x[1] || y[0].length - x[0].length)[0][0];
      const variants = [...g.spellings.entries()].sort((x, y) => (normalize(y[0]) === best) - (normalize(x[0]) === best) || y[1] - x[1] || y[0].length - x[0].length).map(e => e[0]);
      return { anchor: g.anchor, keys: [...g.keys].sort(), items: g.items, variants, label: prettify(variants[0]), fuzzy: g.keys.size > 1 };
    });
  }

  function prettify(s) {
    s = String(s || '').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const api = { normalize, distance, similar, group, pairKey, prettify };
  if (typeof module !== 'undefined') module.exports = api; else root.Fuzzy = api;
})(this);

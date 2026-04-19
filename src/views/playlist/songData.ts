import axios from 'axios';

const fetchWithProxy = async (targetUrl: string) => {
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://cors.sh/${targetUrl}`,
    `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];

  for (const proxy of proxies) {
    try {
      const res = await axios.get(proxy, { timeout: 8000 });
      const dataString = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data);
      if (dataString.includes('Forbidden') || dataString.includes('Cloudflare') || dataString.includes('error code: 1020')) {
        continue;
      }
      return res;
    } catch (_error) {
      // Try the next proxy.
    }
  }

  throw new Error('All proxies failed.');
};

export const cleanUpSongData = (rawArtist: string, rawTitle: string) => {
  let title = rawTitle;
  let artist = rawArtist;

  if (title.includes('|')) {
    const parts = title.split('|');
    title = parts[0];
    artist = parts[1] || artist;
  } else if (title.includes('-')) {
    const parts = title.split('-');
    artist = parts[0];
    title = parts[1];
  }

  title = title.replace(/\([^)]*\)|\[[^\]]*\]/g, '');
  artist = artist.replace(/\([^)]*\)|\[[^\]]*\]/g, '');

  const junkRegex = /(Official|Music Video|Lyric Video|'|Lyrics|Wish 107.5 Bus|Music|TV|Live|Acoustic|Performance|HD|HQ|Audio|VEVO|Topic|Channel|in Melbourne|Cover|\bVideo\b)/gi;
  title = title.replace(junkRegex, '').trim();
  artist = artist.replace(junkRegex, '').trim();

  return { cleanArtist: artist, cleanTitle: title };
};

const uniqueNonEmpty = (...values: string[]) => {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
};

const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();

const stripDecorators = (value: string) => normalizeSpaces(
  value
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft|featuring|with)\.?\s+[^-|/]+/gi, ' ')
    .replace(/\b(official|lyrics?|lyric video|music video|video|audio|live|acoustic|performance|cover|remix|version)\b/gi, ' ')
    .replace(/[|/_]+/g, ' ')
);

const splitSongTitle = (value: string) => {
  const normalized = normalizeSpaces(value);
  const separators = [' - ', ' | ', ' / ', ': '];
  for (const separator of separators) {
    if (normalized.includes(separator)) {
      return normalized.split(separator).map((part) => normalizeSpaces(part)).filter(Boolean);
    }
  }
  return [normalized];
};

const buildTitleCandidates = (rawTitle: string, cleanTitle: string) => {
  const parts = uniqueNonEmpty(rawTitle, cleanTitle).flatMap(splitSongTitle);
  const decorated = parts.flatMap((part) => [part, stripDecorators(part)]);
  return uniqueNonEmpty(...decorated);
};

const buildArtistCandidates = (rawArtist: string, cleanArtist: string, rawTitle: string) => {
  const titleParts = splitSongTitle(rawTitle);
  const possibleArtistFromTitle = titleParts.length > 1 ? titleParts[0] : '';
  const candidates = [
    cleanArtist,
    rawArtist,
    stripDecorators(cleanArtist),
    stripDecorators(rawArtist),
    stripDecorators(possibleArtistFromTitle),
    '',
  ];

  return uniqueNonEmpty(...candidates);
};

const scoreLyrics = (lyrics: string) => {
  if (!lyrics) return 0;
  const lines = lyrics.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lyrics.length + lines.length * 15;
};

const scoreChords = (chords: string) => {
  if (!chords) return 0;
  const chordMarkers = (chords.match(/\b[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6)?(?:\/[A-G][b#]?)?\b/g) || []).length;
  return chords.length + chordMarkers * 20;
};

const extractUGJson = (html: string) => {
  try {
    const dataMatch = html.match(/class="js-store" data-content="([^"]+)"/);
    if (dataMatch && dataMatch[1]) {
      const decoded = dataMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&apos;/g, "'");
      return JSON.parse(decoded);
    }

    const scriptMatch = html.match(/window\.UGAPP\.store\.page\s*=\s*(\{.+?\});/);
    if (scriptMatch && scriptMatch[1]) {
      return JSON.parse(scriptMatch[1]);
    }
  } catch (_error) {
    return null;
  }

  return null;
};

const fetchLyricsFromWorshipSongs = async (_artist: string, title: string) => {
  try {
    const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const targetUrl = `https://www.theworshipsongs.com/parts/lyrics/${slug}-lyrics.html`;
    const response = await fetchWithProxy(targetUrl);
    const contentMatch = response.data.match(/<div class="post-body entry-content[^"]*">([\s\S]*?)<\/div>/i);

    if (contentMatch && contentMatch[1]) {
      let lyrics = contentMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p><strong>.*?<\/strong><\/p>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&#\d+;/g, (match: string) => String.fromCharCode(parseInt(match.substring(2, match.length - 1), 10)))
        .replace(/&nbsp;/g, ' ')
        .trim();

      const firstRealLineIndex = lyrics.search(/\n\s*\n/);
      if (firstRealLineIndex !== -1) {
        lyrics = lyrics.substring(firstRealLineIndex).trim();
      }

      if (lyrics.length > 50) {
        return lyrics;
      }
    }
  } catch (_error) {
    return '';
  }

  return '';
};

const fetchLyricsFromLrclibStructured = async (artist: string, title: string) => {
  try {
    const res = await axios.get('https://lrclib.net/api/search', {
      timeout: 5000,
      params: {
        track_name: title,
        artist_name: artist || undefined,
      },
      headers: {
        'Lrclib-Client': 'church-system',
      },
    });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    const bestMatch = data?.find((d: any) => d.plainLyrics || d.syncedLyrics);
    if (bestMatch && (bestMatch.plainLyrics || bestMatch.syncedLyrics)) {
      return (bestMatch.plainLyrics || bestMatch.syncedLyrics).replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
    }
  } catch (_error) {
    return '';
  }

  return '';
};

const fetchLyricsFromLyricsOvh = async (artist: string, title: string) => {
  if (!artist.trim() || !title.trim()) {
    return '';
  }

  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
      timeout: 5000,
    });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) {
      return data.lyrics.trim();
    }
  } catch (_error) {
    return '';
  }

  return '';
};

export const fetchLyricsSmart = async (artist: string, title: string) => {
  const worshipSongsLyrics = await fetchLyricsFromWorshipSongs(artist, title);
  if (worshipSongsLyrics) {
    return worshipSongsLyrics;
  }

  const lrclibStructuredLyrics = await fetchLyricsFromLrclibStructured(artist, title);
  if (lrclibStructuredLyrics) {
    return lrclibStructuredLyrics;
  }

  const query = encodeURIComponent(`${artist} ${title}`);

  try {
    const res = await axios.get(`https://lrclib.net/api/search?q=${query}`, { timeout: 5000 });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    const bestMatch = data?.find((d: any) => d.plainLyrics || d.syncedLyrics);
    if (bestMatch && (bestMatch.plainLyrics || bestMatch.syncedLyrics)) {
      return (bestMatch.plainLyrics || bestMatch.syncedLyrics).replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
    }
  } catch (_error) {
    // Try the next source.
  }

  const lyricsOvhLyrics = await fetchLyricsFromLyricsOvh(artist, title);
  if (lyricsOvhLyrics) {
    return lyricsOvhLyrics;
  }

  try {
    const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${query}`, { timeout: 5000 });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) {
      return data.lyrics.trim();
    }
  } catch (_error) {
    // Try the next source.
  }

  try {
    const res = await fetchWithProxy(`https://some-random-api.com/lyrics?title=${query}`);
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) {
      return data.lyrics.trim();
    }
  } catch (_error) {
    // Try the next source.
  }

  try {
    const searchUrl = `https://christianlyricsonline.net/?s=${query}`;
    const searchRes = await fetchWithProxy(searchUrl);
    const links = searchRes.data.match(/href="(https:\/\/christianlyricsonline\.net\/(?:lyrics\/)?[^/"]+\/)"/g);
    if (links) {
      const postUrl = links.find((link: string) => !/category|tag|about|author/.test(link))?.replace(/href="|"/g, '');
      if (postUrl) {
        const articleRes = await fetchWithProxy(postUrl);
        const contentMatch = articleRes.data.match(/<div class="[^"]*entry-content[^"]*">([\s\S]*?)<\/div>/i);
        if (contentMatch && contentMatch[1]) {
          const rawLyrics = contentMatch[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&#8217;|&#039;/g, "'")
            .replace(/&#8220;|&#8221;/g, '"')
            .replace(/&nbsp;/g, ' ')
            .replace(/Share this:[\s\S]*/gi, '');

          if (rawLyrics.length > 50) {
            return rawLyrics.trim();
          }
        }
      }
    }
  } catch (_error) {
    return '';
  }

  return '';
};

export const fetchChordsSmart = async (artist: string, title: string) => {
  const query = encodeURIComponent(`${artist} ${title}`);
  const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // 1. PNWChords — try multiple slug patterns
  const pnwSlugs = [
    toSlug(`${title}-${artist}`),
    toSlug(title),
    toSlug(`${artist}-${title}`),
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  for (const slug of pnwSlugs) {
    try {
      const resPnw = await fetchWithProxy(`https://pnwchords.com/${slug}/`);
      const matchPre = resPnw.data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (matchPre?.[1]) {
        const result = matchPre[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#039;/g, "'").trim();
        if (result.length > 50) return result;
      }
    } catch (_error) { /* try next */ }
  }

  // 2. E-Chords
  try {
    const searchRes = await fetchWithProxy(`https://www.e-chords.com/search-all/${encodeURIComponent(`${title} ${artist}`)}`);
    const linkMatch = searchRes.data.match(/href="(https:\/\/www\.e-chords\.com\/chords\/[^"]+)"/);
    if (linkMatch?.[1]) {
      const tabRes = await fetchWithProxy(linkMatch[1]);
      const preMatch = tabRes.data.match(/<pre[^>]*id="core"[^>]*>([\s\S]*?)<\/pre>/i)
        || tabRes.data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch?.[1]) {
        const result = preMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (result.length > 50) return result;
      }
    }
  } catch (_error) { /* try next */ }

  // 3. AZChords
  try {
    const searchRes = await fetchWithProxy(`https://www.azchords.com/search?q=${encodeURIComponent(`${title} ${artist}`)}`);
    const linkMatch = searchRes.data.match(/href="(https:\/\/www\.azchords\.com\/[^"]+\.html)"/);
    if (linkMatch?.[1]) {
      const tabRes = await fetchWithProxy(linkMatch[1]);
      const preMatch = tabRes.data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch?.[1]) {
        const result = preMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (result.length > 50) return result;
      }
    }
  } catch (_error) { /* try next */ }

  // 4. Chordie
  try {
    const searchRes = await fetchWithProxy(`https://www.chordie.com/result.php?q=${query}`);
    const linkMatch = searchRes.data.match(/href="(\/chord\.php\?[^"]+)"/);
    if (linkMatch?.[1]) {
      const tabRes = await fetchWithProxy(`https://www.chordie.com${linkMatch[1]}`);
      const preMatch = tabRes.data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch?.[1]) {
        const result = preMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (result.length > 50) return result;
      }
    }
  } catch (_error) { /* try next */ }

  // 5. Ultimate Guitar
  try {
    const resC = await fetchWithProxy(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${query}`);
    const store = extractUGJson(resC.data);
    if (store) {
      const results = store?.store?.page?.data?.results || store?.data?.results || [];
      const chordTab = results.find((r: any) => r.type === 'Chords' && r.tab_url);
      if (chordTab?.tab_url) {
        const tabRes = await fetchWithProxy(chordTab.tab_url);
        const tabStore = extractUGJson(tabRes.data);
        if (tabStore) {
          const rawContent = tabStore?.store?.page?.data?.tab_view?.wiki_tab?.content || tabStore?.data?.tab_view?.wiki_tab?.content || '';
          if (rawContent) {
            return rawContent.replace(/\[\/?(ch|tab)\]/g, '').replace(/&#039;/g, "'").trim();
          }
        }
      }
    }
  } catch (_error) { /* try next */ }

  return '';
};

export const getCleanLyricsText = (lyrics: string) => {
  if (!lyrics) {
    return '';
  }

  const rawLines = lyrics.replace(/&#039;/g, "'").split(/\r?\n/);
  const result: string[] = [];
  const chordRegex = /^[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6|b|#|-|\+)*(?:\/[A-G][b#]?)?$/i;

  const isChordLine = (line: string) => {
    const words = line.trim().split(/\s+/);
    if (words.length === 0 || line.trim() === '') {
      return false;
    }

    let chordCount = 0;
    words.forEach((word) => {
      const cleanWord = word.replace(/[()]/g, '');
      if (chordRegex.test(cleanWord) || ['|', '-', '/', '!', 'x'].includes(cleanWord)) {
        chordCount++;
      }
    });

    return chordCount > 0 && chordCount / words.length > 0.4;
  };

  const isHeader = (line: string) => {
    const trimmed = line.trim();
    return /^\[(.*?)\]$/.test(trimmed) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(trimmed);
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line === '') {
      result.push('');
      continue;
    }

    if (isHeader(line)) {
      let hasLyricsBelow = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const next = rawLines[j].trim();
        if (next === '') {
          continue;
        }
        if (isHeader(next)) {
          break;
        }
        if (!isChordLine(next)) {
          hasLyricsBelow = true;
          break;
        }
      }

      if (hasLyricsBelow) {
        result.push(`\n[${line.replace(/[\[\]():]/g, '')}]\n`);
      }
      continue;
    }

    if (!isChordLine(line)) {
      result.push(line);
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const hasNonLatinScript = (text: string): boolean => {
  const matches = text.match(/[\u3000-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u3040-\u30ff]/g);
  return (matches?.length ?? 0) > 5;
};

const translateToEnglish = async (text: string): Promise<string> => {
  if (!text || !hasNonLatinScript(text)) return text;

  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current.length + line.length + 1 > 800) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);

  const translated: string[] = [];
  for (const chunk of chunks) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(chunk)}`;
      const res = await axios.get(url, { timeout: 8000 });
      const data = res.data;
      if (Array.isArray(data) && Array.isArray(data[0])) {
        translated.push(data[0].map((item: any) => item?.[0] ?? '').join(''));
      } else {
        translated.push(chunk);
      }
    } catch {
      translated.push(chunk);
    }
  }

  return translated.join('\n');
};

export const fetchSongResourcesSmart = async (rawArtist: string, rawTitle: string) => {
  const { cleanArtist, cleanTitle } = cleanUpSongData(rawArtist, rawTitle);
  const titleCandidates = buildTitleCandidates(rawTitle, cleanTitle);
  const artistCandidates = buildArtistCandidates(rawArtist, cleanArtist, rawTitle);

  let bestLyrics = '';
  let bestChords = '';
  let bestLyricsScore = 0;
  let bestChordsScore = 0;

  for (const title of titleCandidates) {
    for (const artist of artistCandidates) {
      const [lyricsResult, chordsResult] = await Promise.all([
        fetchLyricsSmart(artist, title),
        fetchChordsSmart(artist, title),
      ]);

      const nextLyricsScore = scoreLyrics(lyricsResult);
      const nextChordsScore = scoreChords(chordsResult);

      if (nextLyricsScore > bestLyricsScore) {
        bestLyrics = lyricsResult;
        bestLyricsScore = nextLyricsScore;
      }

      if (nextChordsScore > bestChordsScore) {
        bestChords = chordsResult;
        bestChordsScore = nextChordsScore;
      }

      if (bestLyricsScore > 200 && bestChordsScore > 200) {
        break;
      }
    }

    if (bestLyricsScore > 200 && bestChordsScore > 200) {
      break;
    }
  }

  let finalLyrics = bestLyrics;
  if (bestChords && (!bestLyrics || bestChords.length > bestLyrics.length + 50)) {
    finalLyrics = getCleanLyricsText(bestChords);
  }

  const [translatedLyrics, translatedChords] = await Promise.all([
    translateToEnglish(finalLyrics),
    translateToEnglish(bestChords),
  ]);

  return {
    lyrics: translatedLyrics || '',
    chords: translatedChords || '',
    cleanArtist,
    cleanTitle,
  };
};

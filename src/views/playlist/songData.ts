import axios from 'axios';
import axiosInstance from '../../plugin/axios';

const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();
const titleStopWords = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'live', 'lyrics', 'music', 'of', 'official', 'on', 'song', 'the', 'to', 'video', 'with']);

const uniqueNonEmpty = (...values: string[]) => {
  return Array.from(new Set(values.map((value) => normalizeSpaces(value)).filter(Boolean)));
};

const normalizeSearchText = (value: string) => normalizeSpaces(
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthik\b/g, 'tihik')
);

const titleTerms = (title: string) => {
  return Array.from(new Set(
    normalizeSearchText(title)
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !titleStopWords.has(word))
  ));
};

const titleMatchRatio = (haystack: string, title: string) => {
  const terms = titleTerms(title);
  if (terms.length === 0) return 0;

  const normalizedHaystack = ` ${normalizeSearchText(haystack)} `;
  const hits = terms.filter((term) => normalizedHaystack.includes(` ${term} `)).length;
  return hits / terms.length;
};

const hasMeaningfulArtist = (artist: string) => {
  const normalizedArtist = normalizeSearchText(stripDecorators(artist));
  return Boolean(normalizedArtist) && !/^(unknown|unknown artist|official|topic|channel)$/.test(normalizedArtist);
};

const isAmbiguousTitle = (title: string) => titleTerms(title).length <= 1;

const looksLikeRequestedSong = (candidateTitle: string, expectedTitle: string) => {
  const terms = titleTerms(expectedTitle);
  const ratio = titleMatchRatio(candidateTitle, expectedTitle);
  return ratio >= 0.6 || (terms.length <= 2 && ratio >= 0.5);
};

const stripDecorators = (value: string) => normalizeSpaces(
  value
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft|featuring|with)\.?\s+[^-|/]+/gi, ' ')
    .replace(/\b(official|lyrics?|lyric video|music video|video|audio|live|acoustic|performance|cover|remix|version|hd|hq|vevo|topic|channel|wish 107\.5 bus|wish 107\.5)\b/gi, ' ')
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

export const cleanUpSongData = (rawArtist: string, rawTitle: string) => {
  let title = normalizeSpaces(rawTitle || '');
  let artist = normalizeSpaces(rawArtist || '');

  // Only split human separators like "Artist - Title"; keep title words such as "TIHIK-THIK" intact.
  const separatedTitle = title.match(/^(.+?)\s(-|\||\/|:)\s(.+)$/);
  if (separatedTitle) {
    const firstPart = stripDecorators(separatedTitle[1]);
    const separator = separatedTitle[2];
    const secondPart = stripDecorators(separatedTitle[3]);
    const artistHint = stripDecorators(artist).toLowerCase().slice(0, 5);
    const secondLooksLikeArtist = /\b(band|church|collective|music|worship|team|singers|ministry|ministries)$\b/i.test(secondPart);

    if (artistHint && secondPart.toLowerCase().includes(artistHint)) {
      title = firstPart;
      artist = secondPart;
    } else if (artistHint && firstPart.toLowerCase().includes(artistHint)) {
      artist = firstPart;
      title = secondPart;
    } else if (!artist || /unknown artist/i.test(artist)) {
      if (separator === '|' || separator === '/' || secondLooksLikeArtist) {
        title = firstPart;
        artist = secondPart;
      } else {
        artist = firstPart;
        title = secondPart;
      }
    } else {
      title = firstPart;
    }
  }

  return {
    cleanArtist: stripDecorators(artist),
    cleanTitle: stripDecorators(title),
  };
};

const buildTitleCandidates = (rawTitle: string, cleanTitle: string) => {
  const parts = uniqueNonEmpty(rawTitle, cleanTitle).flatMap(splitSongTitle);
  const decorated = parts.flatMap((part) => [part, stripDecorators(part)]);
  return uniqueNonEmpty(...decorated);
};

const buildArtistCandidates = (rawArtist: string, cleanArtist: string, rawTitle: string) => {
  const titleParts = splitSongTitle(rawTitle);
  const possibleArtistsFromTitle = titleParts.length > 1 ? [titleParts[1], titleParts[0]] : [];
  const candidates = [
    cleanArtist,
    rawArtist,
    stripDecorators(cleanArtist),
    stripDecorators(rawArtist),
    ...possibleArtistsFromTitle.map(stripDecorators),
    '',
  ];

  return uniqueNonEmpty(...candidates);
};

const buildBackendCandidates = (
  rawArtist: string,
  rawTitle: string,
  cleanArtist: string,
  cleanTitle: string,
  artistCandidates: string[],
  titleCandidates: string[],
) => {
  const seen = new Set<string>();
  const candidates: Array<{ artist: string; title: string }> = [];

  const addCandidate = (artist: string, title: string) => {
    const nextArtist = normalizeSpaces(artist);
    const nextTitle = normalizeSpaces(title);
    if (!nextTitle) return;

    const key = `${nextArtist.toLowerCase()}|${nextTitle.toLowerCase()}`;
    if (seen.has(key)) return;

    seen.add(key);
    candidates.push({ artist: nextArtist, title: nextTitle });
  };

  addCandidate(cleanArtist, cleanTitle);
  addCandidate(rawArtist, rawTitle);

  for (const title of titleCandidates.slice(0, 4)) {
    for (const artist of artistCandidates.slice(0, 3)) {
      addCandidate(artist, title);
    }
  }

  return candidates.slice(0, 10);
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

const plainLyricsFromResult = (result: any) => {
  const lyrics = result?.plainLyrics || result?.syncedLyrics || '';
  return typeof lyrics === 'string' ? lyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim() : '';
};

const pickBestStructuredLyrics = (data: any, artist: string, title: string) => {
  if (!Array.isArray(data)) return '';

  let bestLyrics = '';
  let bestScore = 0;

  for (const result of data) {
    const lyrics = plainLyricsFromResult(result);
    if (!lyrics) continue;

    const resultTitle = String(result?.trackName || result?.name || result?.title || '');
    if (resultTitle && !looksLikeRequestedSong(resultTitle, title)) continue;

    const resultArtist = String(result?.artistName || result?.artist || '');
    const shouldRequireArtist = hasMeaningfulArtist(artist) && isAmbiguousTitle(title);
    const artistRatio = resultArtist ? titleMatchRatio(resultArtist, artist) : 0;
    if (shouldRequireArtist && artistRatio < 0.5) continue;

    let nextScore = scoreLyrics(lyrics) + titleMatchRatio(resultTitle, title) * 500;
    if (artist && resultArtist) {
      nextScore += artistRatio * 400;
    }

    if (nextScore > bestScore) {
      bestLyrics = lyrics;
      bestScore = nextScore;
    }
  }

  return bestLyrics;
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
    return pickBestStructuredLyrics(data, artist, title);
  } catch (_error) {
    return '';
  }
};

const fetchLyricsFromLrclibQuery = async (artist: string, title: string) => {
  try {
    const query = encodeURIComponent(`${artist} ${title}`.trim());
    const res = await axios.get(`https://lrclib.net/api/search?q=${query}`, { timeout: 5000 });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    return pickBestStructuredLyrics(data, artist, title);
  } catch (_error) {
    return '';
  }
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

const fetchLyricsFromPopcat = async (artist: string, title: string) => {
  try {
    const query = encodeURIComponent(`${artist} ${title}`.trim());
    const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${query}`, { timeout: 5000 });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    const resultTitle = String(data?.title || data?.song || '');
    if (!resultTitle || !looksLikeRequestedSong(resultTitle, title)) {
      return '';
    }

    const resultArtist = String(data?.artist || data?.artistName || '');
    if (hasMeaningfulArtist(artist) && isAmbiguousTitle(title) && titleMatchRatio(resultArtist, artist) < 0.5) {
      return '';
    }

    if (data?.lyrics && data.lyrics.length > 50) {
      return data.lyrics.trim();
    }
  } catch (_error) {
    return '';
  }

  return '';
};

export const fetchLyricsSmart = async (artist: string, title: string) => {
  const directResults = await Promise.all([
    fetchLyricsFromLrclibStructured(artist, title),
    fetchLyricsFromLrclibQuery(artist, title),
    fetchLyricsFromLyricsOvh(artist, title),
    fetchLyricsFromPopcat(artist, title),
  ]);

  return directResults.reduce((best, next) => scoreLyrics(next) > scoreLyrics(best) ? next : best, '');
};

export const fetchChordsSmart = async (_artist: string, _title: string) => {
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
    } catch (_error) {
      translated.push(chunk);
    }
  }

  return translated.join('\n');
};

const fetchSongResourcesFromBackend = async (artist: string, title: string) => {
  try {
    const res = await axiosInstance.post('playlists/fetch-song-resources', { artist, title });
    return {
      lyrics: typeof res.data?.lyrics === 'string' ? res.data.lyrics : '',
      chords: typeof res.data?.chords === 'string' ? res.data.chords : '',
    };
  } catch (_error) {
    return { lyrics: '', chords: '' };
  }
};

export const fetchSongResourcesSmart = async (rawArtist: string, rawTitle: string) => {
  const { cleanArtist, cleanTitle } = cleanUpSongData(rawArtist, rawTitle);
  const titleCandidates = buildTitleCandidates(rawTitle, cleanTitle);
  const artistCandidates = buildArtistCandidates(rawArtist, cleanArtist, rawTitle);

  let bestLyrics = '';
  let bestChords = '';
  let bestLyricsScore = 0;
  let bestChordsScore = 0;

  for (const title of titleCandidates.slice(0, 4)) {
    for (const artist of artistCandidates.slice(0, 3)) {
      const lyricsResult = await fetchLyricsSmart(artist, title);
      const nextLyricsScore = scoreLyrics(lyricsResult);

      if (nextLyricsScore > bestLyricsScore) {
        bestLyrics = lyricsResult;
        bestLyricsScore = nextLyricsScore;
      }

      if (bestLyricsScore > 220) {
        break;
      }
    }

    if (bestLyricsScore > 220) {
      break;
    }
  }

  const backendCandidates = buildBackendCandidates(rawArtist, rawTitle, cleanArtist, cleanTitle, artistCandidates, titleCandidates);
  for (const candidate of backendCandidates) {
    if (bestLyricsScore > 220 && bestChordsScore > 220) {
      break;
    }

    const backendFallback = await fetchSongResourcesFromBackend(candidate.artist, candidate.title);
    const backendLyricsScore = scoreLyrics(backendFallback.lyrics);
    const backendChordsScore = scoreChords(backendFallback.chords);

    if (backendLyricsScore > bestLyricsScore) {
      bestLyrics = backendFallback.lyrics;
      bestLyricsScore = backendLyricsScore;
    }

    if (backendChordsScore > bestChordsScore) {
      bestChords = backendFallback.chords;
      bestChordsScore = backendChordsScore;
    }
  }

  let finalLyrics = bestLyrics;
  if (bestChords && !bestLyrics) {
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

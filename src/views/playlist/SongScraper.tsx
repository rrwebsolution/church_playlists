import axios from 'axios';

// --- SUPER PROXY ENGINE ---
export const fetchWithProxy = async (targetUrl: string) => {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${targetUrl}`
  ];

  for (const proxy of proxies) {
    try {
      const res = await axios.get(proxy, { timeout: 5000 });
      if (proxy.includes('allorigins') && res.data?.contents) {
        return { data: res.data.contents };
      }
      if (res.data) return res;
    } catch (e) {}
  }
  throw new Error("Proxies failed");
};

// --- AGGRESSIVE TITLE CLEANER ---
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

  const junkRegex = /(Official|Music Video|Lyric Video|Lyrics|Music|TV|Live|Acoustic|Performance|HD|HQ|Audio|VEVO|Topic|Channel|in Melbourne|Cover|\bVideo\b)/gi;
  title = title.replace(junkRegex, '').trim();
  artist = artist.replace(junkRegex, '').trim();

  return { cleanArtist: artist, cleanTitle: title };
};

// --- ULTIMATE GUITAR JSON EXTRACTOR ---
const extractUGJson = (html: string) => {
  try {
    const dataMatch = html.match(/class="js-store" data-content="([^"]+)"/);
    if (dataMatch && dataMatch[1]) {
      const decoded = dataMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&apos;/g, "'");
      return JSON.parse(decoded);
    }
    const scriptMatch = html.match(/window\.UGAPP\.store\.page\s*=\s*(\{.+?\});/);
    if (scriptMatch && scriptMatch[1]) return JSON.parse(scriptMatch[1]);
  } catch (e) { }
  return null;
};

// --- MULTI-LAYER LYRICS ENGINE ---
export const fetchLyricsSmart = async (artist: string, title: string) => {
  const query = encodeURIComponent(`${artist} ${title}`);
  const qArtist = encodeURIComponent(artist);
  const qTitle = encodeURIComponent(title);

  try {
    const searchUrl = `https://christianlyricsonline.net/?s=${query}`;
    const searchRes = await fetchWithProxy(searchUrl);
    const links = searchRes.data.match(/href="(https:\/\/christianlyricsonline\.net\/(?:lyrics\/)?[^/"]+\/)"/g);
    let postUrl = null;
    
    if (links) {
      for (const link of links) {
        const cleanLink = link.replace(/href="|"/g, '');
        if (!cleanLink.includes('/category/') && !cleanLink.includes('/tag/') && !cleanLink.includes('/about/') && !cleanLink.includes('/author/')) {
          postUrl = cleanLink;
          break;
        }
      }
    }

    if (postUrl) {
      const articleRes = await fetchWithProxy(postUrl);
      const contentMatch = articleRes.data.match(/<div class="[^"]*entry-content[^"]*">([\s\S]*?)<\/div>/i);
      
      if (contentMatch && contentMatch[1]) {
        let rawLyrics = contentMatch[1]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&#8217;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"')
          .replace(/&nbsp;/g, ' ')
          .replace(/Share this:[\s\S]*/gi, ''); 

        if (rawLyrics.length > 50) return rawLyrics.trim();
      }
    }
  } catch (e) {}

  try {
    const res = await fetchWithProxy(`https://lrclib.net/api/search?q=${query}`);
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    const bestMatch = data?.find((d: any) => d.plainLyrics !== null && d.plainLyrics !== "");
    if (bestMatch?.plainLyrics) return bestMatch.plainLyrics.trim();
  } catch (e) {}

  try {
    const res = await fetchWithProxy(`https://api.popcat.xyz/lyrics?song=${query}`);
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) return data.lyrics.trim();
  } catch (e) {}

  try {
    const res = await fetchWithProxy(`https://api.lyrics.ovh/v1/${qArtist}/${qTitle}`);
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) return data.lyrics.trim();
  } catch (e) {}

  return "";
};

// --- MULTI-LAYER CHORDS ENGINE ---
export const fetchChordsSmart = async (artist: string, title: string) => {
  const query = encodeURIComponent(`${artist} ${title}`);
  
  try {
    const slug = `${title}-${artist}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const pnwUrl = `https://pnwchords.com/${slug}/`;
    const resPnw = await fetchWithProxy(pnwUrl);
    const matchPre = resPnw.data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (matchPre && matchPre[1]) {
      return matchPre[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').trim();
    }
  } catch(e) { }

  try {
    const chordSearchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${query}`;
    const resC = await fetchWithProxy(chordSearchUrl);
    const store = extractUGJson(resC.data);
    
    if (store) {
      const results = store?.store?.page?.data?.results || store?.data?.results || [];
      const chordTab = results.find((r: any) => r.type === 'Chords' && r.tab_url);
      
      if (chordTab && chordTab.tab_url) {
        const tabRes = await fetchWithProxy(chordTab.tab_url);
        const tabStore = extractUGJson(tabRes.data);
        if (tabStore) {
          const rawContent = tabStore?.store?.page?.data?.tab_view?.wiki_tab?.content || tabStore?.data?.tab_view?.wiki_tab?.content || "";
          if (rawContent) return rawContent.replace(/\[\/?ch\]/g, '').replace(/\[\/?tab\]/g, '').trim();
        }
      }
    }
  } catch(e) {}

  try {
    const googleFallback = `https://html.duckduckgo.com/html/?q=site:tabs.ultimate-guitar.com/tab/ ${query} chords`;
    const resG = await fetchWithProxy(googleFallback);
    const linkMatch = resG.data.match(/href="\/\/duckduckgo\.com\/l\/\?uddg=(https%3A%2F%2Ftabs\.ultimate-guitar\.com%2Ftab%2F[^"]+?)"/);
    
    if (linkMatch && linkMatch[1]) {
      const decodedUrl = decodeURIComponent(linkMatch[1]);
      const tabRes = await fetchWithProxy(decodedUrl);
      const tabStore = extractUGJson(tabRes.data);
      if (tabStore) {
        const rawContent = tabStore?.store?.page?.data?.tab_view?.wiki_tab?.content || tabStore?.data?.tab_view?.wiki_tab?.content || "";
        if (rawContent) return rawContent.replace(/\[\/?ch\]/g, '').replace(/\[\/?tab\]/g, '').trim();
      }
    }
  } catch (e) {}

  return "";
};

// --- LYRICS FORMATTER BADGE UI ---
export const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;
  const lines = lyrics.split(/\r?\n/); 
  return lines.map((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={index} className="h-4"></div>; 
    
    const isHeader = /^\[(.*?)\]$/.test(trimmedLine) || 
                     /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(trimmedLine);

    if (isHeader) {
      return (
        <div key={index} className="mt-8 mb-3 flex justify-center">
          <span className="px-5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
            {trimmedLine.replace(/[\[\]():]/g, '')}
          </span>
        </div>
      );
    }
    return (
      <div key={index} className="text-zinc-800 dark:text-zinc-100 leading-relaxed font-semibold text-[15px] md:text-[17px] py-0.5 text-center">
        {trimmedLine}
      </div>
    );
  });
};
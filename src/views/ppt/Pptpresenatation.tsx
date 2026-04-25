import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import JSZip from 'jszip';
import {
  Presentation, Search, Trash2, CalendarDays,
  Layers, MonitorDot, PlusCircle, Sparkles,
  Edit3, MoreVertical, LayoutPanelLeft, Check, Download, FileUp, PencilLine,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, WandSparkles, X, ImagePlus, LoaderCircle, Save, FileImage,
  Minus, Plus
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { PptPresentationFile } from '../../App';
import {
  createDefaultSlideFormat,
  createPresentationSlide,
  deserializeSlides,
  exportSlidesToPptx,
  generateSlidesFromOutline,
  htmlToPlainText,
  parsePptxFile,
  plainTextToHtml,
  serializeSlides,
  slidesToSourceText,
  type PresentationSlide,
  type SlideTextAlign,
} from '@/lib/ppt';
import {
  PRESENTATION_CANVAS_CLASS,
  PRESENTATION_CANVAS_FRAME_CLASS,
  PRESENTATION_CANVAS_MEDIA_CLASS,
  PRESENTATION_CANVAS_OVERLAY_CLASS,
} from './components/PresentationSlideCanvas';

export const PPT_TEMPLATES = [
  { id: 'classic-dark', name: 'Classic Dark', bg: 'bg-zinc-950', text: 'text-white', accent: 'text-indigo-400', font: 'font-sans' },
  { id: 'modern-light', name: 'Modern Light', bg: 'bg-zinc-50', text: 'text-zinc-900', accent: 'text-indigo-600', font: 'font-sans' },
  { id: 'worship-blue', name: 'Worship Night', bg: 'bg-linear-to-br from-indigo-900 via-blue-900 to-black', text: 'text-white', accent: 'text-sky-300', font: 'font-serif' },
  { id: 'sunset-gradient', name: 'Deep Sunset', bg: 'bg-linear-to-br from-orange-900 via-red-900 to-zinc-950', text: 'text-orange-50', accent: 'text-yellow-400', font: 'font-sans' },
  { id: 'minimal-green', name: 'Nature Clean', bg: 'bg-emerald-950', text: 'text-emerald-50', accent: 'text-emerald-400', font: 'font-serif' },
  { id: 'royal-purple', name: 'Royal Majesty', bg: 'bg-linear-to-tr from-purple-900 to-indigo-950', text: 'text-purple-50', accent: 'text-fuchsia-400', font: 'font-sans' },
];

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true,
});

const categorizeByTime = <T extends { id: string; uploadedAt: string }>(items: T[]) => {
  const groups: Record<string, T[]> = { Today: [], 'This Week': [], 'This Month': [], Older: [] };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const thisWeekStart = todayStart - (7 * oneDay);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const sortedItems = [...items].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  sortedItems.forEach(item => {
    const time = new Date(item.uploadedAt).getTime();
    if (time >= todayStart) groups.Today.push(item);
    else if (time >= thisWeekStart) groups['This Week'].push(item);
    else if (time >= thisMonthStart) groups['This Month'].push(item);
    else groups.Older.push(item);
  });
  return groups;
};

type EditorMode = 'create' | 'outline' | 'upload';

const createEmptySlide = (): PresentationSlide => createPresentationSlide();
const toSourceType = (mode: EditorMode): PptPresentationFile['sourceType'] => mode === 'upload' ? 'uploaded' : 'generated';
const createPresentationId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const FONT_OPTIONS = ['Arial Black', 'Arial', 'Calibri', 'Georgia', 'Times New Roman', 'Verdana', 'Aptos'];
const MIN_FONT_SIZE = 18;
const MAX_FONT_SIZE = 64;
const FONT_SIZE_OPTIONS = Array.from(
  { length: MAX_FONT_SIZE - MIN_FONT_SIZE + 1 },
  (_, index) => MIN_FONT_SIZE + index
);
const TEMPLATE_EXPORT_LOOKS: Record<string, { background: string; text: string }> = {
  'classic-dark': { background: '#09090B', text: '#FFFFFF' },
  'modern-light': { background: '#FAFAFA', text: '#18181B' },
  'worship-blue': { background: '#172554', text: '#E0F2FE' },
  'sunset-gradient': { background: '#7F1D1D', text: '#FFF7ED' },
  'minimal-green': { background: '#022C22', text: '#ECFDF5' },
  'royal-purple': { background: '#4C1D95', text: '#FAE8FF' },
};
const BIBLE_BOOK_SUGGESTIONS = [
  { name: 'Genesis', aliases: ['gen', 'ge', 'gn'] },
  { name: 'Exodus', aliases: ['exo', 'exod', 'ex'] },
  { name: 'Leviticus', aliases: ['lev', 'le'] },
  { name: 'Numbers', aliases: ['num', 'nm'] },
  { name: 'Deuteronomy', aliases: ['deut', 'dt'] },
  { name: 'Joshua', aliases: ['josh', 'jos'] },
  { name: 'Judges', aliases: ['judg', 'jdg'] },
  { name: 'Ruth', aliases: ['ru'] },
  { name: '1 Samuel', aliases: ['1 sam', '1sa', 'i samuel'] },
  { name: '2 Samuel', aliases: ['2 sam', '2sa', 'ii samuel'] },
  { name: '1 Kings', aliases: ['1 ki', '1 kings', 'i kings'] },
  { name: '2 Kings', aliases: ['2 ki', '2 kings', 'ii kings'] },
  { name: '1 Chronicles', aliases: ['1 chr', '1 chronicles', 'i chronicles'] },
  { name: '2 Chronicles', aliases: ['2 chr', '2 chronicles', 'ii chronicles'] },
  { name: 'Ezra', aliases: ['ezr'] },
  { name: 'Nehemiah', aliases: ['neh'] },
  { name: 'Esther', aliases: ['est'] },
  { name: 'Job', aliases: ['jb'] },
  { name: 'Psalms', aliases: ['ps', 'psalm', 'psa'] },
  { name: 'Proverbs', aliases: ['prov', 'pro'] },
  { name: 'Ecclesiastes', aliases: ['eccl', 'ecc'] },
  { name: 'Song of Solomon', aliases: ['song', 'songs', 'sos'] },
  { name: 'Isaiah', aliases: ['isa'] },
  { name: 'Jeremiah', aliases: ['jer'] },
  { name: 'Lamentations', aliases: ['lam'] },
  { name: 'Ezekiel', aliases: ['ezek', 'eze'] },
  { name: 'Daniel', aliases: ['dan'] },
  { name: 'Hosea', aliases: ['hos'] },
  { name: 'Joel', aliases: ['jl'] },
  { name: 'Amos', aliases: ['am'] },
  { name: 'Obadiah', aliases: ['obad', 'ob'] },
  { name: 'Jonah', aliases: ['jon'] },
  { name: 'Micah', aliases: ['mic'] },
  { name: 'Nahum', aliases: ['nah'] },
  { name: 'Habakkuk', aliases: ['hab'] },
  { name: 'Zephaniah', aliases: ['zeph', 'zep'] },
  { name: 'Haggai', aliases: ['hag'] },
  { name: 'Zechariah', aliases: ['zech', 'zec'] },
  { name: 'Malachi', aliases: ['mal'] },
  { name: 'Matthew', aliases: ['matt', 'mt'] },
  { name: 'Mark', aliases: ['mk', 'mrk'] },
  { name: 'Luke', aliases: ['lk', 'luk'] },
  { name: 'John', aliases: ['jn', 'jhn'] },
  { name: 'Acts', aliases: ['ac'] },
  { name: 'Romans', aliases: ['rom', 'ro'] },
  { name: '1 Corinthians', aliases: ['1 cor', '1co', 'i corinthians'] },
  { name: '2 Corinthians', aliases: ['2 cor', '2co', 'ii corinthians'] },
  { name: 'Galatians', aliases: ['gal', 'ga'] },
  { name: 'Ephesians', aliases: ['eph'] },
  { name: 'Philippians', aliases: ['phil', 'php'] },
  { name: 'Colossians', aliases: ['col'] },
  { name: '1 Thessalonians', aliases: ['1 thes', '1 thess', '1th'] },
  { name: '2 Thessalonians', aliases: ['2 thes', '2 thess', '2th'] },
  { name: '1 Timothy', aliases: ['1 tim', '1ti'] },
  { name: '2 Timothy', aliases: ['2 tim', '2ti'] },
  { name: 'Titus', aliases: ['tit'] },
  { name: 'Philemon', aliases: ['phlm', 'phm'] },
  { name: 'Hebrews', aliases: ['heb'] },
  { name: 'James', aliases: ['jam', 'jas'] },
  { name: '1 Peter', aliases: ['1 pet', '1pe'] },
  { name: '2 Peter', aliases: ['2 pet', '2pe'] },
  { name: '1 John', aliases: ['1 jn', '1jo'] },
  { name: '2 John', aliases: ['2 jn', '2jo'] },
  { name: '3 John', aliases: ['3 jn', '3jo'] },
  { name: 'Jude', aliases: ['jud'] },
  { name: 'Revelation', aliases: ['rev', 're'] },
] as const;
const BIBLE_API_BASE_URL = import.meta.env.VITE_BIBLE_API_BASE_URL || 'https://bible-api.com';
const API_BIBLE_BASE_URL = import.meta.env.VITE_API_BIBLE_BASE_URL || 'https://rest.api.bible/v1';
const API_BIBLE_KEY = import.meta.env.VITE_API_BIBLE_KEY || '';
const ESV_API_BASE_URL = import.meta.env.VITE_ESV_API_BASE_URL || 'https://api.esv.org/v3';
const ESV_API_KEY = import.meta.env.VITE_ESV_API_KEY || '';
const API_BIBLE_IDS = {
  nlt: import.meta.env.VITE_API_BIBLE_ID_NLT || '',
  niv: import.meta.env.VITE_API_BIBLE_ID_NIV || '',
  esv: import.meta.env.VITE_API_BIBLE_ID_ESV || '',
  apd: import.meta.env.VITE_API_BIBLE_ID_APD || '',
} as const;
const BIBLE_TRANSLATIONS = [
  { value: 'web', label: 'WEB', provider: 'public' as const },
  { value: 'kjv', label: 'KJV', provider: 'public' as const },
  { value: 'asv', label: 'ASV', provider: 'public' as const },
  { value: 'bbe', label: 'BBE', provider: 'public' as const },
  { value: 'nlt', label: 'NLT', provider: 'licensed' as const, bibleId: API_BIBLE_IDS.nlt },
  { value: 'niv', label: 'NIV', provider: 'licensed' as const, bibleId: API_BIBLE_IDS.niv },
  { value: 'esv', label: 'ESV', provider: 'esv' as const },
  { value: 'apd', label: 'Pulong sa Dios (Cebuano)', provider: 'licensed' as const, bibleId: API_BIBLE_IDS.apd },
];

const getLicensedBibleErrorMessage = (translationLabel: string, rawMessage?: string) => {
  const normalized = String(rawMessage || '').toLowerCase();

  if (normalized.includes('not authorized') || normalized.includes('unauthorized') || normalized.includes('forbidden')) {
    return `${translationLabel} is not included in your current API.Bible access. Use NLT or Pulong sa Dios, or update your API.Bible plan/Bible ID.`;
  }

  if (normalized.includes('not found')) {
    return `${translationLabel} verse not found for that reference.`;
  }

  return rawMessage || `${translationLabel} verse not found.`;
};

const getTranslationBadgeText = (translation: { provider: 'public' | 'licensed' | 'esv'; available?: boolean; value: string }) => {
  if (translation.provider === 'public') return 'Available';
  if (translation.provider === 'esv') return translation.available ? 'Available' : 'Setup needed';
  if (translation.value === 'niv') return translation.available ? 'Available' : 'Plan locked';
  return translation.available ? 'Available' : 'Setup needed';
};

const getTranslationBadgeClasses = (translation: { provider: 'public' | 'licensed' | 'esv'; available?: boolean; value: string }) => {
  if (translation.provider === 'public' || translation.available) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300';
  }

  if (translation.value === 'niv') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-300';
  }

  return 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300';
};
const alignButtons: Array<{ value: SlideTextAlign; icon: typeof AlignLeft; label: string }> = [
  { value: 'left', icon: AlignLeft, label: 'Align Left' },
  { value: 'center', icon: AlignCenter, label: 'Align Center' },
  { value: 'right', icon: AlignRight, label: 'Align Right' },
  { value: 'justify', icon: AlignJustify, label: 'Justify' },
];
const editorCommandToAlign: Partial<Record<string, SlideTextAlign>> = {
  justifyLeft: 'left',
  justifyCenter: 'center',
  justifyRight: 'right',
  justifyFull: 'justify',
};
const editorCommandToFormatKey: Partial<Record<string, keyof PresentationSlide['format']>> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
};

export default function Pptpresenatation() {
  const { presentations, setPresentations } = useOutletContext<any>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateBgInputRef = useRef<HTMLInputElement>(null);
  const presentationListRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const slideEditorRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const activeMenuRef = useRef<HTMLDivElement | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [generateTitle, setGenerateTitle] = useState('');
  const [slidesToGenerate, setSlidesToGenerate] = useState<PresentationSlide[]>([createEmptySlide()]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(PPT_TEMPLATES[0].id);
  const [selectedBackgroundImageUrl, setSelectedBackgroundImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [bulkOutlineInput, setBulkOutlineInput] = useState('');
  const [bibleReference, setBibleReference] = useState('');
  const [bibleTranslation, setBibleTranslation] = useState('web');
  const [bibleVerseText, setBibleVerseText] = useState('');
  const [bibleReferenceResult, setBibleReferenceResult] = useState('');
  const [isSearchingBibleVerse, setIsSearchingBibleVerse] = useState(false);
  const [isBibleModalOpen, setIsBibleModalOpen] = useState(false);
  const [showBibleSuggestions, setShowBibleSuggestions] = useState(false);

  const isLicensedBibleReady = Boolean(API_BIBLE_KEY);
  const isEsvBibleReady = Boolean(ESV_API_KEY);
  const resolvedBibleTranslations = useMemo(() => (
    BIBLE_TRANSLATIONS.map((translation) => ({
      ...translation,
      available:
        translation.provider === 'public' ||
        (translation.provider === 'licensed' && Boolean(API_BIBLE_KEY && translation.bibleId)) ||
        (translation.provider === 'esv' && Boolean(ESV_API_KEY)),
    }))
  ), []);

  const filteredAndCategorizedPresentations = useMemo(() => {
    const filtered = presentations.filter((p: PptPresentationFile) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return categorizeByTime(filtered);
  }, [presentations, searchQuery]);

  const hasSearchResults = useMemo(() => {
    return Object.values(filteredAndCategorizedPresentations).some(group => group.length > 0);
  }, [filteredAndCategorizedPresentations]);

  const validSlides = useMemo(() => slidesToGenerate.filter((slide) => (slide.text || htmlToPlainText(slide.html)).trim() !== '' || slide.imageUrl), [slidesToGenerate]);
  const bibleBookSuggestions = useMemo(() => {
    const query = bibleReference.trim().toLowerCase();
    if (!query) return [];

    const match = query.match(/^([1-3]?\s*[a-z.\s]+?)(\s+\d.*)?$/i);
    const rawBookPart = (match?.[1] || query).replace(/\./g, '').replace(/\s+/g, ' ').trim();
    if (!rawBookPart) return [];

    return BIBLE_BOOK_SUGGESTIONS
      .filter((book) => {
        const candidates = [book.name.toLowerCase(), ...book.aliases.map((alias) => alias.toLowerCase())];
        return candidates.some((candidate) => candidate.startsWith(rawBookPart) || candidate.includes(rawBookPart));
      })
      .slice(0, 8);
  }, [bibleReference]);

  useEffect(() => {
    const selectedTranslation = resolvedBibleTranslations.find((translation) => translation.value === bibleTranslation);
    if (selectedTranslation && !selectedTranslation.available) {
      setBibleTranslation('web');
    }
  }, [bibleTranslation, resolvedBibleTranslations]);

  useEffect(() => {
    const openBibleModal = () => setIsBibleModalOpen(true);
    window.addEventListener('open-ppt-bible-modal', openBibleModal);
    return () => window.removeEventListener('open-ppt-bible-modal', openBibleModal);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!activeMenuRef.current) return;
      if (!activeMenuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    slidesToGenerate.forEach((slide) => {
      const editorNode = slideEditorRefs.current[slide.id];
      const nextHtml = slide.html || plainTextToHtml(slide.text);

      if (!editorNode) return;
      if (document.activeElement === editorNode) return;
      if (editorNode.innerHTML !== nextHtml) {
        editorNode.innerHTML = nextHtml;
      }
    });
  }, [slidesToGenerate]);

  const resetEditor = () => {
    setEditingId(null);
    setGenerateTitle('');
    setSlidesToGenerate([createEmptySlide()]);
    setActivePreviewIndex(0);
    setEditorMode('create');
    setSelectedTemplateId(PPT_TEMPLATES[0].id);
    setSelectedBackgroundImageUrl('');
  };

  const buildPresentationData = (slides: PresentationSlide[], title: string, sourceType: PptPresentationFile['sourceType'], originalFileName?: string): PptPresentationFile => ({
    id: editingId || createPresentationId(),
    name: title,
    slidesCount: slides.length,
    uploadedAt: new Date().toISOString(),
    thumbnailUrl: 'https://via.placeholder.com/150/4f46e5/ffffff?text=PPT',
    sourceText: slidesToSourceText(slides),
    slideData: serializeSlides(slides),
    templateId: selectedTemplateId,
    backgroundImageUrl: selectedBackgroundImageUrl || undefined,
    sourceType,
    originalFileName,
  });

  const upsertPresentation = (presentationData: PptPresentationFile, successTitle: string) => {
    if (editingId) {
      setPresentations((prev: PptPresentationFile[]) => prev.map((p) => p.id === editingId ? presentationData : p));
    } else {
      setPresentations((prev: PptPresentationFile[]) => [presentationData, ...prev]);
    }
    Toast.fire({ icon: 'success', title: successTitle });
  };

  const handleEditSlides = (p: PptPresentationFile) => {
    const restoredSlides = deserializeSlides(p.slideData, p.sourceText);
    setActiveMenuId(null);
    setEditingId(p.id);
    setGenerateTitle(p.name);
    setSelectedTemplateId(p.templateId || PPT_TEMPLATES[0].id);
    setSelectedBackgroundImageUrl(p.backgroundImageUrl || '');
    setSlidesToGenerate(restoredSlides.length > 0 ? restoredSlides : [createEmptySlide()]);
    setEditorMode(p.sourceType === 'uploaded' ? 'upload' : 'create');
    setActivePreviewIndex(0);
    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRenameClick = (p: PptPresentationFile) => {
    setActiveMenuId(null);
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const handleToggleCardMenu = (event: ReactMouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveMenuId((current) => current === id ? null : id);
  };

  const applyBibleBookSuggestion = (bookName: string) => {
    const trimmed = bibleReference.trim();
    const match = trimmed.match(/^([1-3]?\s*[a-z.\s]+?)(\s+\d.*)?$/i);
    const suffix = match?.[2] || '';
    setBibleReference(`${bookName}${suffix}`);
    setShowBibleSuggestions(false);
  };

  const handleSaveRename = (id: string) => {
    if (!renameValue.trim()) return;
    setPresentations((prev: PptPresentationFile[]) => prev.map((p) => p.id === id ? { ...p, name: renameValue.trim() } : p));
    setRenamingId(null);
    Toast.fire({ icon: 'success', title: 'Renamed!' });
  };

  const handleSaveSlides = () => {
    if (validSlides.length === 0) {
      Toast.fire({ icon: 'warning', title: 'Add at least one slide.' });
      return;
    }

    const finalTitle = generateTitle.trim() || validSlides[0].text.split('\n')[0].substring(0, 40) || 'Untitled Presentation';
    const presentationData = buildPresentationData(validSlides, finalTitle, toSourceType(editorMode));
    upsertPresentation(presentationData, editingId ? 'Presentation Updated!' : 'Slides Saved!');
    setGenerateTitle(finalTitle);
  };

  const handleGenerateFromOutline = () => {
    if (!bulkOutlineInput.trim()) {
      Toast.fire({ icon: 'warning', title: 'Paste your sermon outline first.' });
      return;
    }

    const generated = generateSlidesFromOutline(bulkOutlineInput, generateTitle.trim() || 'Generated Presentation');
    setGenerateTitle(generated.title);
    setSlidesToGenerate(generated.slides.length > 0 ? generated.slides : [createEmptySlide()]);
    setEditorMode('outline');
    setActivePreviewIndex(0);
    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
    Toast.fire({ icon: 'success', title: `${generated.slides.length} slides drafted.` });
  };

  const handleSearchBibleVerse = async () => {
    if (!bibleReference.trim()) {
      Toast.fire({ icon: 'warning', title: 'Enter a Bible reference first.' });
      return;
    }

    const selectedTranslation = resolvedBibleTranslations.find((translation) => translation.value === bibleTranslation);

    setIsSearchingBibleVerse(true);
    setBibleVerseText('');
    setBibleReferenceResult('');

    try {
      if (selectedTranslation?.provider === 'licensed') {
        if (!API_BIBLE_KEY || !selectedTranslation.bibleId) {
          throw new Error(`${selectedTranslation?.label || 'This translation'} is not configured yet. Add the API.Bible key and Bible ID in .env, then restart the dev server.`);
        }

        const encodedReference = encodeURIComponent(bibleReference.trim());
        const response = await fetch(`${API_BIBLE_BASE_URL}/bibles/${selectedTranslation.bibleId}/search?query=${encodedReference}`, {
          headers: {
            'api-key': API_BIBLE_KEY,
          },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getLicensedBibleErrorMessage(selectedTranslation.label, payload?.message));
        }

        const firstPassage = payload?.data?.passages?.[0];
        const firstVerse = payload?.data?.verses?.[0];
        const reference = firstPassage?.reference || firstVerse?.reference || bibleReference.trim();
        const content = firstPassage?.content || firstVerse?.text || '';
        const cleanedText = String(content)
          .replace(/<span[^>]*class="v"[^>]*>.*?<\/span>/g, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleanedText) {
          throw new Error(`${selectedTranslation.label} verse not found.`);
        }

        setBibleReferenceResult(reference);
        setBibleVerseText(cleanedText);
      } else if (selectedTranslation?.provider === 'esv') {
        if (!ESV_API_KEY) {
          throw new Error('ESV is not configured yet. Add the ESV API key in .env, then restart the dev server.');
        }

        const encodedReference = encodeURIComponent(bibleReference.trim());
        const response = await fetch(
          `${ESV_API_BASE_URL}/passage/text/?q=${encodedReference}&include-passage-references=false&include-verse-numbers=false&include-first-verse-numbers=false&include-footnotes=false&include-footnote-body=false&include-headings=false&include-short-copyright=false&include-copyright=false&include-passage-horizontal-lines=false&include-heading-horizontal-lines=false`,
          {
            headers: {
              Authorization: `Token ${ESV_API_KEY}`,
            },
          }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.detail || 'Verse not found.');
        }

        const firstPassage = Array.isArray(payload?.passages) ? payload.passages[0] : '';
        const cleanedText = String(firstPassage || '')
          .replace(/\s+/g, ' ')
          .replace(/\(ESV\)\s*$/g, '')
          .trim();

        if (!cleanedText) {
          throw new Error('Verse not found.');
        }

        setBibleReferenceResult(String(payload?.canonical || bibleReference.trim()));
        setBibleVerseText(cleanedText);
      } else {
        const encodedReference = encodeURIComponent(bibleReference.trim());
        const response = await fetch(`${BIBLE_API_BASE_URL}/${encodedReference}?translation=${bibleTranslation}`);
        const payload = await response.json();

        if (!response.ok || payload.error) {
          throw new Error(payload.error || 'Verse not found.');
        }

        const cleanedText = String(payload.text || '').replace(/\s+/g, ' ').trim();
        setBibleReferenceResult(String(payload.reference || bibleReference.trim()));
        setBibleVerseText(cleanedText);
      }
      Toast.fire({ icon: 'success', title: 'Bible verse loaded.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch Bible verse.';
      setBibleVerseText('');
      setBibleReferenceResult('');
      Toast.fire({ icon: 'error', title: message });
    } finally {
      setIsSearchingBibleVerse(false);
    }
  };

  const handleAddBibleVerseSlide = () => {
    const finalReference = bibleReferenceResult || bibleReference.trim();
    if (!finalReference && !bibleVerseText.trim()) {
      Toast.fire({ icon: 'warning', title: 'Search a Bible verse first.' });
      return;
    }

    const verseContent = [finalReference, bibleVerseText.trim()].filter(Boolean).join('\n');
    const nextSlide = createPresentationSlide({
      text: verseContent,
      html: plainTextToHtml(verseContent),
      format: {
        ...createDefaultSlideFormat(),
        align: 'center',
        fontSize: 24,
      },
    });

    setSlidesToGenerate((prev) => [...prev, nextSlide]);
    setActivePreviewIndex(slidesToGenerate.length);
    Toast.fire({ icon: 'success', title: 'Bible verse added as a new slide.' });
  };

  const handleInsertBibleVerseToActiveSlide = () => {
    const finalReference = bibleReferenceResult || bibleReference.trim();
    if (!finalReference && !bibleVerseText.trim()) {
      Toast.fire({ icon: 'warning', title: 'Search a Bible verse first.' });
      return;
    }

    const verseBlock = [finalReference, bibleVerseText.trim()].filter(Boolean).join('\n');
    setSlidesToGenerate((prev) => prev.map((slide, index) => (
      index === activePreviewIndex
        ? {
            ...slide,
            text: slide.text.trim() ? `${slide.text}\n\n${verseBlock}` : verseBlock,
            html: `${slide.html || plainTextToHtml(slide.text)}${plainTextToHtml(`\n${verseBlock}`)}`,
          }
        : slide
    )));
    Toast.fire({ icon: 'success', title: 'Bible verse inserted into active slide.' });
  };

  const handleExportSlides = async () => {
    if (validSlides.length === 0) {
      Toast.fire({ icon: 'warning', title: 'No slides to export.' });
      return;
    }

    const finalTitle = generateTitle.trim() || validSlides[0].text.split('\n')[0].substring(0, 40) || 'Presentation';
    setIsExporting(true);
    try {
      await exportSlidesToPptx({ title: finalTitle, slides: validSlides, templateId: selectedTemplateId, backgroundImageUrl: selectedBackgroundImageUrl || undefined });
      const presentationData = buildPresentationData(validSlides, finalTitle, toSourceType(editorMode));
      upsertPresentation(presentationData, 'PPT file downloaded!');
    } catch {
      Toast.fire({ icon: 'error', title: 'Export failed.' });
    } finally {
      setIsExporting(false);
    }
  };

  const readBlobAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unable to read image data.'));
    };
    reader.onerror = () => reject(new Error('Unable to read image data.'));
    reader.readAsDataURL(blob);
  });

  const getExportSafeImageUrl = async (imageUrl?: string) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('data:')) return imageUrl;

    try {
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error('Image request failed.');
      }

      const blob = await response.blob();
      return await readBlobAsDataUrl(blob);
    } catch {
      return null;
    }
  };

  const escapeSvgText = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const wrapSvgText = (text: string, maxCharsPerLine: number) => {
    const normalizedLines = text.split('\n');
    const wrappedLines: string[] = [];

    normalizedLines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        wrappedLines.push('');
        return;
      }

      const words = trimmedLine.split(/\s+/);
      let currentLine = '';

      words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (candidate.length <= maxCharsPerLine || !currentLine) {
          currentLine = candidate;
          return;
        }

        wrappedLines.push(currentLine);
        currentLine = word;
      });

      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    });

    return wrappedLines;
  };

  const buildSlideJpgDataUrl = async (slide: PresentationSlide, slideIndex: number) => {
    let svgUrl: string | null = null;

    try {
      const look = TEMPLATE_EXPORT_LOOKS[selectedTemplateId] || TEMPLATE_EXPORT_LOOKS['classic-dark'];
      const width = 1600;
      const height = 900;
      const paddingX = 76;
      const paddingY = 68;
      const contentWidth = width - (paddingX * 2);
      const contentHeight = height - (paddingY * 2);
      const [exportBackgroundImageUrl, exportSlideImageUrl] = await Promise.all([
        getExportSafeImageUrl(selectedBackgroundImageUrl || undefined),
        getExportSafeImageUrl(slide.imageUrl),
      ]);
      const skippedExternalImages = Boolean(
        (selectedBackgroundImageUrl && !exportBackgroundImageUrl) ||
        (slide.imageUrl && !exportSlideImageUrl)
      );
      const fontSize = Math.max(32, slide.format.fontSize * 2);
      const lineHeight = Math.round(fontSize * 1.22);
      const plainText = htmlToPlainText(slide.html || plainTextToHtml(slide.text)).replace(/\r\n/g, '\n').trim();
      const maxCharsPerLine = Math.max(12, Math.floor(contentWidth / (fontSize * 0.55)));
      const wrappedLines = wrapSvgText(plainText, maxCharsPerLine);
      const lineCount = Math.max(1, wrappedLines.length);
      const textBlockHeight = lineCount * lineHeight;
      const imageGap = exportSlideImageUrl ? 34 : 0;
      const imageHeight = exportSlideImageUrl ? Math.min(contentHeight * 0.42, 320) : 0;
      const totalContentHeight = imageHeight + imageGap + textBlockHeight;
      const startY = Math.max(paddingY + (fontSize * 0.9), ((height - totalContentHeight) / 2) + fontSize);
      const imageY = startY - fontSize;
      const textStartY = imageY + imageHeight + imageGap + fontSize;
      const textAnchor = slide.format.align === 'center'
        ? 'middle'
        : slide.format.align === 'right'
          ? 'end'
          : 'start';
      const textX = slide.format.align === 'center'
        ? width / 2
        : slide.format.align === 'right'
          ? width - paddingX
          : paddingX;
      const underlineDecoration = slide.format.underline ? 'text-decoration="underline"' : '';
      const fontStyle = slide.format.italic ? 'italic' : 'normal';
      const fontWeight = slide.format.bold ? 700 : 400;
      const imageX = paddingX;
      const imageWidth = contentWidth;
      const imageMarkup = exportSlideImageUrl
        ? `
          <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" rx="24" ry="24" fill="rgba(0,0,0,0.22)" />
          <image href="${exportSlideImageUrl}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid meet" />
        `
        : '';
      const textMarkup = wrappedLines.length > 0
        ? wrappedLines.map((line, lineIndex) => (
            `<tspan x="${textX}" y="${textStartY + (lineIndex * lineHeight)}">${line ? escapeSvgText(line) : '&#160;'}</tspan>`
          )).join('')
        : `<tspan x="${textX}" y="${textStartY}">&#160;</tspan>`;

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <rect width="${width}" height="${height}" fill="${look.background}" />
          ${exportBackgroundImageUrl ? `<image href="${exportBackgroundImageUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />` : ''}
          ${exportBackgroundImageUrl ? `<rect width="${width}" height="${height}" fill="rgba(0,0,0,0.25)" />` : ''}
          ${imageMarkup}
          <text
            x="${textX}"
            y="${textStartY}"
            fill="${look.text}"
            font-size="${fontSize}"
            font-family="${escapeSvgText(slide.format.fontFamily || 'Arial')}, Arial, sans-serif"
            font-weight="${fontWeight}"
            font-style="${fontStyle}"
            text-anchor="${textAnchor}"
            ${underlineDecoration}
          >${textMarkup}</text>
        </svg>
      `;
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        if (!svgUrl) {
          reject(new Error('Unable to prepare slide image.'));
          return;
        }
        image.decoding = 'sync';
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Unable to render slide ${slideIndex + 1}.`));
        image.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Unable to create image canvas.');
      }

      context.fillStyle = look.background;
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      return {
        jpgUrl: canvas.toDataURL('image/jpeg', 0.95),
        skippedExternalImages,
      };
    } finally {
      if (svgUrl) {
        URL.revokeObjectURL(svgUrl);
      }
    }
  };

  const handleExportJpg = async () => {
    if (slidesToGenerate.length === 0) {
      Toast.fire({ icon: 'warning', title: 'Add at least one slide first.' });
      return;
    }

    setIsExportingJpg(true);

    try {
      const exportZip = new JSZip();
      let skippedExternalImages = false;

      for (let index = 0; index < slidesToGenerate.length; index += 1) {
        const { jpgUrl, skippedExternalImages: skippedForSlide } = await buildSlideJpgDataUrl(slidesToGenerate[index], index);
        skippedExternalImages = skippedExternalImages || skippedForSlide;
        const base64Data = jpgUrl.split(',')[1] || '';
        exportZip.file(
          `${(generateTitle || 'presentation').replace(/[^\w-]+/g, '_')}-slide-${index + 1}.jpg`,
          base64Data,
          { base64: true }
        );
      }

      const zipBlob = await exportZip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `${(generateTitle || 'presentation').replace(/[^\w-]+/g, '_')}-slides-jpg.zip`;
      link.click();
      URL.revokeObjectURL(zipUrl);

      Toast.fire({
        icon: skippedExternalImages ? 'warning' : 'success',
        title: skippedExternalImages ? 'Slides downloaded with some blocked images skipped.' : 'All slide JPGs downloaded!',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'JPG export failed.';
      Toast.fire({ icon: 'error', title: message });
    } finally {
      setIsExportingJpg(false);
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsedSlides = await parsePptxFile(file);
      if (parsedSlides.length === 0) {
        Toast.fire({ icon: 'warning', title: 'No slide text found in this PPT.' });
        return;
      }

      const nextTitle = file.name.replace(/\.(pptx|ppt)$/i, '');
      setEditorMode('upload');
      setEditingId(null);
      setGenerateTitle(nextTitle);
      setSlidesToGenerate(parsedSlides);
      setActivePreviewIndex(0);
      editorRef.current?.scrollIntoView({ behavior: 'smooth' });

      const presentationData = buildPresentationData(parsedSlides, nextTitle, 'uploaded', file.name);
      setPresentations((prev: PptPresentationFile[]) => [presentationData, ...prev]);
      Toast.fire({ icon: 'success', title: 'PPT uploaded and previewed!' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read this file.';
      Toast.fire({ icon: 'error', title: message });
    } finally {
      event.target.value = '';
    }
  };

  const handleDelete = async (p: PptPresentationFile) => {
    setActiveMenuId(null);
    const result = await Swal.fire({
      title: 'Delete?', text: `Delete "${p.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444'
    });
    if (result.isConfirmed) {
      setPresentations((prev: PptPresentationFile[]) => prev.filter((item) => item.id !== p.id));
      Toast.fire({ icon: 'success', title: 'Deleted' });
    }
  };

  const updateSlideContent = (id: number, html: string) => {
    setSlidesToGenerate((prev) => prev.map((slide) => (
      slide.id === id
        ? { ...slide, html, text: htmlToPlainText(html) }
        : slide
    )));
  };

  const updateSlideFormat = (id: number, updater: (format: PresentationSlide['format']) => PresentationSlide['format']) => {
    setSlidesToGenerate(prev => prev.map(slide => (
      slide.id === id
        ? { ...slide, format: updater(slide.format ?? createDefaultSlideFormat()) }
        : slide
    )));
  };

  const adjustSlideFontSize = (id: number, delta: number) => {
    updateSlideFormat(id, (format) => ({
      ...format,
      fontSize: Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, format.fontSize + delta)),
    }));
  };

  const runEditorCommand = (id: number, command: string, value?: string) => {
    const target = slideEditorRefs.current[id];
    if (!target) return;

    target.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
    updateSlideContent(id, target.innerHTML);

    const nextAlign = editorCommandToAlign[command];
    if (nextAlign) {
      updateSlideFormat(id, (format) => ({ ...format, align: nextAlign }));
    }

    const nextFormatKey = editorCommandToFormatKey[command];
    if (nextFormatKey) {
      const isActive = document.queryCommandState(command);
      updateSlideFormat(id, (format) => ({ ...format, [nextFormatKey]: isActive }));
    }
  };

  const handleSlideImageUpload = (id: number, file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      setSlidesToGenerate((prev) => prev.map((slide) => (
        slide.id === id ? { ...slide, imageUrl } : slide
      )));
      Toast.fire({ icon: 'success', title: 'Image added to slide.' });
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateBackgroundUpload = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      setSelectedBackgroundImageUrl(imageUrl);
      Toast.fire({ icon: 'success', title: 'Template background image added.' });
    };
    reader.readAsDataURL(file);
  };

  const removeSlide = (id: number) => {
    setSlidesToGenerate(prev => {
      if (prev.length === 1) return [createEmptySlide()];
      const nextSlides = prev.filter(slide => slide.id !== id);
      setActivePreviewIndex(current => Math.min(current, Math.max(nextSlides.length - 1, 0)));
      return nextSlides;
    });
  };

  const selectedTemplate = PPT_TEMPLATES.find((template) => template.id === selectedTemplateId) || PPT_TEMPLATES[0];
  const templateBackgroundOverlay = selectedBackgroundImageUrl ? 'bg-black/25' : 'bg-transparent';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 px-4 relative min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-6 px-2">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-purple-500 text-white rounded-3xl shadow-xl shadow-purple-500/20"><MonitorDot className="w-8 h-8" /></div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tighter">PPT Presentation</h1>
            <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest leading-none mt-2">Upload PowerPoint or build slides then export to PPT</p>
          </div>
        </div>
        <input type="file" accept=".ppt,.pptx" ref={fileInputRef} onChange={handleUploadFile} className="hidden" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)] gap-8 items-start mt-10">
        <div ref={editorRef} className={`p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-white/5 shadow-lg backdrop-blur-md flex flex-col justify-start min-h-160 transition-all ${editingId ? 'ring-2 ring-indigo-500' : ''}`}>
          <div className="mb-6 rounded-[2rem] border border-zinc-200/80 dark:border-zinc-800 bg-linear-to-r from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500 mb-2">Create Presentation</p>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Build slides for worship, sermons, and events</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Create manually, generate from outline, or upload a PowerPoint file and continue editing from here.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {slidesToGenerate.length} Slides
                </div>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {editorMode}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {editingId ? <Sparkles className="w-5 h-5 text-amber-500" /> : <PlusCircle className="w-5 h-5 text-indigo-500" />}
                {editingId ? 'Update Presentation' : 'Create Presentation'}
              </h3>
              {editingId && <button onClick={resetEditor} className="text-[10px] font-bold text-red-500 uppercase border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition-all">Cancel Edit</button>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-3xl bg-zinc-100 dark:bg-zinc-800 p-2">
              <button onClick={() => setEditorMode('create')} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${editorMode === 'create' ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' : 'text-zinc-500'}`}>
                <PencilLine className="w-4 h-4" /> Create Slides
              </button>
              <button onClick={() => setEditorMode('outline')} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${editorMode === 'outline' ? 'bg-white dark:bg-zinc-900 text-amber-600 shadow-sm' : 'text-zinc-500'}`}>
                <WandSparkles className="w-4 h-4" /> Generate Outline
              </button>
              <button onClick={() => fileInputRef.current?.click()} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${editorMode === 'upload' ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' : 'text-zinc-500'}`}>
                <FileUp className="w-4 h-4" /> Upload PPTX
              </button>
            </div>

            <div className="rounded-[2rem] border border-indigo-100 dark:border-indigo-500/20 bg-linear-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500 mb-2">Current Mode</p>
              <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                {editorMode === 'upload'
                  ? 'Upload a PPTX and preview all slide text below'
                  : editorMode === 'outline'
                    ? 'Paste sermon notes and auto-generate draft slides'
                    : 'Create slides manually and fine-tune them below'}
              </h4>
              <p className="text-sm text-zinc-500 mt-2">
                {editorMode === 'upload'
                  ? 'After upload, the extracted slides stay visible below and you can still save or export them again.'
                  : editorMode === 'outline'
                    ? 'Best for long outlines from your pastor. Paste once, generate drafts, then edit only what needs cleanup.'
                    : 'Each editor block becomes one slide. Add, remove, and style slides manually while the preview updates live.'}
              </p>
            </div>

            {editorMode === 'outline' && (
              <div className="rounded-[2rem] border border-amber-200 dark:border-amber-500/20 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-900 p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2">Quick Generate</p>
                  <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Paste sermon outline and auto-build draft slides</h4>
                  <p className="text-sm text-zinc-500 mt-2">
                    Best for notes like `Title`, `Text`, `Main Question`, numbered points, scriptures, bullets, and conclusion. The system will draft the slides first, then you can edit them below.
                  </p>
                </div>
                <textarea
                  value={bulkOutlineInput}
                  onChange={(e) => setBulkOutlineInput(e.target.value)}
                  placeholder={`Paste sermon notes here...\n\nExample:\nTitle: The Fight of Faith\nText: 1 Timothy 6:12\nMain Question:\nWhat do I need to know about this fight of faith?\n\n1. The Truth: You Are in a Fight\nEphesians 6:12\n...`}
                  className="w-full min-h-52 rounded-[1.5rem] border-2 border-amber-100 dark:border-amber-500/20 bg-white/90 dark:bg-black/30 p-5 outline-none text-zinc-800 dark:text-zinc-100 font-medium leading-relaxed focus:border-amber-400 transition-all"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handleGenerateFromOutline} className="flex items-center justify-center gap-2 px-6 py-4 bg-amber-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all">
                    <WandSparkles className="w-4 h-4" /> Generate From Outline
                  </button>
                  <button onClick={() => setBulkOutlineInput('')} className="flex items-center justify-center gap-2 px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">
                    Clear Paste Area
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 block">Template Style</label>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Slide canvas uses Microsoft PowerPoint widescreen 16:9</p>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
              {PPT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`shrink-0 rounded-2xl border-2 p-2 transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/20 scale-105 shadow-sm'
                      : 'border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 hover:border-indigo-300'
                  }`}
                >
                  <div className={`w-16 h-10 rounded-xl ${tpl.bg} border border-white/20`} />
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Template Background Image</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Insert an image to use as the slide background for this presentation.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={templateBgInputRef}
                    onChange={(e) => {
                      handleTemplateBackgroundUpload(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => templateBgInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-indigo-600 transition-all hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-zinc-950 dark:text-indigo-300 dark:hover:bg-indigo-950/20"
                  >
                    <ImagePlus className="w-4 h-4" /> Upload BG
                  </button>
                  {selectedBackgroundImageUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedBackgroundImageUrl('')}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-950/20"
                    >
                      <X className="w-4 h-4" /> Remove BG
                    </button>
                  )}
                </div>
              </div>
              {selectedBackgroundImageUrl && (
                <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-zinc-200 dark:border-zinc-800">
                  <img src={selectedBackgroundImageUrl} alt="Template background preview" className="h-32 w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <input type="text" value={generateTitle} onChange={(e) => setGenerateTitle(e.target.value)} placeholder="Presentation Title..." className="w-full px-5 py-3.5 bg-white dark:bg-black/40 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none text-zinc-900 dark:text-zinc-100 font-bold focus:border-indigo-500/50 mb-6 transition-all" />

          <div className="flex-1 flex flex-col gap-4 mb-4">
            {/* All slides stacked vertically — each slide has its own controls */}
            <div className="space-y-4">
              {slidesToGenerate.map((slide, index) => (
                <div key={slide.id} className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${activePreviewIndex === index ? 'text-indigo-500' : 'text-zinc-400'}`}>Slide {index + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{slide.text.trim() ? `${slide.text.trim().split(/\s+/).length} words` : 'Empty'}</span>
                      <button onClick={() => removeSlide(slide.id)} className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"><Trash2 className="w-3 h-3" /> Remove</button>
                    </div>
                  </div>

                  <div className="rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black/40 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 px-3 py-3 bg-zinc-50/80 dark:bg-zinc-900/70">
                      <select value={slide.format.fontFamily} onChange={(e) => updateSlideFormat(slide.id, (f) => ({ ...f, fontFamily: e.target.value }))} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none">
                        {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                      </select>
                      <div className="flex items-center overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <button onClick={() => adjustSlideFontSize(slide.id, -1)} disabled={slide.format.fontSize <= MIN_FONT_SIZE} className="px-3 py-2 transition-all text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Decrease Font Size"><Minus className="w-4 h-4" /></button>
                        <select value={slide.format.fontSize} onChange={(e) => updateSlideFormat(slide.id, (f) => ({ ...f, fontSize: Number(e.target.value) }))} className="border-x border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-center text-xs font-bold text-zinc-700 dark:text-zinc-200 outline-none">
                          {FONT_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                        <button onClick={() => adjustSlideFontSize(slide.id, 1)} disabled={slide.format.fontSize >= MAX_FONT_SIZE} className="px-3 py-2 transition-all text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Increase Font Size"><Plus className="w-4 h-4" /></button>
                      </div>
                      <button onClick={() => runEditorCommand(slide.id, 'bold')} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 transition-all text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" title="Bold"><Bold className="w-4 h-4" /></button>
                      <button onClick={() => runEditorCommand(slide.id, 'italic')} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 transition-all text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" title="Italic"><Italic className="w-4 h-4" /></button>
                      <button onClick={() => runEditorCommand(slide.id, 'underline')} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 transition-all text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" title="Underline"><Underline className="w-4 h-4" /></button>
                      <div className="flex items-center gap-2">
                        {alignButtons.map(({ value, icon: Icon, label }) => (
                          <button key={value} onClick={() => runEditorCommand(slide.id, value === 'left' ? 'justifyLeft' : value === 'center' ? 'justifyCenter' : value === 'right' ? 'justifyRight' : 'justifyFull')} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 transition-all text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" title={label}><Icon className="w-4 h-4" /></button>
                        ))}
                      </div>
                      <label className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 transition-all text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSlideImageUpload(slide.id, e.target.files?.[0])} />
                        <ImagePlus className="w-4 h-4" />
                      </label>
                    </div>
                  </div>

                  {/* Editable canvas — aspect-video, same size as Slides Preview */}
                  <div
                    onClick={() => setActivePreviewIndex(index)}
                    className={`${PRESENTATION_CANVAS_CLASS} cursor-text transition-all ${selectedTemplate.bg} ${selectedTemplate.text} ${selectedTemplate.font} ${activePreviewIndex === index ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10' : ''}`}
                  >
                    {selectedBackgroundImageUrl && (
                      <img src={selectedBackgroundImageUrl} alt="Slide background" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className={`${PRESENTATION_CANVAS_OVERLAY_CLASS} ${templateBackgroundOverlay}`} />
                    <div className={`${PRESENTATION_CANVAS_FRAME_CLASS} gap-4`}>
                      {slide.imageUrl && (
                        <div className={`${PRESENTATION_CANVAS_MEDIA_CLASS} border border-white/15 bg-black/20 relative`}>
                          <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="h-full w-full object-contain bg-black/40" />
                          <button onClick={(e) => { e.stopPropagation(); setSlidesToGenerate((prev) => prev.map((s) => s.id === slide.id ? { ...s, imageUrl: undefined } : s)); }} className="absolute top-2 right-2 rounded-xl bg-black/60 text-white px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all">Remove Image</button>
                        </div>
                      )}
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        ref={(node) => {
                          slideEditorRefs.current[slide.id] = node;
                          if (node && document.activeElement !== node) {
                            const nextHtml = slide.html || plainTextToHtml(slide.text);
                            if (node.innerHTML !== nextHtml) node.innerHTML = nextHtml;
                          }
                        }}
                        onFocus={() => setActivePreviewIndex(index)}
                        onInput={(e) => updateSlideContent(slide.id, e.currentTarget.innerHTML)}
                        className={`w-full min-h-0 flex-1 overflow-hidden bg-transparent outline-none leading-[1.1] whitespace-pre-wrap ${selectedTemplate.text} ${selectedTemplate.font}`}
                        style={{
                          fontSize: `${slide.format.fontSize}px`,
                          fontFamily: slide.format.fontFamily,
                          textAlign: slide.format.align,
                          fontWeight: slide.format.bold ? 'bold' : 'normal',
                          fontStyle: slide.format.italic ? 'italic' : 'normal',
                          textDecoration: slide.format.underline ? 'underline' : 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-auto">
            <button onClick={() => setSlidesToGenerate(prev => [...prev, createEmptySlide()])} className="flex items-center justify-center gap-2 px-4 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl text-[11px] font-bold uppercase hover:bg-zinc-200 transition-all">
              <PlusCircle className="w-5 h-5" /> Add Slide
            </button>
            <button onClick={handleSaveSlides} className="flex items-center justify-center gap-2 px-7 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all">
              <Save className="w-4 h-4" /> {editingId ? 'Update Slides' : 'Save Slides'}
            </button>
            <button onClick={handleExportSlides} disabled={isExporting} className="flex items-center justify-center gap-2 px-7 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-60">
              {isExporting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Exporting...' : 'Export PPT'}
            </button>
            <button onClick={handleExportJpg} disabled={isExportingJpg} className="flex items-center justify-center gap-2 px-7 py-4 bg-amber-500 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-amber-600 transition-all disabled:opacity-60">
              {isExportingJpg ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
              {isExportingJpg ? 'Rendering...' : 'Export JPG'}
            </button>
          </div>

        </div>

        <div className="xl:sticky xl:top-6">
          <div className="flex flex-col gap-4 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 p-6 md:p-8 shadow-lg backdrop-blur-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Presentation Files</p>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Saved presentations</h3>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Search, reopen, rename, or delete your uploaded and generated presentation files here.
              </p>
            </div>

            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search presentations..." className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none text-sm font-semibold transition-all shadow-sm" />
            </div>

            <div ref={presentationListRef} className="space-y-10 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1 custom-scrollbar">
              {presentations.length === 0 ? (
                <div className="py-20 text-center opacity-40 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
                  <Presentation className="w-12 h-12 mx-auto mb-4 text-zinc-400" /><p className="font-black uppercase tracking-widest text-xs text-zinc-500">No presentations yet</p>
                </div>
              ) : !hasSearchResults && searchQuery !== '' ? (
                <div className="py-20 text-center opacity-40 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] animate-in fade-in zoom-in-95">
                  <Search className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                  <p className="font-black uppercase tracking-widest text-xs text-zinc-500">No matching presentations found</p>
                  <button onClick={() => setSearchQuery('')} className="mt-4 text-[10px] font-bold text-indigo-500 uppercase hover:underline">Clear search query</button>
                </div>
              ) : (
                Object.entries(filteredAndCategorizedPresentations as Record<string, PptPresentationFile[]>).map(([label, groupPresentations]) => (
                  groupPresentations.length > 0 && (
                    <div key={label} className="animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-4 mb-6 px-2">
                        <CalendarDays className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-black uppercase tracking-widest">{label}</h3>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-1 gap-5">
                        {groupPresentations.map((p: PptPresentationFile) => (
                          <div key={p.id} className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 hover:border-indigo-500 hover:shadow-2xl transition-all relative cursor-pointer" onClick={() => renamingId !== p.id && navigate(`/app/ppt-presentation/${p.id}`)}>
                            <div className="flex justify-between items-start mb-4 relative z-30">
                              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><Presentation className="w-7 h-7" /></div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                                <div
                                  className="relative"
                                  ref={activeMenuId === p.id ? activeMenuRef : null}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button onClick={(e) => handleToggleCardMenu(e, p.id)} className={`p-2 rounded-xl transition-all ${activeMenuId === p.id ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><MoreVertical className="w-4.5 h-4.5" /></button>
                                  {activeMenuId === p.id && (
                                    <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl z-50 py-2 animate-in slide-in-from-top-2">
                                      <button onClick={(e) => { e.stopPropagation(); handleRenameClick(p); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"><Edit3 className="w-4 h-4 text-indigo-500" /> Rename Title</button>
                                      <button onClick={(e) => { e.stopPropagation(); handleEditSlides(p); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"><LayoutPanelLeft className="w-4 h-4 text-purple-500" /> Edit Slide Text</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="relative z-20" onClick={(e) => renamingId === p.id && e.stopPropagation()}>
                              {renamingId === p.id ? (
                                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                  <input autoFocus type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(p.id); if (e.key === 'Escape') setRenamingId(null); }} className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border-2 border-indigo-500 rounded-lg outline-none text-sm font-bold text-zinc-900 dark:text-white" />
                                  <button onClick={(e) => { e.stopPropagation(); handleSaveRename(p.id); }} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"><Check className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                              <p className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1"><Layers className="w-3 h-3" /> {p.slidesCount} Slides</p>
                              <p className="text-[10px] text-zinc-500/70 font-bold uppercase">{p.sourceType === 'uploaded' ? 'Uploaded PPTX' : 'Generated Slides'}</p>
                              <p className="text-[8px] text-zinc-500/70 font-bold uppercase">Created: {new Date(p.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <div className="flex flex-col gap-4 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 p-6 md:p-8 shadow-lg backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Presentation Notes</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Workspace guide</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Quick reminders while you create, review, and export your slides.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-[1.75rem] border border-indigo-200 dark:border-indigo-500/20 bg-linear-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-950 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500 mb-3">Create Presentation</p>
              <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Edit each slide directly</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Every slide has its own font, size, alignment, and image controls so you can style them independently.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-200 dark:border-emerald-500/20 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-950 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 mb-3">Presentation Files</p>
              <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Reuse saved decks fast</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Use the right panel to reopen previous presentations, rename titles, or continue editing existing slide decks.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-amber-200 dark:border-amber-500/20 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-950 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-3">Export Tips</p>
              <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Finalize before download</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Check your template, background image, and slide text first, then export to PPT or JPG when the layout looks right.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isBibleModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-emerald-200/50 dark:border-emerald-500/20 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-950">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 mb-2">Bible Verse Helper</p>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Search verse and insert it into slides</h3>
              </div>
              <button onClick={() => setIsBibleModalOpen(false)} className="p-3 rounded-2xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <p className="text-sm text-zinc-500">
                Search by reference like `John 3:16`, preview the verse, then add it as a new slide or insert it into the currently selected slide.
              </p>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={bibleReference}
                    onChange={(e) => {
                      setBibleReference(e.target.value);
                      setShowBibleSuggestions(true);
                    }}
                    onFocus={() => setShowBibleSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowBibleSuggestions(false), 120)}
                    placeholder="Bible reference, e.g. 1 Timothy 6:12"
                    className="w-full rounded-[1.25rem] border-2 border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-black/30 px-5 py-3.5 outline-none text-zinc-800 dark:text-zinc-100 font-semibold focus:border-emerald-400 transition-all"
                  />
                  {showBibleSuggestions && bibleBookSuggestions.length > 0 && (
                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[1.25rem] border border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-zinc-950 shadow-2xl">
                      {bibleBookSuggestions.map((book) => (
                        <button
                          key={book.name}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyBibleBookSuggestion(book.name)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-700 transition-all hover:bg-emerald-50 dark:text-zinc-100 dark:hover:bg-emerald-950/20"
                        >
                          <span>{book.name}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Book</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={bibleTranslation}
                  onChange={(e) => setBibleTranslation(e.target.value)}
                  className="w-full rounded-[1.25rem] border-2 border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-black/30 px-5 py-3.5 outline-none text-zinc-800 dark:text-zinc-100 font-semibold focus:border-emerald-400 transition-all"
                >
                  {resolvedBibleTranslations.map((translation) => (
                    <option key={translation.value} value={translation.value} disabled={!translation.available}>
                      {translation.label}
                      {translation.provider === 'licensed' ? (translation.available ? ' - API.Bible' : ' - setup needed') : ''}
                      {translation.provider === 'esv' ? (translation.available ? ' - ESV API' : ' - setup needed') : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[1.5rem] border border-amber-200 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-950/10 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 mb-2">Translation Note</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  `WEB`, `KJV`, `ASV`, and `BBE` use the current public API. `NLT`, `NIV`, and `Pulong sa Dios` use API.Bible. `ESV` uses the official Crossway ESV API token from `.env`.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {resolvedBibleTranslations.map((translation) => (
                    <span
                      key={translation.value}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getTranslationBadgeClasses(translation)}`}
                    >
                      {translation.label} • {getTranslationBadgeText(translation)}
                    </span>
                  ))}
                </div>
                {!isLicensedBibleReady && (
                  <p className="text-sm text-red-500 mt-3 font-semibold">
                    API.Bible key not found yet. Licensed translations are disabled for now. Add the env values, then restart the dev server.
                  </p>
                )}
                {!isEsvBibleReady && (
                  <p className="text-sm text-red-500 mt-3 font-semibold">
                    ESV API key not found yet. ESV is disabled until `VITE_ESV_API_KEY` is set and the dev server is restarted.
                  </p>
                )}
                {isLicensedBibleReady && (
                  <p className="text-sm text-zinc-500 mt-3">
                    If a licensed version is still disabled, its specific Bible ID is still missing in `.env`.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleSearchBibleVerse} disabled={isSearchingBibleVerse} className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all disabled:opacity-60">
                  {isSearchingBibleVerse ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {isSearchingBibleVerse ? 'Searching...' : 'Search Verse'}
                </button>
                <button onClick={() => { setBibleReference(''); setBibleReferenceResult(''); setBibleVerseText(''); }} className="flex items-center justify-center gap-2 px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">
                  Clear Search
                </button>
              </div>

              {bibleReferenceResult && (
                <div className="rounded-[1.5rem] border border-emerald-200 dark:border-emerald-500/20 bg-white/80 dark:bg-black/20 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 mb-2">Search Result</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{bibleReferenceResult} ({bibleTranslation.toUpperCase()})</p>
                </div>
              )}

              <textarea
                value={bibleVerseText}
                onChange={(e) => setBibleVerseText(e.target.value)}
                placeholder="Verse result will appear here after search..."
                className="w-full min-h-40 rounded-[1.5rem] border-2 border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-black/30 p-5 outline-none text-zinc-800 dark:text-zinc-100 font-medium leading-relaxed focus:border-emerald-400 transition-all"
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleAddBibleVerseSlide} className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">
                  <PlusCircle className="w-4 h-4" /> Add Verse Slide
                </button>
                <button onClick={handleInsertBibleVerseToActiveSlide} className="flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-zinc-900 text-emerald-600 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all">
                  <LayoutPanelLeft className="w-4 h-4" /> Insert To Active Slide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

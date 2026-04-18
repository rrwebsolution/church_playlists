import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';

export type SlideTextAlign = 'left' | 'center' | 'right' | 'justify';

export interface SlideFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: SlideTextAlign;
  fontSize: number;
  fontFamily: string;
}

export interface PresentationSlide {
  id: number;
  text: string;
  html?: string;
  imageUrl?: string;
  format: SlideFormat;
}

interface ExportTemplateTheme {
  backgroundColor: string;
  textColor: string;
}

const slideSeparator = '\n\n';

const defaultFormat: SlideFormat = {
  bold: true,
  italic: false,
  underline: false,
  align: 'center',
  fontSize: 24,
  fontFamily: 'Arial Black',
};

const exportTemplateThemes: Record<string, ExportTemplateTheme> = {
  'classic-dark': { backgroundColor: '09090B', textColor: 'FFFFFF' },
  'modern-light': { backgroundColor: 'FAFAFA', textColor: '18181B' },
  'worship-blue': { backgroundColor: '172554', textColor: 'E0F2FE' },
  'sunset-gradient': { backgroundColor: '7F1D1D', textColor: 'FFF7ED' },
  'minimal-green': { backgroundColor: '022C22', textColor: 'ECFDF5' },
  'royal-purple': { backgroundColor: '4C1D95', textColor: 'FAE8FF' },
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const stripXml = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const createDefaultSlideFormat = (): SlideFormat => ({ ...defaultFormat });

export const createPresentationSlide = (overrides?: Partial<PresentationSlide>): PresentationSlide => {
  const { format, ...rest } = overrides ?? {};
  const initialText = typeof rest.text === 'string' ? rest.text : '';
  const initialHtml = typeof rest.html === 'string'
    ? rest.html
    : initialText
      ? initialText.split('\n').map((line) => `<div>${escapeXml(line)}</div>`).join('')
      : '<div></div>';

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    text: initialText,
    html: initialHtml,
    ...rest,
    format: {
      ...createDefaultSlideFormat(),
      ...(format ?? {}),
    },
  };
};

export const htmlToPlainText = (value?: string) => {
  if (!value) return '';

  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = value;
    return (container.textContent || container.innerText || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

export const plainTextToHtml = (value?: string) =>
  (value || '')
    .split('\n')
    .map((line) => `<div>${escapeXml(line)}</div>`)
    .join('') || '<div></div>';

const resolveExportTemplateTheme = (templateId?: string): ExportTemplateTheme =>
  exportTemplateThemes[templateId || ''] || exportTemplateThemes['classic-dark'];

const htmlToPptTextRuns = (
  html: string | undefined,
  format: SlideFormat,
  color: string,
) => {
  if (typeof document === 'undefined') return [];
  if (!html?.trim()) return [];

  const container = document.createElement('div');
  container.innerHTML = html;

  const runs: Array<{ text: string; options?: Record<string, unknown> }> = [];
  let pendingBreak = false;

  const pushBreak = () => {
    if (runs.length === 0) return;
    pendingBreak = true;
  };

  const pushText = (
    text: string,
    marks: { bold: boolean; italic: boolean; underline: boolean },
  ) => {
    const normalized = text.replace(/\u00A0/g, ' ');
    if (!normalized) return;

    if (pendingBreak) {
      runs.push({ text: '', options: { breakLine: true } });
      pendingBreak = false;
    }

    runs.push({
      text: normalized,
      options: {
        bold: marks.bold,
        italic: marks.italic,
        underline: marks.underline ? { color } : undefined,
        color,
        breakLine: false,
      },
    });
  };

  const walk = (
    node: Node,
    marks: { bold: boolean; italic: boolean; underline: boolean },
  ) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent || '', marks);
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const tag = node.tagName.toLowerCase();
    if (tag === 'br') {
      pushBreak();
      return;
    }

    const nextMarks = {
      bold:
        marks.bold ||
        ['b', 'strong'].includes(tag) ||
        node.style.fontWeight === 'bold' ||
        Number(node.style.fontWeight || 0) >= 600,
      italic:
        marks.italic ||
        ['i', 'em'].includes(tag) ||
        node.style.fontStyle === 'italic',
      underline:
        marks.underline ||
        tag === 'u' ||
        node.style.textDecoration.includes('underline'),
    };

    const isBlock = ['div', 'p', 'li'].includes(tag);
    if (isBlock && runs.length > 0) {
      pushBreak();
    }

    Array.from(node.childNodes).forEach((child) => walk(child, nextMarks));

    if (isBlock) {
      pushBreak();
    }
  };

  Array.from(container.childNodes).forEach((child) =>
    walk(child, {
      bold: format.bold,
      italic: format.italic,
      underline: format.underline,
    })
  );

  return runs;
};

const normalizeOutlineLine = (line: string) =>
  line
    .replace(/\t/g, ' ')
    .replace(/[•▪◦●]/g, '•')
    .replace(/\s+/g, ' ')
    .trim();

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const isSectionHeading = (line: string) =>
  /^\d+\.\s+/.test(line) || /^conclusion:?$/i.test(line);

const isSubHeading = (line: string) =>
  /:$/.test(line) || /^(Main Question|Know the Enemy|The Real Fight):?$/i.test(line);

const isScriptureLine = (line: string) =>
  /^(?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)*\s\d+:\d+(?:[-–]\d+)?(?:\s[A-Z]{2,5})?$/i.test(line) ||
  /^📖\s/.test(line);

const isQuoteLine = (line: string) =>
  /^["“].+["”]$/.test(line) || /^\(.+\)$/.test(line);

export const generateSlidesFromOutline = (rawText: string, fallbackTitle = 'Generated Presentation'): { title: string; slides: PresentationSlide[] } => {
  const normalizedBlocks = rawText
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map(normalizeOutlineLine).filter(Boolean))
    .filter((block) => block.length > 0);

  let title = fallbackTitle;
  let reference = '';
  const slides: PresentationSlide[] = [];
  let currentSection = '';

  normalizedBlocks.forEach((block) => {
    const firstLine = block[0];
    const joined = block.join('\n');

    if (/^Title:/i.test(firstLine)) {
      title = firstLine.replace(/^Title:\s*/i, '').trim() || fallbackTitle;
      return;
    }

    if (/^Text:/i.test(firstLine)) {
      reference = firstLine.replace(/^Text:\s*/i, '').trim();
      return;
    }

    if (/^Main Question:?$/i.test(firstLine)) {
      const questionBody = block.slice(1).join('\n').trim();
      slides.push(createPresentationSlide({
        text: `Main Question\n${questionBody}`,
        format: { ...createDefaultSlideFormat(), fontSize: 28, align: 'center' },
      }));
      return;
    }

    if (isSectionHeading(firstLine)) {
      currentSection = firstLine;
      slides.push(createPresentationSlide({
        text: firstLine,
        format: { ...createDefaultSlideFormat(), fontSize: 30, align: 'center' },
      }));

      if (block.length > 1) {
        const rest = block.slice(1).join('\n').trim();
        if (rest) {
          slides.push(createPresentationSlide({
            text: rest,
            format: { ...createDefaultSlideFormat(), fontSize: 24, align: 'left' },
          }));
        }
      }
      return;
    }

    if (isSubHeading(firstLine) && block.length > 1) {
      const groupedBody = block.slice(1).join('\n').trim();
      slides.push(createPresentationSlide({
        text: `${firstLine}\n${groupedBody}`,
        format: { ...createDefaultSlideFormat(), fontSize: 24, align: 'left' },
      }));
      return;
    }

    const bulletLines = block.filter((line) => /^[-•]\s*/.test(line));
    if (bulletLines.length > 0) {
      const cleanBullets = bulletLines.map((line) => line.replace(/^[-•]\s*/, '• '));
      chunkArray(cleanBullets, 3).forEach((chunk) => {
        slides.push(createPresentationSlide({
          text: currentSection
            ? `${currentSection}\n${chunk.join('\n')}`
            : chunk.join('\n'),
          format: { ...createDefaultSlideFormat(), fontSize: 22, align: 'left' },
        }));
      });
      return;
    }

    if (block.every(isScriptureLine)) {
      slides.push(createPresentationSlide({
        text: currentSection ? `${currentSection}\n${joined}` : joined,
        format: { ...createDefaultSlideFormat(), fontSize: 24, align: 'center' },
      }));
      return;
    }

    if (block.every((line) => isQuoteLine(line) || isScriptureLine(line))) {
      slides.push(createPresentationSlide({
        text: joined,
        format: { ...createDefaultSlideFormat(), fontSize: 24, align: 'center', italic: true },
      }));
      return;
    }

    slides.push(createPresentationSlide({
      text: currentSection && !joined.startsWith(currentSection)
        ? `${currentSection}\n${joined}`
        : joined,
      format: {
        ...createDefaultSlideFormat(),
        fontSize: joined.length > 180 ? 20 : 24,
        align: joined.length > 120 ? 'left' : 'center',
      },
    }));
  });

  const dedupedSlides = slides.filter((slide, index, allSlides) => {
    const normalizedText = slide.text.trim();
    return normalizedText !== '' && allSlides.findIndex((candidate) => candidate.text.trim() === normalizedText) === index;
  });

  const titleSlide = createPresentationSlide({
    text: reference ? `${title}\n${reference}` : title,
    format: { ...createDefaultSlideFormat(), fontSize: 32, align: 'center' },
  });

  return {
    title,
    slides: [titleSlide, ...dedupedSlides],
  };
};

export const slidesToSourceText = (slides: PresentationSlide[]) =>
  slides
    .map((slide) => (slide.text || htmlToPlainText(slide.html)).trim().replace(/\n[ \t]*\n/g, '\n\u200B\n'))
    .filter(Boolean)
    .join(slideSeparator);

export const serializeSlides = (slides: PresentationSlide[]) => JSON.stringify(slides);

export const deserializeSlides = (slideData?: string, sourceText?: string): PresentationSlide[] => {
  if (slideData) {
    try {
      const parsed = JSON.parse(slideData) as Array<Partial<PresentationSlide>>;
      if (Array.isArray(parsed)) {
        return parsed.map((slide, index) => createPresentationSlide({
          id: typeof slide.id === 'number' ? slide.id : Date.now() + index,
          text: typeof slide.text === 'string' ? slide.text.replace(/\u200B/g, '') : htmlToPlainText(typeof slide.html === 'string' ? slide.html : ''),
          html: typeof slide.html === 'string' ? slide.html : undefined,
          imageUrl: typeof slide.imageUrl === 'string' ? slide.imageUrl : undefined,
          format: slide.format ?? createDefaultSlideFormat(),
        }));
      }
    } catch {
      // Fallback to legacy text parsing below.
    }
  }

  if (!sourceText) return [];

  return sourceText
    .split(/\n\s*\n/)
    .filter((block) => block.trim().length > 0)
    .map((text, index) => createPresentationSlide({
      id: Date.now() + index,
      text: text.replace(/\u200B/g, ''),
    }));
};

export const parsePptxFile = async (file: File): Promise<PresentationSlide[]> => {
  const isPptx = file.name.toLowerCase().endsWith('.pptx');
  if (!isPptx) {
    throw new Error('Only .pptx files can be previewed right now.');
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideEntries = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((left, right) => {
      const leftNumber = Number(left.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const rightNumber = Number(right.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return leftNumber - rightNumber;
    });

  const slides = await Promise.all(
    slideEntries.map(async (path, index) => {
      const xml = await zip.file(path)?.async('string');
      if (!xml) {
        return createPresentationSlide({ id: Date.now() + index, text: '' });
      }

      const normalizedXml = xml
        .replace(/<a:tab\/>/g, '\t')
        .replace(/<\/a:p>/g, '\n')
        .replace(/<a:br\/>/g, '\n')
        .replace(/<a:t>([\s\S]*?)<\/a:t>/g, (_, text: string) => escapeXml(text));

      const parser = new DOMParser();
      const doc = parser.parseFromString(normalizedXml, 'application/xml');
      const textNodes = Array.from(doc.getElementsByTagNameNS('*', 't'))
        .map((node) => node.textContent?.trim() ?? '')
        .filter(Boolean);

      const fallbackText = stripXml(
        normalizedXml
          .replace(/<\/a:p>/g, '\n')
          .replace(/<a:br\/>/g, '\n')
      );

      return createPresentationSlide({
        id: Date.now() + index,
        text: textNodes.length > 0 ? textNodes.join('\n') : fallbackText,
      });
    })
  );

  return slides.filter((slide) => slide.text.trim().length > 0);
};

export const exportSlidesToPptx = async ({
  title,
  slides,
  templateId,
  author = 'Church System',
}: {
  title: string;
  slides: PresentationSlide[];
  templateId?: string;
  author?: string;
}) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = author;
  pptx.company = 'Church System';
  pptx.subject = title;
  pptx.title = title;
  pptx.theme = {
    headFontFace: 'Arial Black',
    bodyFontFace: 'Arial Black',
  };
  const exportTheme = resolveExportTemplateTheme(templateId);

  slides
    .filter((slide) => (slide.text || htmlToPlainText(slide.html)).trim().length > 0 || slide.imageUrl)
    .forEach((slideData) => {
      const slide = pptx.addSlide();
      slide.background = { color: exportTheme.backgroundColor };
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
        fill: { color: exportTheme.backgroundColor },
        line: { color: exportTheme.backgroundColor },
      });
      const exportText = (slideData.text || htmlToPlainText(slideData.html)).trim();
      const exportRuns = htmlToPptTextRuns(slideData.html, slideData.format, exportTheme.textColor);
      const hasImage = Boolean(slideData.imageUrl);

      if (hasImage && slideData.imageUrl) {
        slide.addImage({
          data: slideData.imageUrl,
          x: 0.8,
          y: 0.6,
          w: 11.7,
          h: 3.6,
        });
      }

      slide.addText(exportRuns.length > 0 ? (exportRuns as never) : exportText, {
        x: 0.6,
        y: hasImage ? 4.45 : 0.7,
        w: 12.1,
        h: hasImage ? 2.2 : 6.1,
        color: exportTheme.textColor,
        bold: slideData.format.bold,
        italic: slideData.format.italic,
        underline: slideData.format.underline ? { color: exportTheme.textColor } : undefined,
        fontFace: slideData.format.fontFamily || 'Arial Black',
        fontSize: slideData.format.fontSize,
        align: slideData.format.align,
        valign: 'middle',
        margin: 0.08,
        breakLine: false,
        fit: 'shrink',
      });
    });

  await pptx.writeFile({ fileName: `${title || 'presentation'}.pptx` });
};

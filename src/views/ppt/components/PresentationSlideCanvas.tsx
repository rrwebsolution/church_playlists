import { htmlToPlainText, plainTextToHtml, type PresentationSlide } from '@/lib/ppt';

type TemplateLook = {
  bg: string;
  text: string;
  accent: string;
  font: string;
};

type PresentationSlideCanvasProps = {
  slide?: PresentationSlide | null;
  template: TemplateLook;
  backgroundImageUrl?: string;
  className?: string;
  frameClassName?: string;
  contentClassName?: string;
  fontScale?: number;
  emptyLabel?: string;
};

export const PRESENTATION_CANVAS_CLASS = 'aspect-video relative overflow-hidden rounded-[2rem]';
export const PRESENTATION_CANVAS_FRAME_CLASS = 'absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden rounded-[inherit] border border-white/10 bg-black/10 px-6 py-6 md:px-8 md:py-8';
export const PRESENTATION_CANVAS_MEDIA_CLASS = 'mb-4 flex w-full shrink-0 basis-[42%] items-center justify-center overflow-hidden rounded-3xl';
export const PRESENTATION_CANVAS_OVERLAY_CLASS = 'absolute inset-0';

const sectionLabelPattern = /^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Tag|Ending|Instrumental)[^\]]*\]?:?$/i;

const getSlideDisplay = (slide?: PresentationSlide | null) => {
  if (!slide) return null;

  const plainText = slide.text || htmlToPlainText(slide.html);
  const lines = plainText.split('\n');
  const firstLine = lines[0]?.trim() || '';
  const headerMatch = firstLine.match(sectionLabelPattern);
  const label = headerMatch ? headerMatch[1].replace(/[\[\]:]/g, '') : null;
  const content = headerMatch && lines.length > 1 ? lines.slice(1).join('\n').trim() : plainText.trim();

  return {
    label,
    html: slide.html || plainTextToHtml(slide.text || content),
  };
};

export function PresentationSlideCanvas({
  slide,
  template,
  backgroundImageUrl,
  className = '',
  frameClassName = '',
  contentClassName = '',
  fontScale = 1,
  emptyLabel = 'End of Presentation',
}: PresentationSlideCanvasProps) {
  const display = getSlideDisplay(slide);

  return (
    <div className={`${PRESENTATION_CANVAS_CLASS} ${template.bg} ${template.text} ${template.font} ${className}`}>
      {backgroundImageUrl && (
        <img src={backgroundImageUrl} alt="Slide background" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className={`absolute inset-0 ${backgroundImageUrl ? 'bg-black/25' : 'bg-transparent'}`} />
      <div className={`${PRESENTATION_CANVAS_FRAME_CLASS} ${frameClassName}`}>
        {slide && display ? (
          <>
            {display.label && (
              <span className={`block shrink-0 mb-4 font-black uppercase tracking-[0.4em] opacity-70 ${template.accent}`}>
                {display.label}
              </span>
            )}
            {slide.imageUrl && (
              <div className={PRESENTATION_CANVAS_MEDIA_CLASS}>
                <img src={slide.imageUrl} alt="Slide visual" className="h-full w-full object-contain bg-black/30" />
              </div>
            )}
            <div
              className={`w-full min-h-0 flex-1 overflow-hidden leading-[1.1] ${contentClassName}`}
              style={{
                fontSize: `${Math.max(12, (slide.format.fontSize || 24) * fontScale)}px`,
                fontFamily: slide.format.fontFamily,
                textAlign: slide.format.align,
              }}
              dangerouslySetInnerHTML={{ __html: display.html }}
            />
          </>
        ) : (
          <span className="opacity-20 italic text-4xl uppercase tracking-widest font-black">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

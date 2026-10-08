'use client';
import { useEffect, useState } from 'react';
import { CHAPTERS_UPDATED } from '@/client/scenario-nav';
import { useUi } from '@/client/store';

/**
 * Índice discreto de capítulos (fast path). Los capítulos son dinámicos: tras cada recálculo se vuelven a
 * leer del DOM (`section[data-chapter]`). El capítulo activo se marca con `aria-current`.
 */
export interface ChapterItem {
  id: string;
  label: string;
}

const kindOf = (id: string) => (id.startsWith('reason-') ? 'reason' : id);

export function ChapterIndex({ initial, labels, title }: { initial: ChapterItem[]; labels: Record<string, string>; title: string }) {
  const [items, setItems] = useState(initial);
  const active = useUi((s) => s.activeChapter);
  const setActive = useUi((s) => s.setActiveChapter);

  useEffect(() => {
    let io: IntersectionObserver | undefined;
    const scan = () => {
      const sections = [...document.querySelectorAll<HTMLElement>('section[data-chapter]')];
      setItems(
        sections.map((s) => {
          const id = s.dataset.chapter!;
          const kind = kindOf(id);
          const heading = s.getAttribute('aria-labelledby');
          const text = kind === 'reason' && heading ? document.getElementById(heading)?.querySelector('.sr-only')?.textContent : undefined;
          return { id, label: text ?? labels[kind] ?? id };
        }),
      );
      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.chapter!);
        },
        { rootMargin: '-45% 0px -50% 0px' },
      );
      sections.forEach((s) => io!.observe(s));
    };
    scan();
    window.addEventListener(CHAPTERS_UPDATED, scan);
    return () => {
      window.removeEventListener(CHAPTERS_UPDATED, scan);
      io?.disconnect();
    };
  }, [labels, setActive]);

  return (
    <nav className="chapter-index" aria-label={title}>
      <ol>
        {items.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} aria-current={active === c.id ? 'true' : undefined}>
              <span className="mono chapter-index__n">{String(i).padStart(2, '0')}</span>
              <span className="chapter-index__label">{c.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

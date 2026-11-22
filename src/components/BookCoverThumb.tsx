import { BookOpen, PenTool } from 'lucide-react';
import { BookCategory } from '../types/inventory.ts';

interface BookCoverThumbProps {
  title: string;
  author: string;
  category: BookCategory;
  isbn: string;
  size?: 'sm' | 'lg';
}

const CATEGORY_PALETTE: Record<BookCategory, { bg: string; spine: string; text: string }> = {
  [BookCategory.FIKSI]: {
    bg: 'bg-blue-950',
    spine: 'bg-blue-800',
    text: 'text-blue-50',
  },
  [BookCategory.NON_FIKSI]: {
    bg: 'bg-slate-900',
    spine: 'bg-slate-700',
    text: 'text-slate-50',
  },
  [BookCategory.PENDIDIKAN]: {
    bg: 'bg-emerald-950',
    spine: 'bg-emerald-800',
    text: 'text-emerald-50',
  },
  [BookCategory.KOMIK]: {
    bg: 'bg-amber-950',
    spine: 'bg-amber-800',
    text: 'text-amber-50',
  },
  [BookCategory.ANAK]: {
    bg: 'bg-indigo-950',
    spine: 'bg-indigo-800',
    text: 'text-indigo-50',
  },
  [BookCategory.ALAT_TULIS]: {
    bg: 'bg-zinc-900',
    spine: 'bg-zinc-700',
    text: 'text-zinc-50',
  },
};

export function BookCoverThumb({
  title,
  author,
  category,
  isbn,
  size = 'sm',
}: BookCoverThumbProps) {
  const palette = CATEGORY_PALETTE[category] || CATEGORY_PALETTE[BookCategory.NON_FIKSI];
  const isStationery = category === BookCategory.ALAT_TULIS;

  if (size === 'sm') {
    return (
      <div
        aria-hidden="true"
        className={`relative flex h-11 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-300/60 ${palette.bg} ${palette.text}`}
      >
        <div className={`absolute inset-y-0 left-0 w-1 ${palette.spine}`} />
        {isStationery ? (
          <PenTool className="h-3.5 w-3.5 opacity-80" />
        ) : (
          <BookOpen className="h-3.5 w-3.5 opacity-80" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-44 w-32 shrink-0 flex-col justify-between overflow-hidden rounded-md border border-slate-300 p-3 shadow-xs ${palette.bg} ${palette.text}`}
    >
      <div className={`absolute inset-y-0 left-0 w-2 ${palette.spine}`} />
      <div className="pl-1.5">
        <div className="text-[10px] font-medium tracking-wide opacity-70 truncate">
          {category}
        </div>
        <div className="mt-1.5 line-clamp-4 font-display text-xs font-semibold leading-snug">
          {title}
        </div>
      </div>
      <div className="pl-1.5">
        <div className="truncate text-[10px] opacity-80">{author}</div>
        <div className="mt-1 font-mono text-[9px] opacity-60 tabular-nums">
          {isbn.slice(-6)}
        </div>
      </div>
    </div>
  );
}

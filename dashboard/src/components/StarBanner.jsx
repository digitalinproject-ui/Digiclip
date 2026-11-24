import React from 'react';
import { Heart } from 'lucide-react';

export const REPO_URL = 'https://github.com/digitalinproject-ui/Digiclip';
export const DONATE_URL = 'https://saweria.co/Digitalin';

export default function StarBanner({ message = 'Got a minute while this renders?' }) {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 hover:bg-rose-100/80 text-xs sm:text-sm text-neutral-800 transition-all shadow-2xs group"
      title="Support & Donate Digiclip Open Source Development on Saweria"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Heart size={15} className="shrink-0 text-rose-500 fill-rose-500 group-hover:scale-110 transition-transform" />
        <span className="truncate">
          {message} <strong className="text-rose-600 font-semibold group-hover:underline">Support Donate on Saweria ❤️</strong>
        </span>
      </div>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
        Saweria
      </span>
    </a>
  );
}

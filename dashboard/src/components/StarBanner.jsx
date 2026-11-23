import { Github } from 'lucide-react';

export const REPO_URL = 'https://github.com/digitalinproject-ui/Digiclip';

export default function StarBanner({ message = 'Enjoying Digiclip?' }) {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-600 hover:text-neutral-900 transition-colors shadow-sm"
    >
      <Github size={14} className="shrink-0 text-[#0000fb]" />
      <span>{message} <span className="text-[#0000fb] font-semibold">Star us on GitHub ⭐</span></span>
    </a>
  );
}

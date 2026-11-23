import { Github } from 'lucide-react';

export const REPO_URL = 'https://github.com/digitalinproject-ui/Digiclip';

export default function StarBanner({ message = 'Enjoying Digiclip?' }) {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-paper3 border border-rule text-sm text-muted hover:text-white transition-colors"
    >
      <Github size={14} className="shrink-0 text-[#0000fb]" />
      <span>{message} <span className="text-[#0000fb] font-medium">Star us on GitHub ⭐</span></span>
    </a>
  );
}

import React from 'react';
import { Sparkles, Zap, Globe, FileVideo, Subtitles, Youtube, Instagram, Shield, Github, ArrowRight, Check, ChevronDown, Monitor, Cpu, Languages, Type, Upload, Scissors, Link2, Bot } from 'lucide-react';
import { BlurReveal } from './components/ui/BlurReveal';
import SiteNav from './components/SiteNav';
import './landing.css';


// Real clips Digiclip made from Creative Commons (CC BY) sources. `video` is
// the original and the clip side by side, in sync; `vertical` is the clip on
// its own for the hero. The credit is what the licence asks for, so it stays
// next to the video that uses it.
// The eight clips Digiclip cut from that episode with default settings,
// in source order, with the score the moment picker gave each.
const EPISODE_CLIPS = [
  { n: 1, score: 88, title: 'I knew I was marrying her on our third date' },
  { n: 2, score: 82, title: 'Why we do absolutely everything together' },
  { n: 3, score: 75, title: 'She did a deep dive on my old social media' },
  { n: 4, score: 85, title: 'How we won a bidding war with a photo' },
  { n: 5, score: 72, title: 'Using our past to help others find freedom' },
  { n: 6, score: 78, title: 'The real definition of a winner' },
];

// Mounts the video only once it scrolls near the viewport, so five clip
// previews cost nothing to a visitor who never gets that far.
function LazyLoopVideo({ src, poster }) {
  const ref = React.useRef(null);
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShow(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="aspect-[9/16] w-full">
      {show ? (
        <video src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" className="w-full h-full object-cover block" />
      ) : (
        <img src={poster} alt="" loading="lazy" className="w-full h-full object-cover block" />
      )}
    </div>
  );
}

const DEMOS = [
  {
    id: 'split',
    tab: 'Two Speakers',
    video: '/demo/case-split.mp4',
    poster: '/screens/case-split.webp',
    vertical: '/demo/split-vertical.mp4',
    posterV: '/screens/split-vertical.webp',
    credit: 'Turn the Tables with Dan and Shoshana Jordan',
    creditBy: 'Heritage of Faith',
    creditUrl: 'https://www.youtube.com/watch?v=-KbQj_vboOU',
  },
  {
    id: 'talk',
    tab: 'Face Tracking',
    video: '/demo/case-talk.mp4',
    poster: '/screens/case-talk.webp',
    vertical: '/demo/talk-vertical.mp4',
    posterV: '/screens/talk-vertical.webp',
    credit: 'Mark Bush on How to Overcome Adversity',
    creditBy: 'Foundation for Economic Education',
    creditUrl: 'https://www.youtube.com/watch?v=aqFhllJJzoQ',
  },
];

const SectionHeader = ({ eyebrow, title, children }) => (
  <div className="mb-12">
    {eyebrow && (
      <BlurReveal delay={0.05} duration={0.6}>
        <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">{eyebrow}</p>
      </BlurReveal>
    )}
    <BlurReveal delay={0.12} duration={0.7} yOffset={10}>
      <h2 className="font-display font-bold text-3xl md:text-4xl text-neutral-900 tracking-tight mb-3">{title}</h2>
    </BlurReveal>
    {children && (
      <BlurReveal delay={0.2} duration={0.6} yOffset={8}>
        <p className="text-neutral-500 max-w-2xl leading-relaxed text-base font-normal">{children}</p>
      </BlurReveal>
    )}
  </div>
);

// Every feature with its real visual: screenshots of the app and clips it
// made. Rotates on its own until the visitor picks a tab.
const SHOWCASE = [
  {
    id: 'moments', tab: 'Viral Detection',
    title: 'Every Clip Scored Before You See It',
    body: 'Gemini reads the word-level transcript and scene cuts, scores each viral moment out of 100, and writes optimized titles and descriptions for every platform.',
    media: { type: 'img', src: '/screens/app-clipcard.webp', w: 1153, h: 441, alt: 'A clip in Digiclip with its viral score, titles and edit actions' },
  },
  {
    id: 'reframe', tab: 'Smart 9:16 Reframe',
    title: 'One Face, Two Speakers, Or Full Screen',
    body: 'Face tracking for single speaker, both speakers stacked for podcast interviews, and screen kept whole for tutorials. Tailored per video automatically.',
    media: { type: 'video', src: '/demo/case-split.mp4', poster: '/screens/case-split.webp', w: 960, h: 540 },
  },
  {
    id: 'captions', tab: '17 Caption Styles',
    title: 'Animated Captions Viewers Actually Read',
    body: 'Word-level animated captions burned in, featuring 17 trending styles: Hormozi, Pill, Box, Karaoke, and more. Customize styling with a single click.',
    media: { type: 'captions' },
  },
  {
    id: 'hook', tab: 'Scroll-Stopping Hooks',
    title: 'Engaging Hooks In The First 3 Seconds',
    body: 'Every clip opens with an AI-generated hook title crafted from the spoken content to maximize viewer retention and prevent scrolling.',
    media: { type: 'img', src: '/screens/app-hook.webp', w: 548, h: 587, alt: 'The hook editor with text, style, font and position' },
  },
  {
    id: 'editor', tab: 'Full Video Editor',
    title: 'Fix Anything Down To The Exact Word',
    body: 'Source and program monitors side by side with the interactive transcript: click words to set cuts, re-crop framing, and export in full resolution.',
    media: { type: 'img', src: '/screens/app-editor.webp', w: 1568, h: 652, alt: 'The Digiclip clip editor with source monitor, program monitor, transcript and segments' },
  },
  {
    id: 'autopilot', tab: 'Autopilot Sync',
    title: 'Your Channel Clipped Automatically',
    body: 'Connect your YouTube channel and every new upload automatically turns into vertical clips, scheduled to your socials.',
    media: { type: 'img', src: '/screens/autopilot-settings.webp', w: 920, h: 672, alt: 'Autopilot settings' },
  },
  {
    id: 'agents', tab: 'Claude & ChatGPT MCP',
    title: 'Clip Videos Straight From AI Chat',
    body: 'Connect Digiclip to Claude, ChatGPT, or n8n with one endpoint URL and request clips conversationally without managing complex pipelines.',
    media: { type: 'img', src: '/screens/connect-an-agent.webp', w: 684, h: 366, alt: 'Connecting Digiclip to an AI agent' },
  },
  {
    id: 'ugc', tab: 'AI UGC Video Ads',
    title: 'Product Marketing Videos With AI Actors',
    body: 'Describe your product or paste a website URL: generate scripts, lip-synced AI avatars, B-roll visuals, and captions from $0.65 per video.',
    media: { type: 'img', src: '/screens/app-ugc.webp', w: 1114, h: 612, alt: 'The UGC gallery with AI actor videos' },
  },
];

const CAPTION_STYLES = [
  ['default', 'default'], ['hormozi', 'hormozi'], ['pill', 'pill'], ['lime', 'lime box'], ['oneword', 'one word'],
];

function ShowcaseMedia({ media }) {
  if (media.type === 'video') {
    return (
      <video src={media.src} poster={media.poster} autoPlay muted loop playsInline preload="metadata"
        width={media.w} height={media.h} className="w-full h-auto block rounded-card" />
    );
  }
  if (media.type === 'captions') {
    return (
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {CAPTION_STYLES.map(([id, label]) => (
          <figure key={id} className="m-0 min-w-0">
            <video src={`/demo/caption-${id}.mp4`} poster={`/screens/caption-${id}.webp`} autoPlay muted loop playsInline
              preload="metadata" className="w-full aspect-[9/16] object-cover block rounded-card border border-rule" />
            <figcaption className="readout text-[10px] text-muted mt-2 text-center">{label}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <img src={media.src} alt={media.alt} width={media.w} height={media.h} loading="lazy"
      className="w-full h-auto block rounded-card border border-rule" />
  );
}

function FeatureShowcase() {
  const [active, setActive] = React.useState(0);
  const [auto, setAuto] = React.useState(true);
  React.useEffect(() => {
    if (!auto) return undefined;
    const t = setTimeout(() => setActive((i) => (i + 1) % SHOWCASE.length), 7000);
    return () => clearTimeout(t);
  }, [active, auto]);
  const item = SHOWCASE[active];
  return (
    <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
      <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Features">
        {SHOWCASE.map((f, i) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => { setActive(i); setAuto(false); }}
            className={`relative shrink-0 text-left rounded-card border px-4 py-3 text-sm font-medium transition-colors overflow-hidden ${i === active ? 'border-[#0000fb] text-neutral-900 bg-[#0000fb]/10' : 'border-neutral-200 text-neutral-600 hover:text-neutral-900'}`}
          >
            {f.tab}
            {i === active && auto && (
              <span key={`p-${active}`} className="showcase-progress absolute left-0 bottom-0 h-0.5 bg-[#0000fb]" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <div key={item.id} className="showcase-in min-w-0" role="tabpanel">
        <h3 className="font-display font-bold text-3xl md:text-4xl text-neutral-900 mb-3">{item.title}</h3>
        <p className="text-neutral-600 max-w-2xl mb-6 leading-relaxed">{item.body}</p>
        <ShowcaseMedia media={item.media} />
      </div>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }) => {
  const Icon = icon;
  return (
    <div className="card card-hover p-6 bg-white border border-neutral-200 rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 flex items-center justify-center mb-4">
        <Icon size={18} className="text-[#0000fb]" />
      </div>
      <h3 className="font-display font-bold text-lg text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

const StepCard = ({ number, title, description }) => (
  <div className="flex gap-5 items-start">
    <span className="font-mono text-sm font-bold text-[#0000fb] bg-[#0000fb]/10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
      {String(number).padStart(2, '0')}
    </span>
    <div>
      <h3 className="text-neutral-900 font-bold text-base mb-1">{title}</h3>
      <p className="text-neutral-600 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const ComparisonRow = ({ feature, digiclip, opusclip, kapwing }) => (
  <tr className="border-b border-rule">
    <td className="py-3 px-4 text-sm font-medium text-neutral-900">{feature}</td>
    <td className="py-3 px-4 text-center">{digiclip}</td>
    <td className="py-3 px-4 text-center">{opusclip}</td>
    <td className="py-3 px-4 text-center">{kapwing}</td>
  </tr>
);

const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <div>
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-1 py-5 text-left"
    >
      <span className="text-ink font-medium pr-4">{question}</span>
      <ChevronDown size={18} className={`text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="px-1 pb-6">
        <p className="faq-answer text-muted text-sm leading-relaxed">{answer}</p>
      </div>
    )}
  </div>
);

// Internal links to the per-platform pages. The same links, in the same order,
// are in seo/landing-fallback.js so they exist in the static HTML too.
const LINK = 'text-ink2 underline underline-offset-2 hover:text-ink transition-colors';

const WORKS_WITH = [
  ['/platforms/youtube', 'YouTube'],
  ['/platforms/twitch', 'Twitch'],
  ['/platforms/kick', 'Kick'],
  ['/platforms/tiktok', 'TikTok'],
  ['/podcast-to-shorts', 'Podcasts'],
];

const PLATFORMS = [
  {
    icon: Youtube,
    title: 'YouTube Clips',
    text: 'Paste a YouTube link and get 8 vertical clips back, Shorts for your own channel, or the whole video turned into 9:16 pieces.',
    links: [['/platforms/youtube', 'YouTube Clip Maker'], ['/platforms/youtube-shorts', 'YouTube Shorts Maker'], ['/youtube-to-shorts-converter', 'YouTube to Shorts Converter']],
  },
  {
    icon: Instagram,
    title: 'TikTok & Reels',
    text: 'The same clips, captioned and with a hook, sent to TikTok and Instagram Reels directly from the dashboard.',
    links: [['/platforms/tiktok', 'TikTok Clip Maker'], ['/platforms/instagram-reels', 'AI Reel Generator']],
  },
  {
    icon: Monitor,
    title: 'Streams & VODs',
    text: 'Hours-long Twitch and Kick VODs clipped in parts, with facecam tracked and quiet gameplay still handled.',
    links: [['/platforms/twitch', 'Twitch Clip Maker'], ['/platforms/kick', 'Kick Clip Maker'], ['/gta-5-clips', 'GTA 5 Clips'], ['/gta-6-clips', 'GTA 6 Clips'], ['/wow-forever-clips', 'WoW Forever Clips']],
  },
  {
    icon: FileVideo,
    title: 'Podcasts & Talks',
    text: 'Both podcast hosts kept in frame, sermon clipped out of a service, and speaker walking the stage tracked.',
    links: [['/podcast-to-shorts', 'Podcast Clip Maker'], ['/use-cases/sermons', 'Sermon Clip Maker'], ['/auto-reframe', 'Auto Reframe']],
  },
];

const SWITCHING = [
  ['/alternatives/opus-clip', 'vs Opus Clip'],
  ['/alternatives/klap', 'vs Klap'],
  ['/alternatives/vizard', 'vs Vizard'],
  ['/alternatives/submagic', 'vs Submagic'],
  ['/free-ai-clipping-tools-compared', 'Free Plans Compared'],
  ['/alternatives', 'All Alternatives'],
];

// A landing section anchor (#pricing, #features…), not an app route (#app,
// #/pricing, #legal…).
const NOT_SECTIONS = new Set(['app', 'landing', 'legal']);
const sectionId = (hash) => {
  const m = /^#([a-z][\w-]*)$/i.exec(hash || '');
  return m && !NOT_SECTIONS.has(m[1]) ? m[1] : null;
};

// Arriving on /#pricing (the nav's "pricing" from every static page): the
// browser jumps to the anchor in the static fallback, then React replaces the
// fallback and the jump is lost. The pricing section also renders only once
// /api/config says billing is on. So scroll once the section exists, keep it
// aligned for a moment while late content above settles, and give up after a
// few seconds or as soon as the visitor scrolls on their own.
function useScrollToHashSection() {
  React.useEffect(() => {
    const id = sectionId(window.location.hash);
    if (!id) return undefined;
    let stopped = false;
    let foundAt = 0;
    let timer;
    const start = Date.now();
    const stop = () => { stopped = true; };
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'];
    events.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    const tick = () => {
      if (stopped) return;
      const el = document.getElementById(id);
      if (el) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        if (Math.abs(el.getBoundingClientRect().top - margin) > 4) el.scrollIntoView({ block: 'start' });
        if (!foundAt) foundAt = Date.now();
        if (Date.now() - foundAt > 1500) return;
      } else if (Date.now() - start > 6000) {
        return;
      }
      timer = setTimeout(tick, 100);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, stop));
    };
  }, []);
}

// A click on a link to a section of this page (the nav's /#pricing, the
// in-page #pricing buttons) scrolls smoothly instead of jumping, and closes
// the mobile menu or the open dropdown it came from.
function useSmoothSectionLinks() {
  React.useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self')) return;
      let url;
      try { url = new URL(a.getAttribute('href'), window.location.href); } catch { return; }
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      const id = sectionId(url.hash);
      const el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (window.location.hash !== url.hash) window.history.pushState(null, '', url.hash);
      document.querySelectorAll('.osn-toggle').forEach((t) => { t.checked = false; });
      document.querySelectorAll('[data-osn-dd][open]').forEach((d) => { d.open = false; });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

export default function Landing({ onLaunchApp }) {
  useScrollToHashSection();
  useSmoothSectionLinks();
  const [openFaq, setOpenFaq] = React.useState(null);
  // Start from whatever was typed into the static paste box of the crawler
  // fallback (seo/landing-fallback.js) before this component mounted: the
  // fallback DOM is still in #root while the first render runs.
  const [heroUrl, setHeroUrl] = React.useState(() => {
    try { return document.getElementById('seo-hero-url')?.value || ''; } catch { return ''; }
  });
  const [heroDemo, setHeroDemo] = React.useState(0);
  const [cropDemo, setCropDemo] = React.useState(0);
  // Floating CTA: shown once the hero's own input has scrolled away, hidden
  // again near the end where the closing CTA takes over.
  const [stickyCta, setStickyCta] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const form = document.querySelector('.hero-input-row');
      const pastHero = form ? form.getBoundingClientRect().bottom < 0 : window.scrollY > 700;
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 1100;
      setStickyCta(pastHero && !nearEnd);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hand the pasted link to the app: MediaInput picks it up on mount, so the
  // user lands with their own video ready instead of on a pricing page.
  const handleHeroSubmit = (e) => {
    e.preventDefault();
    const url = heroUrl.trim();
    if (url) {
      try { localStorage.setItem('os_pending_url', url); } catch { /* ignore */ }
    }
    onLaunchApp();
  };

  const features = [
    {
      icon: Sparkles,
      title: "AI Viral Moment Detection",
      description: "Google Gemini 3.1 Flash-Lite scores your transcript and scene cuts to extract the top 4 viral moments automatically with zero manual scrubbing."
    },
    {
      icon: Scissors,
      title: "Smart 9:16 Vertical Cropping",
      description: "Dual-mode AI reframing with MediaPipe face tracking and YOLOv8 fallback for smooth camera movements."
    },
    {
      icon: Subtitles,
      title: "Automatic Subtitle Generation",
      description: "faster-whisper subtitles with word-level timestamps, styled and burned into your clips in 17 customizable styles."
    },
    {
      icon: Languages,
      title: "AI Voice Dubbing in 30+ Languages",
      description: "Bring your own ElevenLabs key and dub any clip into 30+ languages, preserving the original speaker's vocal timbre."
    },
    {
      icon: Type,
      title: "Hook Text Overlays",
      description: "AI-generated hook titles that capture viewers' attention in the critical first 3 seconds."
    },
    {
      icon: Zap,
      title: "AI Video Effects",
      description: "Gemini-generated FFmpeg filters for dynamic color grading, transitions, and cinematic visual enhancements."
    },
    {
      icon: Upload,
      title: "Local Video Upload",
      description: "Upload podcasts, webinars, livestreams, and vlogs at full resolution directly from your storage."
    },
    {
      icon: Shield,
      title: "100% Self-Hosted & Private",
      description: "Run Digiclip with Docker on your own machine — your source videos never leave your local infrastructure."
    },
    {
      icon: Monitor,
      title: "Free AI YouTube Studio",
      description: "Free AI thumbnail generator, 10 viral title suggestions, and auto-generated descriptions with chapter timestamps."
    },
    {
      icon: Globe,
      title: "Direct Social Publishing",
      description: "Schedule and publish directly to TikTok, Instagram Reels, and YouTube Shorts from one unified dashboard."
    },
    {
      icon: Bot,
      title: "MCP Server, API & CLI for AI Agents",
      description: "Connect Claude, ChatGPT or n8n to an always-on MCP endpoint, or run pip install digiclip to clip directly from the terminal."
    },
    {
      icon: Sparkles,
      title: "AI UGC Video Generator",
      description: "AI writes the script and generates a lip-synced avatar marketing video — from $0.65 per video."
    },
    {
      icon: FileVideo,
      title: "AI Actors & Lip-Sync",
      description: "Pick an AI actor or upload a photo for a talking-head video with precision lip-sync matching."
    }
  ];

  const steps = [
    { title: "Upload a Long-Form Video", description: "Paste any video link or drop video files — podcasts, webinars, livestreams, and interviews." },
    { title: "AI Detects the Best Viral Moments", description: "Google Gemini 3.1 Flash-Lite analyzes engagement patterns to extract 8 high-potential clips." },
    { title: "Smart Cropping to Vertical 9:16", description: "AI reframes horizontal footage to vertical with face tracking so speakers stay centered." },
    { title: "Add Subtitles, Hooks & Effects", description: "Auto-burn animated subtitles, hook text overlays, and optional multi-language AI dubbing." },
    { title: "Download or Post to Social Media", description: "Export your finished clips or post directly to TikTok, Instagram Reels, and YouTube Shorts." }
  ];

  const faqs = [
    {
      question: "Is Digiclip really free?",
      answer: "Self-hosting is 100% free under the MIT licence, with no watermark and no clip caps. Digiclip Cloud offers a free plan (your first video up to 60 minutes, then 20 minutes a month) and paid plans starting at $12/month. Self-hosted runs locally on Docker with your own free Gemini API key (1,500 free requests/day), while Cloud handles processing on high-end NVIDIA GPUs in seconds."
    },
    {
      question: "Do the clips have a watermark?",
      answer: "Only on the free Cloud plan. Clips made on the free plan of Digiclip Cloud carry a subtle watermark. Every paid plan from $12/month has zero watermark, and self-hosted Digiclip is free under MIT and never adds any watermark."
    },
    {
      question: "Do I need a credit card to start?",
      answer: "No credit card is required. You can start creating clips immediately for free without entering payment details."
    },
    {
      question: "How many clips do I get from one video?",
      answer: "Digiclip targets 8 high-impact viral clips, each 15 to 60 seconds long, perfectly laid out in a 4x2 grid for convenient review and export."
    },
    {
      question: "Can I clip someone else's YouTube video?",
      answer: "Only if you own it or have explicit rights or permissions. Digiclip asks you to confirm ownership before processing to respect copyright laws and creator guidelines."
    },
    {
      question: "What is Digiclip and how does it work?",
      answer: "Digiclip is an advanced AI video clip generator and viral shorts studio. It converts long-form podcasts, webinars, and streams into 9:16 vertical shorts using faster-whisper for transcription, PySceneDetect for cut boundaries, and Google Gemini 3.1 Flash-Lite for viral scoring."
    },
    {
      question: "How does Digiclip compare to Opus Clip?",
      answer: "Digiclip is an open source alternative to Opus Clip. Digiclip is free to self-host, provides 8 structured clips per run, includes dual-speaker stacked reframing, AI UGC avatars, and native Claude/ChatGPT MCP integrations at a fraction of the cost."
    },
    {
      question: "How do I turn a long-form video into TikTok or Reels clips?",
      answer: "Upload your video or paste a link, enter your Gemini API key if self-hosting, and click Generate. Digiclip automatically transcribes, cuts 4 viral moments, tracks speakers, and burns animated subtitles ready for social media."
    },
    {
      question: "Can Digiclip generate YouTube thumbnails and titles for free?",
      answer: "Yes. Digiclip includes a complete AI YouTube Studio that generates high-CTR thumbnails, 10 viral title suggestions, and descriptions with timestamps for free."
    },
    {
      question: "What is the AI UGC Video Generator?",
      answer: "Digiclip includes an AI UGC creator for video marketing. Provide a product URL or description and Digiclip generates viral scripts, realistic lip-synced AI avatars, and B-roll visuals ready for TikTok and Reels ads."
    },
    {
      question: "What AI does Digiclip use for viral moment detection?",
      answer: "Digiclip uses Google Gemini 3.1 Flash-Lite, analyzing narrative momentum, emotional shifts, and audience hooks to score and rank the 4 strongest clips."
    },
    {
      question: "Can Digiclip translate and dub videos into other languages?",
      answer: "Yes. With an ElevenLabs API key, Digiclip can dub your clips into 30+ languages while preserving the original speaker's vocal characteristics and generating synchronized subtitles."
    },
    {
      question: "How does the smart vertical cropping work?",
      answer: "TRACK mode follows speakers using MediaPipe face tracking with smooth tripod damping. GENERAL mode preserves wide compositions with styled blurred margins."
    },
    {
      question: "Can I automate Digiclip from Claude, ChatGPT or n8n?",
      answer: "Yes. Digiclip provides a native MCP server, REST API with webhooks, and n8n templates to let autonomous AI agents handle end-to-end video production."
    },
    {
      question: "What are the system requirements to run Digiclip?",
      answer: "Digiclip runs on any system with Docker (8GB+ RAM, multi-core CPU). GPU acceleration (CUDA) is optional but speeds up processing."
    }
  ];

  const checkIcon = <Check size={16} className="text-brass mx-auto" />;
  const checkMuted = <Check size={16} className="text-muted mx-auto" />;

  return (
    <div className="min-h-screen bg-paper text-ink2 overflow-x-clip">
      {/* Navigation: the shared site nav (seo/nav.js), same items as every page */}
      <SiteNav className="fixed top-0 w-full z-50" />

      {/* Hero — Apple HIG Clean Minimalist Hero with Precision Dot Grid */}
      <section className="hero-blueprint relative overflow-clip border-b border-rule pt-28 pb-16 px-6 lg:px-8">
        <div className="absolute inset-0 bg-dot-grid mask-radial-fade pointer-events-none" aria-hidden="true" />
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_auto] gap-12 lg:gap-16 items-center relative z-10">
          <div className="min-w-0">
            {/* Subtle Pill Eyebrow */}
            <BlurReveal delay={0.04} duration={0.6}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-xs font-medium text-neutral-600 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0000fb]"></span>
                <span>AI Video Clip Maker</span>
              </div>
            </BlurReveal>

            <BlurReveal delay={0.14} duration={0.8} yOffset={16}>
              <h1 className="hero-h1 mb-5">
                <span className="block text-neutral-900">Long Video In.</span>
                <span className="text-[#0000fb]">Viral Shorts Out.</span>
              </h1>
            </BlurReveal>

            <BlurReveal delay={0.24} duration={0.7} yOffset={10}>
              <p className="text-neutral-500 max-w-lg mb-8 leading-relaxed text-base sm:text-lg font-normal">
                Turn long videos and podcasts into viral 9:16 shorts. AI speaker tracking, auto subtitles, and instant hooks.
              </p>
            </BlurReveal>

            {/* Apple Spotlight-Style Unified Capsule Input */}
            <BlurReveal delay={0.34} duration={0.7} yOffset={10}>
              <form onSubmit={handleHeroSubmit} className="mb-4 max-w-2xl">
                <div className="p-1.5 sm:p-2 bg-white border border-neutral-200/90 rounded-2xl shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-[#0000fb]/40 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 min-w-0 flex items-center">
                    <Link2 size={18} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                    <input
                      type="url"
                      value={heroUrl}
                      onChange={(e) => setHeroUrl(e.target.value)}
                      placeholder="Paste YouTube, Twitch, or Kick URL..."
                      className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm sm:text-base text-neutral-900 placeholder-neutral-400 focus:outline-none"
                      aria-label="Video link"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none whitespace-nowrap font-semibold bg-[#0000fb] hover:bg-[#0000d6] text-white px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                    >
                      <Sparkles size={15} />
                      <span>Get Free Clips</span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={onLaunchApp}
                      className="flex-1 sm:flex-none whitespace-nowrap font-medium bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                    >
                      <Upload size={15} />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              </form>
            </BlurReveal>

            {/* Clean Apple Trust Micro-line (Zero Slop) */}
            <BlurReveal delay={0.44} duration={0.6} yOffset={8}>
              <div className="flex items-center gap-3 text-xs text-neutral-400 font-normal">
                <span>100% Free &amp; Open Source</span>
                <span>·</span>
                <span>4 Curated Clips</span>
                <span>·</span>
                <span>No Watermark</span>
              </div>
            </BlurReveal>
          </div>

          {/* Clean Apple Smartphone Preview with Floating Status Widgets */}
          <div className="relative flex justify-center items-center py-4 lg:py-0">
            <div className="device-mockup">
              <div className="device-island" />
              <div className="device-screen">
                <video
                  key={DEMOS[heroDemo].id}
                  src={DEMOS[heroDemo].vertical}
                  poster={DEMOS[heroDemo].posterV}
                  autoPlay
                  muted
                  loop={DEMOS.length === 1}
                  onEnded={() => setHeroDemo((i) => (i + 1) % DEMOS.length)}
                  playsInline
                  preload="metadata"
                />
              </div>

              {/* Minimal Single Floating Pill: Viral Score */}
              <div className="floating-badge -top-2 -right-3 sm:-right-6">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/20">
                  98
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Viral Score</div>
                  <div className="text-xs font-bold text-neutral-900">High Retention</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof: valid specifications and real capabilities */}
      <section className="border-b border-rule bg-white/50 backdrop-blur-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 md:divide-x divide-neutral-200/80 text-center">
          {[
            ['4 Clips', 'Curated per run'],
            ['9:16', 'Active face tracking'],
            ['30+', 'Dubbing languages'],
            ['100% Free', 'Open source (MIT)'],
          ].map(([n, label]) => (
            <div key={label} className="px-2 sm:px-4 flex flex-col items-center justify-center">
              <div className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-neutral-900 tabular-nums whitespace-nowrap tracking-tight">{n}</div>
              <div className="mt-1.5 text-xs font-medium text-neutral-500 whitespace-nowrap">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* By platform: one described card per source/destination, linking the
          per-platform pages. Alternating: Dot Grid Background */}
      <section id="platforms" className="py-20 px-6 relative overflow-hidden bg-[#fafafa]">
        <div className="absolute inset-0 bg-dot-grid-subtle pointer-events-none opacity-60" aria-hidden="true" />
        <div className="max-w-6xl mx-auto relative z-10">
          <SectionHeader eyebrow="Platforms" title="Made for Every Major Platform">
            One clip generator, tuned to where the video comes from and where the clips are going.
          </SectionHeader>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLATFORMS.map((p) => (
              <div key={p.title} className="card p-6 flex flex-col bg-white border border-neutral-200 rounded-2xl">
                <p.icon size={18} className="text-[#0000fb] mb-4" />
                <h3 className="font-display font-bold text-xl text-neutral-900 mb-2">{p.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-4">{p.text}</p>
                <ul className="mt-auto space-y-1.5 text-sm font-medium">
                  {p.links.map(([href, label]) => (
                    <li key={href}><a href={href} className="text-[#0000fb] hover:underline">{label} →</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm">
            <a href="/platforms" className="text-[#0000fb] font-semibold hover:underline">Every platform and its specs →</a>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 border-t border-rule">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="Features" title="AI clipping that finds the moments worth posting">
            Screens from the app and clips it made. Pick a feature, or let it play.
          </SectionHeader>
          <FeatureShowcase />
          <details className="mt-12 group">
            <summary className="list-none cursor-pointer text-sm font-semibold text-neutral-700 hover:text-[#0000fb] [&::-webkit-details-marker]:hidden">
              The full feature list <ChevronDown size={14} className="inline transition-transform group-open:rotate-180 text-[#0000fb]" />
            </summary>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {features.map((feature, i) => (
                <FeatureCard key={i} {...feature} />
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* One video in, many clips out: the real clips Digiclip cut from one
          CC BY episode with default settings, with the score the AI gave each.
          Alternating: Dot Grid Background */}
      <section className="py-20 px-6 border-b border-rule relative overflow-hidden bg-[#fafafa]">
        <div className="absolute inset-0 bg-dot-grid-subtle pointer-events-none opacity-60" aria-hidden="true" />
        <div className="max-w-6xl mx-auto relative z-10">
          <SectionHeader eyebrow="Curated Output" title="One episode in. Four viral clips out.">
            No prompts, no settings and no scrubbing: the AI scored every moment, kept the four that stand on their own and cut them with captions and a hook.
          </SectionHeader>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,15rem)_auto_minmax(0,1fr)] gap-6 items-center">
            <figure className="m-0 max-w-[16rem] lg:max-w-none">
              <div className="relative rounded-card overflow-hidden border border-rule">
                <img src="/screens/ep-source.webp" alt="The original 16:9 podcast episode" width="640" height="360" loading="lazy" className="block w-full h-auto" />
                <span className="absolute bottom-2 right-2 readout bg-paper/80 px-2 py-0.5 rounded">26:54</span>
              </div>
              <figcaption className="text-xs text-muted mt-2">the full episode, 16:9</figcaption>
            </figure>
            <ArrowRight size={28} className="text-brass mx-auto rotate-90 lg:rotate-0" aria-hidden="true" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {EPISODE_CLIPS.slice(0, 4).map((c) => (
                <figure key={c.n} className="m-0 min-w-0">
                  <div className="relative rounded-card overflow-hidden border border-neutral-200 bg-neutral-900 shadow-2xs">
                    <LazyLoopVideo src={`/demo/ep-clip-${c.n}.mp4`} poster={`/screens/ep-clip-${c.n}.webp`} />
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-black/75 backdrop-blur-md text-emerald-400 px-1.5 py-0.5 rounded">score {c.score}</span>
                  </div>
                  <figcaption className="text-xs text-neutral-800 font-medium mt-2 leading-snug">{c.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className="mt-6 text-xs text-muted">
            Source: <a href="https://www.youtube.com/watch?v=-KbQj_vboOU" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#0000fb]">Turn the Tables with Dan and Shoshana Jordan</a>, Heritage of Faith, licensed CC BY. Clipped by Digiclip, scores as the AI gave them.
          </p>
        </div>
      </section>

      {/* Smart crop — real product output: 16:9 source to 9:16 result */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeader eyebrow="Smart Reframe" title="Active speaker tracking in vertical 9:16">
            Real output, not a mock-up: the AI detects the active speaker, reframes 16:9 to vertical 9:16, and burns in synchronized captions.
          </SectionHeader>
          {DEMOS.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Example clips">
              {DEMOS.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={cropDemo === i}
                  onClick={() => setCropDemo(i)}
                  className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${cropDemo === i ? 'bg-[#0000fb] text-white border-[#0000fb]' : 'border-neutral-200 text-neutral-600 hover:text-neutral-900'}`}
                >
                  {d.tab}
                </button>
              ))}
            </div>
          )}
          <figure className="crop-frame crop-frame-16-9 w-full" aria-label="original video next to the vertical clip Digiclip made from it">
            <video
              key={DEMOS[cropDemo].id}
              src={DEMOS[cropDemo].video}
              poster={DEMOS[cropDemo].poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              width="960"
              height="540"
              className="w-full h-auto block rounded-2xl"
            />
          </figure>
          <p className="mt-6 text-xs text-muted">
            Source: <a href={DEMOS[cropDemo].creditUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#0000fb]">{DEMOS[cropDemo].credit}</a>, {DEMOS[cropDemo].creditBy}, licensed CC BY. Clipped by Digiclip.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.querySelector('.hero-input-row input')?.focus({ preventScroll: true });
              }}
              className="btn-primary whitespace-nowrap bg-[#0000fb] hover:bg-[#0000d6] text-white font-bold px-6 py-3 rounded-xl shadow-md"
            >
              Try It On Your Own Video <ArrowRight size={16} />
            </button>
            <span className="text-sm text-neutral-400 font-medium">100% free &amp; open source under MIT</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 border-t border-rule relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid-subtle mask-radial-fade opacity-70 pointer-events-none" aria-hidden="true" />
        <div className="max-w-4xl mx-auto relative z-10">
          <SectionHeader eyebrow="Workflow" title="From long video to viral clips in 5 steps">
            From long-form video to viral-ready clips in 5 automated steps.
          </SectionHeader>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <StepCard key={i} number={i + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* Two ways to use it: free self-host vs paid hosted */}
      <section className="py-20 px-6 border-t border-rule">
        <div className="max-w-4xl mx-auto">
          <SectionHeader eyebrow="Deployment" title="Run in the cloud or on your own machine">
            The same open source technology, running either in the cloud or on your local machine.
          </SectionHeader>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-8 flex flex-col border-2 border-[#0000fb] bg-white rounded-2xl shadow-sm">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Sparkles size={18} className="text-[#0000fb]" />
                <h3 className="font-display font-bold text-2xl text-neutral-900">Digiclip Web Studio</h3>
                <span className="badge-ok">Free Online Tool</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {['Instant AI processing in seconds', 'Gemini key included, zero setup required', 'Direct social media publishing to YouTube, TikTok & Reels', 'Connect Claude or ChatGPT directly via MCP URL', '100% free with no credit card required'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-700 font-medium"><Check size={14} className="text-emerald-600 shrink-0" />{f}</li>
                ))}
              </ul>
              <button onClick={onLaunchApp} className="btn-primary whitespace-nowrap bg-[#0000fb] hover:bg-[#0000d6] text-white font-bold rounded-xl py-3 w-full">
                Launch Digiclip Studio <ArrowRight size={16} />
              </button>
            </div>
            <div className="card p-8 flex flex-col bg-white border border-neutral-200 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Github size={18} className="text-neutral-700" />
                <h3 className="font-display font-bold text-2xl text-neutral-900">Self-Hosted · Docker</h3>
                <span className="readout border border-neutral-200 rounded-full px-2.5 py-1 text-xs font-semibold">Free · Open Source</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {['Runs on your machine with Docker', 'Bring your own Gemini, ElevenLabs and fal.ai keys', '100% private: videos never leave your machine', 'Free forever under MIT licence'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-700 font-medium"><Check size={14} className="text-emerald-600 shrink-0" />{f}</li>
                ))}
              </ul>
              <a href="https://github.com/digitalinproject-ui/Digiclip" target="_blank" rel="noopener noreferrer"
                className="btn-ghost whitespace-nowrap bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-semibold rounded-xl py-3 text-center">
                <Github size={16} /> View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table: Alternating Dot Grid */}
      <section id="comparison" className="py-20 px-6 border-t border-rule relative overflow-hidden bg-[#fafafa]">
        <div className="absolute inset-0 bg-dot-grid-subtle pointer-events-none opacity-60" aria-hidden="true" />
        <div className="max-w-4xl mx-auto relative z-10">
          <SectionHeader eyebrow="Comparison" title="Zero subscriptions. 100% free forever.">
            Digiclip is 100% free and open source with zero subscriptions or fees. Commercial alternatives charge $14 to $24 every month.
          </SectionHeader>
          <div className="overflow-x-auto bg-white rounded-2xl border border-neutral-200 p-2">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="py-3 px-4 text-left text-sm text-neutral-600 font-semibold">Feature</th>
                  <th className="py-3 px-4 text-center text-sm font-bold">
                    <span className="text-[#0000fb]">Digiclip</span>
                    <span className="block text-xs text-neutral-500 font-normal">100% Free Open Source</span>
                  </th>
                  <th className="py-3 px-4 text-center text-sm text-neutral-600 font-semibold">Opus Clip</th>
                  <th className="py-3 px-4 text-center text-sm text-neutral-600 font-semibold">Kapwing</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow feature="Price" digiclip={<span className="text-emerald-600 font-bold">100% Free ($0)</span>} opusclip={<span className="text-neutral-500 text-sm">$15/mo</span>} kapwing={<span className="text-neutral-500 text-sm">$24/mo</span>} />
                <ComparisonRow feature="Subscriptions / Hidden Fees" digiclip={<span className="text-emerald-600 font-bold">Zero ($0)</span>} opusclip={<span className="text-neutral-500 text-sm">Monthly plan</span>} kapwing={<span className="text-neutral-500 text-sm">Monthly plan</span>} />
                <ComparisonRow feature="Target 4 Clips Per Run" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">Varies</span>} kapwing={<span className="text-neutral-400 text-sm">Manual</span>} />
                <ComparisonRow feature="AI Viral Moment Detection" digiclip={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="Smart Vertical Cropping" digiclip={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="Auto Subtitles" digiclip={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="AI Voice Dubbing (30+ langs, your ElevenLabs key)" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">Limited</span>} kapwing={<span className="text-neutral-400 text-sm">No</span>} />
                <ComparisonRow feature="AI Video Effects" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">No</span>} kapwing={checkMuted} />
                <ComparisonRow feature="Hook Text Overlays" digiclip={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="Self-Hosted / Privacy" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">Cloud only</span>} kapwing={<span className="text-neutral-400 text-sm">Cloud only</span>} />
                <ComparisonRow feature="No Watermark" digiclip={<span className="text-emerald-600 text-sm font-semibold">100% Free (No Watermark)</span>} opusclip={<span className="text-neutral-400 text-sm">Paid tier only</span>} kapwing={<span className="text-neutral-400 text-sm">Paid only</span>} />
                <ComparisonRow feature="Open Source (MIT)" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">No</span>} kapwing={<span className="text-neutral-400 text-sm">No</span>} />
                <ComparisonRow feature="AI YouTube Thumbnail Generator" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">No</span>} kapwing={<span className="text-neutral-400 text-sm">Paid</span>} />
                <ComparisonRow feature="AI Title & Description Generator" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">Limited</span>} kapwing={<span className="text-neutral-400 text-sm">Paid</span>} />
                <ComparisonRow feature="AI UGC Video Generator" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">No</span>} kapwing={<span className="text-neutral-400 text-sm">No</span>} />
                <ComparisonRow feature="AI Actors with Lip-Sync" digiclip={checkIcon} opusclip={<span className="text-neutral-400 text-sm">No</span>} kapwing={<span className="text-neutral-400 text-sm">No</span>} />
                <ComparisonRow feature="Usage Limits" digiclip={<span className="text-emerald-600 text-sm font-semibold">Unlimited</span>} opusclip={<span className="text-neutral-400 text-sm">Per plan</span>} kapwing={<span className="text-neutral-400 text-sm">Per plan</span>} />
              </tbody>
            </table>
          </div>
          <div className="mt-10">
            <h3 className="font-display font-bold text-xl text-neutral-900 mb-4">Switching From Another Tool?</h3>
            <div className="flex flex-wrap gap-2">
              {SWITCHING.map(([href, label]) => (
                <a key={href} href={href} className="px-4 py-1.5 rounded-full border border-neutral-200 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:border-[#0000fb] transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-6 border-t border-rule">
        <div className="max-w-5xl mx-auto">
          <SectionHeader eyebrow="Built for Creators" title="Designed for modern video workflows">
            Creators, marketers, and agencies scaling short-form video production.
          </SectionHeader>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: "Content Creators",
                description: "Repurpose long-form videos into TikTok, YouTube Shorts, and Reels automatically.",
                icon: Youtube
              },
              {
                title: "Social Media Managers",
                description: "Batch-process client videos and schedule directly to social accounts from one place.",
                icon: Instagram
              },
              {
                title: "Podcasters & Educators",
                description: "Extract the most compelling nuggets and moments from long episodes and lectures.",
                icon: FileVideo
              },
              {
                title: "Businesses & Brands",
                description: "Generate viral UGC video ads with realistic AI actors from $0.65 per video.",
                icon: Sparkles
              }
            ].map((useCase, i) => (
              <div key={i} className="card p-6 bg-white border border-neutral-200 rounded-2xl">
                <useCase.icon size={20} className="text-[#0000fb] mb-4" />
                <h3 className="font-display font-bold text-lg text-neutral-900 mb-2">{useCase.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Also included: More Tools - Alternating Dot Grid */}
      <section className="py-20 px-6 border-t border-rule relative overflow-hidden bg-[#fafafa]">
        <div className="absolute inset-0 bg-dot-grid-subtle pointer-events-none opacity-60" aria-hidden="true" />
        <div className="max-w-6xl mx-auto relative z-10">
          <SectionHeader eyebrow="More Tools" title="Extra tools included in Digiclip Studio">
            Available inside the same Digiclip Studio account, with zero extra configuration.
          </SectionHeader>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card p-8 bg-white border border-neutral-200 rounded-2xl">
              <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">AI Video Ads</p>
              <Sparkles size={22} className="text-[#0000fb] mb-4" />
              <h3 className="font-display font-bold text-2xl text-neutral-900 mb-2">AI UGC Video Generator</h3>
              <p className="text-neutral-600 text-sm leading-relaxed mb-4">UGC marketing videos with AI actors for any product or business.</p>
              <ul className="space-y-1.5">
                {['Realistic AI actor generation with lip-sync', 'Dynamic B-roll + animated subtitles', 'Cost-effective from $0.65 per video'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-neutral-700 font-medium"><Check size={14} className="text-emerald-600 shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <div className="card p-8 bg-white border border-neutral-200 rounded-2xl">
              <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">YouTube Suite</p>
              <Monitor size={22} className="text-[#0000fb] mb-4" />
              <h3 className="font-display font-bold text-2xl text-neutral-900 mb-2">YouTube Studio</h3>
              <p className="text-neutral-600 text-sm leading-relaxed mb-4">Free AI YouTube toolkit: viral thumbnails, titles, and descriptions.</p>
              <ul className="space-y-1.5">
                {['AI thumbnail generator with face upload', '10 viral title suggestions with interactive refinement', 'Direct publish to YouTube'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-neutral-700 font-medium"><Check size={14} className="text-emerald-600 shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 border-t border-rule">
        <div className="max-w-3xl mx-auto">
          <SectionHeader eyebrow="FAQ" title="Frequently asked questions">
            Everything you need to know about Digiclip, from setup to production features.
          </SectionHeader>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Self-Hosting APIs Section */}
      <section id="self-hosting" className="py-20 px-6 border-t border-rule bg-white">
        <div className="max-w-5xl mx-auto">
          <SectionHeader eyebrow="Self-Hosting" title="Run on Your Own Hardware with Free APIs">
            Digiclip is 100% open source. Self-hosters bring their own API keys (all with generous free tiers):
          </SectionHeader>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="card p-6 bg-white border border-neutral-200 rounded-2xl relative shadow-2xs">
              <span className="badge-ok absolute top-4 right-4">Required</span>
              <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 flex items-center justify-center mb-4">
                <Cpu size={18} className="text-[#0000fb]" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">Google Gemini API</h3>
              <div className="mb-3"><span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free tier: 1,500 req/day</span></div>
              <p className="text-neutral-600 text-sm leading-relaxed">Powers viral moment detection, title generation, video effects, YouTube thumbnail creation, and description writing.</p>
            </div>
            <div className="card p-6 bg-white border border-neutral-200 rounded-2xl relative shadow-2xs">
              <span className="readout absolute top-4 right-4 border border-neutral-200 rounded-full px-2.5 py-0.5 text-xs font-medium">Optional</span>
              <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 flex items-center justify-center mb-4">
                <Languages size={18} className="text-[#0000fb]" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">ElevenLabs API</h3>
              <div className="mb-3"><span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free tier included</span></div>
              <p className="text-neutral-600 text-sm leading-relaxed">Enables AI voice dubbing and translation in 30+ languages, preserving the speaker's vocal tone.</p>
            </div>
            <div className="card p-6 bg-white border border-neutral-200 rounded-2xl relative shadow-2xs">
              <span className="readout absolute top-4 right-4 border border-neutral-200 rounded-full px-2.5 py-0.5 text-xs font-medium">Optional</span>
              <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 flex items-center justify-center mb-4">
                <Globe size={18} className="text-[#0000fb]" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">Upload-Post API</h3>
              <div className="mb-3"><span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free tier included</span></div>
              <p className="text-neutral-600 text-sm leading-relaxed">Enables direct publishing to YouTube, TikTok, and Instagram Reels straight from your dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section — Alternating Dot Grid */}
      <section className="py-24 sm:py-28 px-6 border-t border-rule relative overflow-hidden bg-[#fafafa]">
        <div className="absolute inset-0 bg-dot-grid mask-radial-fade pointer-events-none opacity-80" aria-hidden="true" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#0000fb]/10 text-[#0000fb] border border-[#0000fb]/20 mb-6">
            <Sparkles size={13} className="text-[#0000fb]" />
            <span>Ready to Create?</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-neutral-900 tracking-tight mb-4">
            Start Creating Viral Videos Today.
          </h2>
          <p className="text-neutral-600 mb-8 max-w-lg mx-auto leading-relaxed text-sm sm:text-base">
            100% Free &amp; Open Source · 4 clips per run · Zero subscription · Zero watermarks.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={onLaunchApp} className="btn-primary whitespace-nowrap bg-[#0000fb] hover:bg-[#0000d6] text-white font-bold px-8 py-3.5 rounded-xl shadow-md transition-all hover:scale-[1.02]">
              Launch Digiclip Studio
              <ArrowRight size={16} />
            </button>
            <a
              href="https://github.com/digitalinproject-ui/Digiclip"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost whitespace-nowrap bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-semibold px-6 py-3.5 rounded-xl transition-all"
            >
              <Github size={16} />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Floating CTA */}
      <form
        onSubmit={handleHeroSubmit}
        aria-hidden={!stickyCta}
        className={`fixed z-40 bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl flex items-center gap-2 p-2 rounded-full border border-neutral-200 bg-white/95 backdrop-blur shadow-2xl transition-all duration-300 ${stickyCta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
      >
        <Link2 size={16} className="ml-3 text-neutral-400 shrink-0 hidden sm:block" />
        <input
          type="url"
          value={heroUrl}
          onChange={(e) => setHeroUrl(e.target.value)}
          placeholder="Paste a video link (YouTube, Twitch, Kick)..."
          tabIndex={stickyCta ? 0 : -1}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400 px-2"
          aria-label="Video link"
        />
        <button type="submit" tabIndex={stickyCta ? 0 : -1} className="btn-primary whitespace-nowrap rounded-full text-sm font-bold bg-[#0000fb] hover:bg-[#0000d6] text-white px-5 py-2">
          Get Free Clips <ArrowRight size={14} />
        </button>
      </form>

      {/* Footer — Apple HIG Quiet Grounded Footer */}
      <footer className="border-t border-neutral-200 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center">
                <img src="/logo-full.png" alt="Digiclip" className="h-7 w-auto object-contain" />
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                AI Video Clip Generator &amp; Viral Shorts Studio · 100% Free &amp; Open Source
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-neutral-600">
              <a
                href="https://saweria.co/Digitalin"
                target="_blank"
                rel="noopener noreferrer"
                title="Support & Donate Digiclip Open Source Project on Saweria"
                className="text-rose-600 hover:text-rose-700 font-semibold bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 transition-colors flex items-center gap-1.5 text-xs"
              >
                ❤️ Support Donate (Saweria)
              </a>
              <a href="https://github.com/digitalinproject-ui/Digiclip" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">GitHub</a>
              <a href="#features" className="hover:text-neutral-900 transition-colors">Features</a>
              <a href="#faq" className="hover:text-neutral-900 transition-colors">FAQ</a>
              <a href="/terms" className="hover:text-neutral-900 transition-colors whitespace-nowrap">Terms</a>
              <a href="/privacy" className="hover:text-neutral-900 transition-colors whitespace-nowrap">Privacy</a>
            </div>
          </div>
          <div className="border-t border-neutral-100 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
            <p>© {new Date().getFullYear()} Digiclip. Released under the MIT License.</p>
            <p>Built for creators, streamers, and video editors.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

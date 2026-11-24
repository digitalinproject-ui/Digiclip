import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Sparkles, Youtube, Instagram, Share2, ChevronDown, Check, Activity, LayoutDashboard, Settings, Plus, History, X, Terminal, Shield, LayoutGrid, Image, Globe, RotateCcw, Calendar, AlertTriangle, KeyRound, Bot, Users, Smartphone, ExternalLink, Copy, CheckCircle2, Mail, Loader2, Download, Menu, Lock, Rocket, Layers, Search, Bell, HelpCircle, User, Play, SlidersHorizontal, MoreHorizontal, Scissors, Heart, Film } from 'lucide-react';
import BlurReveal from './components/ui/BlurReveal';
import KeyInput from './components/KeyInput';
import MediaInput from './components/MediaInput';
import McpConnectCard from './components/McpConnectCard';
import ResultCard from './components/ResultCard';
import ProcessingAnimation from './components/ProcessingAnimation';
import BatchTab from './components/BatchTab';
import { clipProgress, FREE_CLIPS_PER_VIDEO, FREE_CLIPS_QUIET, MAX_CLIPS_PER_VIDEO } from './lib/clipProgress';
// import Gallery from './components/Gallery';
import ThumbnailStudio from './components/ThumbnailStudio';
import SaaShortsTab from './components/SaaShortsTab';
import UGCGallery from './components/UGCGallery';
import ScheduleWeekModal from './components/ScheduleWeekModal';
import ClipEditor from './components/ClipEditor';
import ReframeEditor from './components/ReframeEditor';
import UsageMeter from './components/UsageMeter';
import TopUpModal from './components/TopUpModal';
import WatermarkModal, { watermarkNoticeDismissed } from './components/WatermarkModal';
import { getApiUrl } from './config';
import StarBanner from './components/StarBanner';
import PlanChoiceModal from './components/PlanChoiceModal';
import ClipTutorial from './components/ClipTutorial';
import OnboardingSurvey from './components/OnboardingSurvey';
import TrialUpgradeModal from './components/TrialUpgradeModal';
import LoginModal from './components/LoginModal';
import TrialGate from './components/TrialGate';
import AdvancedBanner from './components/AdvancedBanner';
import HistoryTab from './components/HistoryTab';
import AutopilotTab from './components/AutopilotTab';
import ProfileMenu from './components/ProfileMenu';
import Modal from './components/ui/Modal';
import { useAuth } from './contexts/AuthContext';
import { apiFetch, apiJson, QuotaError, QUOTA_WALL_EVENT, openQuotaWall } from './lib/api';
import { SOCIAL_PLATFORMS } from './lib/socialPlatforms';
import { track } from './lib/analytics';
import { readConnectReturn, stripConnectReturn } from './lib/connectReturn';
import { rememberTabAfterLogin } from './lib/tabAfterLogin';
import { JobPollError, pollFailureAction } from './lib/jobPoll';

// Enhanced "Encryption" using XOR + Base64 with a Salt
// This is better than plain Base64 but still client-side.
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "OpenShorts-Static-Salt-Change-Me";
const ENCRYPTION_PREFIX = "ENC:";

const encrypt = (text) => {
  if (!text) return '';
  try {
    const xor = text.split('').map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
    ).join('');
    return ENCRYPTION_PREFIX + btoa(xor);
  } catch (e) {
    console.error("Encryption failed", e);
    return text;
  }
};

const decrypt = (text) => {
  if (!text) return '';
  if (text.startsWith(ENCRYPTION_PREFIX)) {
    try {
      const raw = text.slice(ENCRYPTION_PREFIX.length);
      // Check if it's plain base64 or our custom XOR (simple try)
      const xor = atob(raw);
      const result = xor.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
      ).join('');
      return result;
    } catch (e) {
      // Fallback if decryption fails (might be old plain text)
      return '';
    }
  }
  // Backward compatibility: If no prefix, assume old plain text (or return empty if you want to force re-login)
  // For migration: Return text as is, so it populates the field, and next save will encrypt it.
  return text;
};

// Simple TikTok icon sine Lucide might not have it or it varies
const TikTokIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
  </svg>
);

// Cloud accounts get an auto-generated opaque id (os_<hash>) as username —
// meaningless to the user, so the selector shows connected networks instead.
const isAutoProfileId = (username) => /^os_[0-9a-f]/i.test(username || "");

/* The job a signed-out visitor started, parked until they come back signed in.
 *
 * Pressing "get free clips" without a session used to open the login modal and
 * drop the work on the floor: the magic link lands on a fresh document, so the
 * pasted URL was gone and the highest-intent step in the funnel ended in an
 * empty form. The same is true of the Google round trip.
 *
 * So the request is written down before the redirect and replayed after it.
 * localStorage rather than sessionStorage because the magic link usually opens
 * in a new tab, and a TTL because a request parked last week is not what the
 * user is doing now. File uploads cannot be serialised (a File is not JSON), so
 * those are only resumed within the same document, via the in-memory fallback. */
const PENDING_JOB_KEY = 'os_pending_job';
const PENDING_JOB_TTL_MS = 60 * 60 * 1000;
let pendingJobInMemory = null;

function stashPendingJob(data) {
  const stamp = Date.now();
  const entry = { stamp, data: { ...data, payload: typeof data?.payload === 'string' ? data.payload : null } };
  pendingJobInMemory = { stamp, data };
  try {
    localStorage.setItem(PENDING_JOB_KEY, JSON.stringify(entry));
  } catch (_) { /* private mode: the in-memory copy still covers same-document flows */ }
  return stamp;
}

function peekPendingJob() {
  try {
    const raw = localStorage.getItem(PENDING_JOB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data?.payload && Date.now() - (parsed.stamp || 0) < PENDING_JOB_TTL_MS) {
        return parsed;
      }
      localStorage.removeItem(PENDING_JOB_KEY);
    }
  } catch (_) { /* ignore */ }
  // A File cannot survive a reload; this covers a sign-in that did not reload.
  if (pendingJobInMemory && Date.now() - pendingJobInMemory.stamp < PENDING_JOB_TTL_MS) {
    return pendingJobInMemory;
  }
  return null;
}

function clearPendingJob() {
  pendingJobInMemory = null;
  try {
    localStorage.removeItem(PENDING_JOB_KEY);
  } catch (_) { /* ignore */ }
}

const _formatRetention = (seconds) => {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)} day${seconds >= 172800 ? 's' : ''}`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)} hour${seconds >= 7200 ? 's' : ''}`;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
};

// TikTok, Instagram and YouTube have their own icons above; the rest come from the shared list.
const EXTRA_NETWORKS = SOCIAL_PLATFORMS.slice(3);

const ProfileNetworkIcons = ({ profile, size = 12 }) => (
  <span className="flex items-center gap-1.5">
    <span className={profile?.connected?.includes('tiktok') ? 'text-ink' : 'text-muted opacity-40'}>
      <TikTokIcon size={size} />
    </span>
    <span className={profile?.connected?.includes('instagram') ? 'text-ink' : 'text-muted opacity-40'}>
      <Instagram size={size} />
    </span>
    <span className={profile?.connected?.includes('youtube') ? 'text-ink' : 'text-muted opacity-40'}>
      <Youtube size={size} />
    </span>
    {EXTRA_NETWORKS.map((p) => (
      <span key={p.value} className={profile?.connected?.includes(p.value) ? 'text-ink' : 'text-muted opacity-40'}>
        <p.Icon size={size} />
      </span>
    ))}
  </span>
);

const UserProfileSelector = ({ profiles, selectedUserId, onSelect, onConnect }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!profiles || profiles.length === 0) return null;

  const selectedProfile = profiles.find(p => p.username === selectedUserId) || profiles[0];
  const autoId = isAutoProfileId(selectedProfile?.username);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="social profile"
        /* Phone: avatar + chevron only. A 180px pill next to the menu button,
           the section title and the minutes meter overflowed a 360px header. */
        className="flex items-center justify-between gap-1 bg-paper2 border border-rule2 rounded-input px-2 sm:px-3 py-2 text-sm text-ink2 hover:bg-paper3 transition-colors sm:min-w-[180px]"
      >
        <span className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-paper3 border border-rule flex items-center justify-center font-mono text-micro text-brass shrink-0">
            {autoId ? "S" : (selectedProfile?.username?.substring(0, 1).toUpperCase() || "U")}
          </div>
          {autoId ? (
            <span className="hidden sm:flex"><ProfileNetworkIcons profile={selectedProfile} size={13} /></span>
          ) : (
            <span className="hidden sm:block font-medium text-ink truncate max-w-[100px]">{selectedProfile?.username || "Select User"}</span>
          )}
        </span>
        <ChevronDown size={14} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 card overflow-hidden">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {profiles.map((profile) => (
              <button
                key={profile.username}
                onClick={() => {
                  onSelect(profile.username);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-paper3 transition-colors text-left group border-b border-rule last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-paper3 flex items-center justify-center font-mono text-micro text-ink border border-rule shrink-0">
                    {isAutoProfileId(profile.username) ? "S" : profile.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink2 group-hover:text-ink transition-colors truncate">
                      {isAutoProfileId(profile.username)
                        ? `Social profile ${profiles.indexOf(profile) + 1}`
                        : profile.username}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      {/* Status indicators */}
                      <div className={`flex items-center gap-1 ${profile.connected.includes('tiktok') ? 'text-ink2' : 'text-muted opacity-40'}`}>
                        <TikTokIcon size={10} />
                      </div>
                      <div className={`flex items-center gap-1 ${profile.connected.includes('instagram') ? 'text-ink2' : 'text-muted opacity-40'}`}>
                        <Instagram size={10} />
                      </div>
                      <div className={`flex items-center gap-1 ${profile.connected.includes('youtube') ? 'text-ink2' : 'text-muted opacity-40'}`}>
                        <Youtube size={10} />
                      </div>
                      {EXTRA_NETWORKS.map((p) => (
                        <div key={p.value} className={`flex items-center gap-1 ${profile.connected.includes(p.value) ? 'text-ink2' : 'text-muted opacity-40'}`}>
                          <p.Icon size={10} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {selectedUserId === profile.username && <Check size={14} className="text-brass shrink-0" />}
              </button>
            ))}
          </div>
          {/* For managed users this dropdown otherwise does nothing (one profile,
              nothing to switch) — its real job is being the door to connecting
              the greyed-out networks it displays. */}
          {onConnect && (
            <button
              onClick={() => { setIsOpen(false); onConnect(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-brass hover:bg-paper3 transition-colors text-left border-t border-rule"
            >
              <Share2 size={14} /> Connect / manage accounts
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const SESSION_KEY = 'openshorts_session';

// The server's own explanation for a rejected/failed job, readable: FastAPI
// answers {"detail": "..."} or {"detail": {"message": ...}}. Showing the raw
// JSON (or a generic "failed") hid actionable reasons such as "this video is
// only 30s long", and new users in the tutorial saw only "That run failed".
const readableError = (raw) => {
  const text = String(raw || '').trim();
  try {
    const body = JSON.parse(text);
    const d = body?.detail ?? body;
    if (typeof d === 'string' && d) return d.slice(0, 300);
    if (d && typeof d.message === 'string') return d.message.slice(0, 300);
  } catch (_) { /* not JSON */ }
  return text.replace(/^Error:\s*/, '').slice(0, 300) || 'Something went wrong.';
};
// Matches the self-host JOB_RETENTION_SECONDS default. A restore whose job was
// already purged server-side (Cloud keeps it 1 h) gets a 404 from the status
// poll, which clears the saved session (see lib/jobPoll.js).
const SESSION_MAX_AGE = 86400000; // 24 hours

const pollJob = async (jobId) => {
  const res = await apiFetch(`/api/status/${jobId}`);
  if (!res.ok) throw new JobPollError(res.status);
  return res.json();
};

function App() {
  // Cloud auth/billing session (inert when billing is disabled).
  const { billingEnabled, isManaged, isSignedIn, me, plan, refreshMe, _jobRetentionSeconds, localLlm, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  // Free plan: "want the watermark off?" once per job, when the clips land.
  const [showWmNotice, setShowWmNotice] = useState(false);
  const wmNoticedJobRef = useRef(null);
  const [showPlanChoice, setShowPlanChoice] = useState(false);
  const [tutorialPhase, setTutorialPhase] = useState(null); // null | intro | coach | celebrate
  const [showTrialUpgrade, setShowTrialUpgrade] = useState(false);
  const [topUpInfo, setTopUpInfo] = useState({});
  // {processed_minutes, total_minutes} when the running/finished job clips
  // only the first part of the source (the quota wall's free offer).
  const [partialJob, setPartialJob] = useState(null);
  // The free plan's first video, clipped whole past the 20-minute balance.
  const [_firstVideoJob, setFirstVideoJob] = useState(false);
  // {position, ahead, eta_seconds} while the job waits in line, else null.
  const [queueInfo, setQueueInfo] = useState(null);
  // A free video far back in a saturated queue: the server says later
  // arrivals can still pass it (eta_is_minimum) and its minimum wait is long.
  // The first seconds of a new video are never this (it enters at the front
  // of a lane that serves its newest first), so nobody is told "hours" for a
  // video that starts in ten minutes.
  const queueSlow = Boolean(billingEnabled && queueInfo && queueInfo.eta_is_minimum
    && queueInfo.ahead > 0 && queueInfo.eta_seconds >= 20 * 60
    && !['starter', 'creator', 'pro'].includes(plan));
  const queueSlowSeenRef = useRef(false);
  useEffect(() => {
    if (!queueInfo) { queueSlowSeenRef.current = false; return; }
    if (queueSlow && !queueSlowSeenRef.current) {
      queueSlowSeenRef.current = true;
      track('QueueSlowSeen', { props: { position: String(queueInfo.position) } });
    }
  }, [queueSlow, queueInfo]);
  // Why the last job could not start or failed, in plain words (or '').
  const [jobError, setJobError] = useState('');
  // Durable R2 URLs (per clip index) for the current job — used as a fallback when
  // the ephemeral local /videos/ files have been cleaned up (e.g. after a reload).
  const [durableClips, setDurableClips] = useState({});

  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_key') || '');
  // Social API State - Load encrypted or plain
  const [uploadPostKey, setUploadPostKey] = useState(() => {
    const stored = localStorage.getItem('uploadPostKey_v3');
    if (stored) return decrypt(stored);
    return '';
  });
  // ElevenLabs API State - Load encrypted
  const [elevenLabsKey, setElevenLabsKey] = useState(() => {
    const stored = localStorage.getItem('elevenLabsKey_v1');
    if (stored) return decrypt(stored);
    return '';
  });

  // fal.ai API State - Load encrypted
  const [falKey, setFalKey] = useState(() => {
    const stored = localStorage.getItem('falKey_v1');
    if (stored) return decrypt(stored);
    return '';
  });

  const [uploadUserId, setUploadUserId] = useState(() => localStorage.getItem('uploadUserId') || '');
  const [userProfiles, setUserProfiles] = useState([]); // List of {username, connected: []}
  // Post-generation social nudge: shown at the results peak until the user
  // either connects a network or dismisses it. Only 2.7% of cloud users who
  // reach the social flow ever connect an account — this is the moment (clips
  // just appeared) with the best odds of moving that number.
  const [socialNudgeDismissed, _setSocialNudgeDismissed] = useState(() => {
    try { return localStorage.getItem('os_social_nudge_dismissed') === '1'; } catch (_) { return false; }
  });
  // Autopilot nudge, same results peak, ahead of the social one: the sign-up
  // survey's "autopilot" goal pays about twice the "clips" one, and 95% of
  // users never come back a second day; Autopilot is the one feature that
  // works without them coming back. Gone once clicked or dismissed.
  const [autopilotNudgeDismissed, setAutopilotNudgeDismissed] = useState(() => {
    try { return localStorage.getItem('os_autopilot_nudge_dismissed') === '1'; } catch (_) { return false; }
  });
  const [autopilotOn, setAutopilotOn] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, complete, error
  const [results, setResults] = useState(null);
  // Best clips first. The backend hands them back in transcript order, which
  // buries the strongest one wherever it happens to fall in the video — and
  // the first card is the one people actually watch and publish.
  //
  // The ORIGINAL array position travels with each clip and is what gets passed
  // down as `index`: it is the clip's identity everywhere else (clip_index on
  // /api/subtitle, /api/edit and publishing, the clip-N.mp4 download name, the
  // saved per-clip project state). Sorting the array itself would silently
  // repoint all of that at the wrong clip.
  const rankedClips = useMemo(() => {
    const clips = results?.clips;
    if (!Array.isArray(clips)) return [];
    return clips
      .map((clip, index) => ({ clip, index }))
      .sort((a, b) => {
        const sa = Number.isFinite(a.clip?.predicted_score) ? a.clip.predicted_score : -1;
        const sb = Number.isFinite(b.clip?.predicted_score) ? b.clip.predicted_score : -1;
        // Ties (and clips with no score at all) keep transcript order.
        return sb - sa || a.index - b.index;
      });
  }, [results]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [_sortOption, _setSortOption] = useState('newest');

  const displayClips = useMemo(() => {
    let list = rankedClips;
    if (filterStatus === 'failed') return [];
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(({ clip }) =>
        (clip?.video_title_for_youtube_short || '').toLowerCase().includes(q) ||
        (clip?.why || '').toLowerCase().includes(q) ||
        (clip?.video_description_for_tiktok || '').toLowerCase().includes(q) ||
        (clip?.video_description_for_instagram || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [rankedClips, filterStatus, searchQuery]);
  // Bulk subtitles: apply one style to every clip of the job (triggered from
  // within a clip's subtitle modal via "apply to all").
  const [bulkSub, setBulkSub] = useState({ running: false, current: 0, total: 0, errors: 0 });
  const [downloadingAll, setDownloadingAll] = useState(false);
  // Pre-flight quality gate: { info: {max_height, min_height, cookies_invalid}, data }
  const [qualityGate, setQualityGate] = useState(null);
  const [logs, setLogs] = useState([]);
  // When each server log line arrived (epoch s, parallel to logs), from /api/status.
  const [logTimes, setLogTimes] = useState([]);
  // Clips picked and finished so far, read from the running job's log, so the
  // results panel can say "3/5" instead of an open-ended wait.
  const progress = useMemo(() => clipProgress(logs), [logs]);
  const _clipsMaking = status === 'processing' && progress.total > 0;
  // Collapsed on phones: the log tail is the least useful thing on a 360px
  // screen and it was pushing the actual clips a full scroll down.
  const [logsVisible, setLogsVisible] = useState(() => {
    try { return window.innerWidth >= 768; } catch { return true; }
  });
  const [processingMedia, setProcessingMedia] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, settings
  // Mobile only: the full nav lives in a drawer behind the header's menu button.
  const [navOpen, setNavOpen] = useState(false);
  // Reopened-project state (paid mode): per-clip {index, server_file, active_layers}
  // restored from the backend so ResultCards resume editing where they left off.
  const [projectState, setProjectState] = useState(null);
  // True when the current job was reopened from the library: its source video
  // was never persisted, so the session must not fall back to /api/source.
  const [noSource, setNoSource] = useState(false);

  const [sessionRecovered, setSessionRecovered] = useState(false);
  // The job a restored session was polling is no longer on the server.
  const [jobGone, setJobGone] = useState(false);
  const [showScheduleWeek, setShowScheduleWeek] = useState(false);
  // Clip editor overlay: index of the clip being edited, or null.
  const [editingClip, setEditingClip] = useState(null);
  const [reframingClip, setReframingClip] = useState(null);

  // Silent-success "saved" states for the settings key inputs (design.md: no alert popups)
  const [elevenLabsSaved, setElevenLabsSaved] = useState(false);
  const [falSaved, setFalSaved] = useState(false);

  // Sync state for original video playback
  const [syncedTime, setSyncedTime] = useState(0);
  const [isSyncedPlaying, setIsSyncedPlaying] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);

  const handleClipPlay = (startTime) => {
    // Clip times are relative to the processed stretch; the preview plays the
    // whole source, so a picked range shifts them by its start.
    setSyncedTime(startTime + (Number(partialJob?.start_seconds) || 0));
    setIsSyncedPlaying(true);
    setSyncTrigger(prev => prev + 1);
  };

  const handleClipPause = () => {
    setIsSyncedPlaying(false);
  };

  // --- Project persistence (paid mode) ---
  // Debounced sync of each clip's browser-only edit state (Remotion layers +
  // current server file) to the backend, so a reopened project resumes intact.
  const clipStateSync = useRef({ jobId: null, pending: {}, files: {}, timer: null });
  // Read by in-flight async chases to notice that the user moved on to another job.
  const jobIdRef = useRef(jobId);
  useEffect(() => { jobIdRef.current = jobId; }, [jobId]);

  const flushClipState = () => {
    const s = clipStateSync.current;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    const entries = Object.entries(s.pending);
    if (!s.jobId || entries.length === 0) return;
    const clips = entries.map(([i, v]) => ({
      index: Number(i),
      active_layers: v.activeLayers,
      server_file: v.serverVideoFile,
    }));
    s.pending = {};
    apiFetch(`/api/projects/${s.jobId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clips }),
    }).catch(() => {});
  };

  // One /api/history read, reduced to this job's clips.
  const fetchDurableMap = async () => {
    const d = await apiJson('/api/history');
    const map = {};
    for (const v of (d.videos || [])) {
      if (v.job_id === jobId && v.clip_index != null) map[v.clip_index] = { url: v.view_url, filename: v.filename };
    }
    return map;
  };

  // A server-side edit rewrites the clip's file while the R2 re-archive behind it
  // is still in flight (_archive_clip_edit_bg is fire-and-forget), so the durable
  // map goes stale and the card falls back to streaming from the API. Re-read the
  // map on a backoff until the archived name matches the clip's new file, then it
  // can play from R2 again. Gives up quietly: staying on /videos is correct, just
  // slower, and is exactly what happens for self-hosted users all the time.
  // opts.source / opts.highlight: which surface opened it (CheckoutStarted
  // source) and which plan the modal puts forward (WatermarkModal: starter).
  // opts.partialJob: the trimmed job on screen, so the modal sells the rest of it.
  const openUpsell = (opts = {}) => {
    setTopUpInfo({ context: 'upsell', source: opts.source, highlight: opts.highlight,
                   partialJob: opts.partialJob || null });
    setShowTopUp(true);
  };

  // Out-of-minutes errors from the thumbnail studio, clip editor and autopilot
  // (lib/api.openQuotaWall) open the same wall as the main clip flow.
  const meStatus = me?.status;
  useEffect(() => {
    if (!isManaged) return undefined;
    const onWall = (ev) => {
      refreshMe();
      if (meStatus === 'trialing') { setShowTrialUpgrade(true); return; }
      const d = ev.detail || {};
      if (d.code === 'connect_requires_plan') {
        // Connecting socials is paid: the plans modal sells posting.
        setTopUpInfo({ context: 'connect_wall', source: d.source || 'connect_wall', highlight: 'starter' });
      } else if (d.code === 'post_requires_plan') {
        // The free posts are used: the plans modal sells posting, not minutes.
        setTopUpInfo({ context: 'post_wall', source: d.source || 'post_wall', highlight: 'starter' });
      } else {
        setTopUpInfo({ context: 'wall', required: d.required, remaining: d.remaining, source: d.source });
      }
      setShowTopUp(true);
    };
    window.addEventListener(QUOTA_WALL_EVENT, onWall);
    return () => window.removeEventListener(QUOTA_WALL_EVENT, onWall);
  }, [isManaged, meStatus, refreshMe]);

  // The clips just landed on a free account: ask once, per job, whether they
  // want the mark off. A beat after the grid renders, so the first thing they
  // see is their clips and not a modal over them.
  useEffect(() => {
    if (status !== 'complete' || plan !== 'free' || !isManaged || !jobId) return;
    if (!(results?.clips?.length > 0)) return;
    // Not on top of the tutorial's celebrate step: it shows once that closes.
    if (tutorialPhase === 'coach' || tutorialPhase === 'celebrate') return;
    if (wmNoticedJobRef.current === jobId || watermarkNoticeDismissed(jobId)) return;
    wmNoticedJobRef.current = jobId;
    const t = setTimeout(() => { if (jobIdRef.current === jobId) setShowWmNotice(true); }, 2500);
    return () => clearTimeout(t);
  }, [status, plan, isManaged, jobId, results?.clips?.length, tutorialPhase]);

  // Paying re-points the clips already on screen at their clean twins (the API
  // does it from the Stripe webhook, a few seconds after the plan flips). Chase
  // the job result until no served file carries the wm_ prefix, then refresh
  // the durable map so the players switch to the clean R2 copies too.
  useEffect(() => {
    if (!isManaged || !jobId || !plan || plan === 'free') return;
    const isMarked = (c) => /\/wm_[^/]*$/.test(c?.video_url || '');
    if (!(results?.clips || []).some(isMarked)) return;
    let cancelled = false;
    (async () => {
      for (const delay of [1500, 3000, 6000, 12000, 20000]) {
        await new Promise((r) => setTimeout(r, delay));
        if (cancelled || jobIdRef.current !== jobId) return;
        let data;
        try { data = await pollJob(jobId); } catch { continue; }
        if (cancelled || jobIdRef.current !== jobId) return;
        if (data?.result) setResults(data.result);
        if (!(data?.result?.clips || []).some(isMarked)) {
          fetchDurableMap().then((m) => { if (!cancelled) setDurableClips(m); }).catch(() => {});
          return;
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, isManaged, jobId]);

  const chaseDurableFile = async (index, expectedFile) => {
    const forJob = jobId;
    for (const delay of [2500, 6000, 15000, 30000]) {
      await new Promise((r) => setTimeout(r, delay));
      if (jobIdRef.current !== forJob) return;
      let map;
      try { map = await fetchDurableMap(); } catch { return; }
      // A new job started mid-chase: this map describes the old one, so dropping
      // it here keeps it from overwriting the new job's URLs.
      if (jobIdRef.current !== forJob) return;
      setDurableClips(map);
      if (map[index]?.filename === expectedFile) return;
    }
  };

  const handleClipStateChange = (index, state) => {
    if (!isManaged || !jobId) return;
    const s = clipStateSync.current;
    if (s.jobId !== jobId) { s.pending = {}; s.files = {}; s.jobId = jobId; }
    s.pending[index] = state;
    // Cards report on mount too, so only an actual change of server file means an
    // edit just landed. The first report per clip is the mount, never a chase.
    const files = s.files || (s.files = {});
    const file = state?.serverVideoFile;
    if (file && files[index] !== file) {
      const isMount = files[index] === undefined;
      files[index] = file;
      if (!isMount) chaseDurableFile(index, file);
    }
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(flushClipState, 2000);
  };

  // A recut replaced the clip's server file with a fresh render (burned layers
  // reset), so update the results, the reopened-project state and the synced
  // per-clip edit state, and let the ResultCard remount from the new file.
  const handleClipRerendered = (index, data) => {
    const newFile = (data.new_video_url || '').split('/').pop();
    setResults((prev) => {
      if (!prev?.clips?.[index]) return prev;
      const clips = prev.clips.slice();
      clips[index] = {
        ...clips[index],
        video_url: data.new_video_url,
        start: data.start,
        end: data.end,
        recipe: data.recipe,
        mode: data.mode ?? clips[index].mode,
      };
      return { ...prev, clips };
    });
    setProjectState((prev) => {
      if (!prev?.clips) return prev;
      return {
        ...prev,
        clips: prev.clips.map((c) => (c.index === index
          ? { ...c, server_file: newFile, active_layers: null }
          : c)),
      };
    });
    // The old durable R2 object is deleted when the recut is archived, so the
    // stale URL would 404 as a fallback; drop it until the next refresh.
    setDurableClips((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    handleClipStateChange(index, { activeLayers: null, serverVideoFile: newFile });
  };

  // Whether a job's source video can still be played (a paid job's is kept in
  // storage for a while; older ones and the free plan's are gone). Asked of a
  // player of its own: playing it is the only honest test, and a missing
  // source must leave the panel as it was, not a dead player.
  const sourcePlayable = async (id) => {
    try {
      const res = await apiFetch(`/api/source-url/${id}`);
      if (!res.ok) return false;
      const { url } = await res.json();
      if (!url) return false;
      return await new Promise((resolve) => {
        const probe = document.createElement('video');
        let settled = false;
        const done = (ok) => {
          if (settled) return;
          settled = true;
          probe.removeAttribute('src');
          probe.load();
          resolve(ok);
        };
        probe.preload = 'metadata';
        probe.muted = true;
        probe.onloadedmetadata = () => done(true);
        probe.onerror = () => done(false);
        setTimeout(() => done(false), 15000);
        probe.src = getApiUrl(url);
      });
    } catch {
      return false;
    }
  };

  // Reopen an archived project from the History tab: the backend re-downloads
  // its files from R2 into the server's working dir and returns the full state.
  const restoreProject = async (projectJobId) => {
    const data = await apiJson(`/api/projects/${projectJobId}/restore`, { method: 'POST' });
    flushClipState();
    setProjectState(data.project_state || null);
    setNoSource(true);
    setJobId(data.job_id);
    setResults(data.result || null);
    setLogs(['♻️ Project restored from your library.']);
    setLogTimes([Date.now() / 1000]);
    setProcessingMedia(null);
    setQualityGate(null);
    setStatus('complete');
    setActiveTab('dashboard');
    // The long video comes back next to the clips when it is still there, so
    // a clip can be checked against it before lengthening or trimming it.
    sourcePlayable(data.job_id).then((ok) => {
      if (!ok || jobIdRef.current !== data.job_id) return;
      setNoSource(false);
      setProcessingMedia({ type: 'server', payload: `/api/source/${data.job_id}` });
    });
  };

  // Apply one subtitle style to every clip of the job, sequentially.
  const handleBulkSubtitles = async (options) => {
    const clips = results?.clips || [];
    const total = clips.length;
    if (!total) return;
    setBulkSub({ running: true, current: 0, total, errors: 0 });
    let errors = 0;
    for (let i = 0; i < total; i++) {
      setBulkSub({ running: true, current: i + 1, total, errors });
      try {
        const res = await apiFetch('/api/subtitle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: jobId,
            clip_index: i,
            position: options.position,
            font_size: options.fontSize,
            font_name: options.fontName,
            font_color: options.fontColor,
            border_color: options.borderColor,
            border_width: options.borderWidth,
            bg_color: options.bgColor,
            bg_opacity: options.bgOpacity,
            style: options.style || 'pill',
            highlight_color: options.highlightColor || '#FFD700',
            effect: options.effect || 'none',
            base_opacity: options.baseOpacity ?? 1.0,
            uppercase: options.uppercase || false,
            reveal: options.reveal || false,
            shadow: options.shadow || 0,
            max_chars: options.maxChars ?? null,
            max_duration: options.maxDuration ?? null,
            // Chain from the clip's current server file (its video_url basename).
            input_filename: (clips[i].video_url || '').split('/').pop(),
          }),
        });
        if (!res.ok) errors++;
      } catch {
        errors++;
      }
    }
    setBulkSub({ running: false, current: total, total, errors });
    refreshMe();
    // Refresh results so each ResultCard picks up its new subtitled video_url.
    try {
      const data = await pollJob(jobId);
      if (data.result) setResults(data.result);
    } catch { /* keep current results */ }
  };

  const handleDownloadAll = async () => {
    if (!jobId) return;
    setDownloadingAll(true);
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/download-all`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openshorts_clips_${(jobId || '').slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Download failed: ${e.message}`);
    } finally {
      setDownloadingAll(false);
    }
  };

  // Session Recovery: Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const session = JSON.parse(saved);
      if (Date.now() - session.timestamp > SESSION_MAX_AGE) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      if (session.jobId && session.status && session.status !== 'idle') {
        setJobId(session.jobId);
        setResults(session.results || null);
        // Restore the source preview. Older sessions (or uploads) saved no
        // media, so fall back to the backend-served source for this job —
        // except for reopened projects, whose source was never persisted.
        if (session.processingMedia) setProcessingMedia(session.processingMedia);
        else if (!session.noSource) setProcessingMedia({ type: 'server', payload: `/api/source/${session.jobId}` });
        if (session.noSource) setNoSource(true);
        if (session.projectState) setProjectState(session.projectState);
        if (session.activeTab) setActiveTab(session.activeTab);
        // If was processing, resume polling; if complete/error, just show results
        setStatus(session.status === 'processing' ? 'processing' : session.status);
        setSessionRecovered(true);
        setTimeout(() => setSessionRecovered(false), 5000);
      }
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // Session Recovery: Save state changes
  useEffect(() => {
    if (status === 'idle') {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    try {
      // URL (YouTube) media serializes as-is. Uploaded 'file' media is a blob
      // that can't be persisted, so point the recovered preview at the source
      // served by the backend instead of dropping it.
      let persistMedia = null;
      if (processingMedia?.type === 'url') persistMedia = processingMedia;
      else if (processingMedia && jobId) persistMedia = { type: 'server', payload: `/api/source/${jobId}` };
      const sessionData = {
        jobId,
        status,
        results,
        processingMedia: persistMedia,
        activeTab,
        noSource,
        projectState,
        timestamp: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (e) {
      // localStorage full or serialization error - ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, status, results, activeTab, noSource, projectState]);

  useEffect(() => {
    // Encrypt Gemini Key too for consistency if desired, but user asked specifically about Social integration not saving well.
    // For now keeping gemini plain for compatibility unless requested.
    if (apiKey) localStorage.setItem('gemini_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (uploadPostKey) {
      localStorage.setItem('uploadPostKey_v3', encrypt(uploadPostKey));
    }
    if (uploadUserId) {
      localStorage.setItem('uploadUserId', uploadUserId);
    }
  }, [uploadPostKey, uploadUserId]);

  useEffect(() => {
    if (elevenLabsKey) {
      localStorage.setItem('elevenLabsKey_v1', encrypt(elevenLabsKey));
    }
  }, [elevenLabsKey]);

  useEffect(() => {
    if (falKey) {
      localStorage.setItem('falKey_v1', encrypt(falKey));
    }
  }, [falKey]);

  useEffect(() => {
    if ((uploadPostKey || isManaged) && userProfiles.length === 0) {
      fetchUserProfiles({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadPostKey, isManaged]);

  // For managed users, fetch the durable R2 URLs of the current job's clips. The
  // preview player prefers them (free egress, edge-served, and not competing with
  // the renders for the API process), and falls back to /videos when the local
  // file is newer than the archived one or the signed link fails.
  // Kept fresh by chaseDurableFile after each edit and by the completion chase
  // below; until either lands, the card just streams from /videos.
  useEffect(() => {
    if (!isManaged || !jobId || !(results?.clips?.length)) { setDurableClips({}); return; }
    let cancelled = false;
    fetchDurableMap()
      .then((map) => { if (!cancelled) setDurableClips(map); })
      .catch(() => {});
    return () => { cancelled = true; };
    // Keyed on the clip COUNT, not on results: the status poll hands back a new
    // results object every couple of seconds while the job runs, and this used to
    // re-read the history on every one of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManaged, jobId, results?.clips?.length]);

  // A job is marked complete BEFORE _archive_managed_job has finished uploading
  // (app.py:878), so the read above can land while R2 still has nothing for it and
  // every card would stream from the API for the rest of the session. Chase until
  // all clips have a durable copy.
  useEffect(() => {
    const count = results?.clips?.length || 0;
    if (!isManaged || !jobId || status !== 'complete' || !count) return;
    let cancelled = false;
    (async () => {
      for (const delay of [0, 3000, 8000, 20000, 40000]) {
        if (delay) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        let map;
        try { map = await fetchDurableMap(); } catch { return; }
        if (cancelled) return;
        setDurableClips(map);
        if (Object.keys(map).length >= count) return;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManaged, jobId, status, results?.clips?.length]);

  // Read at failure time: the poll effect must not restart when auth settles.
  const historyAvailableRef = useRef(false);
  historyAvailableRef.current = billingEnabled && isSignedIn;
  const handleResetRef = useRef(null);

  useEffect(() => {
    let timer;
    let stopped = false;
    let failures = 0;
    // One poll at a time (the next is scheduled when this one answers, so a
    // slow server never gets a pile of them), and at the pace the job needs:
    // every 2 s while it renders, 5 s while it waits in the queue, 15 s in a
    // tab nobody is looking at.
    let nextDelay = 2000;
    let inFlight = false;
    const stop = () => { stopped = true; clearTimeout(timer); };
    const schedule = () => {
      if (stopped) return;
      const delay = (typeof document !== 'undefined' && document.hidden) ? 15000 : nextDelay;
      timer = setTimeout(tick, delay);
    };
    const onVisible = () => {
      if (!stopped && !inFlight && typeof document !== 'undefined' && !document.hidden) {
        clearTimeout(timer);
        timer = setTimeout(tick, 0);
      }
    };
    const tick = async () => {
        if (stopped || inFlight) return;
        inFlight = true;
        try {
          const data = await pollJob(jobId);
          failures = 0;
          console.log("Job status:", data);

          // Update results if available (real-time)
          if (data.result) {
            setResults(data.result);
          }

          if (data.partial) setPartialJob(data.partial);
          setQueueInfo(data.status === 'queued' && data.queue ? data.queue : null);
          nextDelay = data.status === 'queued' ? 5000 : 2000;

          if (data.status === 'completed') {
            setQueueInfo(null);
            setStatus('complete');
            stop();
            refreshMe();
          } else if (data.status === 'failed') {
            setStatus('error');
            const errorMsg = data.error || (data.logs && data.logs.length > 0 ? data.logs[data.logs.length - 1] : "Process failed");
            setJobError(readableError(errorMsg));
            setLogs(prev => [...prev, "Error: " + errorMsg]);
            stop();
            refreshMe();
          } else {
            // Update logs if available
            if (data.logs) {
              setLogs(data.logs);
              setLogTimes(data.log_times || []);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
          failures += 1;
          if (pollFailureAction(e, failures) === 'gone') {
            stop();
            // Back to idle (which drops the saved session) and on to History,
            // where a finished job's clips are kept.
            handleResetRef.current();
            setSessionRecovered(false);
            setJobGone(true);
            if (historyAvailableRef.current) setActiveTab('history');
          }
        }
        inFlight = false;
        schedule();
    };
    if ((status === 'processing' || status === 'completed') && jobId) {
      document.addEventListener('visibilitychange', onVisible);
      timer = setTimeout(tick, 2000);
    }
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, jobId, refreshMe]);


  // silent: background auto-fetch — never alert(), just log. Managed users need
  // no local key (the server resolves its own); BYOK sends the header.
  const fetchUserProfiles = async ({ silent = false } = {}) => {
    if (!uploadPostKey && !isManaged) return;
    try {
      const res = await apiFetch('/api/social/user', {
        headers: uploadPostKey ? { 'X-Upload-Post-Key': uploadPostKey } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.profiles && data.profiles.length > 0) {
        setUserProfiles(data.profiles);
        // Auto select first if none selected
        if (!uploadUserId) {
          setUploadUserId(data.profiles[0].username);
        }
      } else if (!silent) {
        alert("No profiles found for this API Key.");
      }
    } catch (e) {
      if (!silent) alert("Error fetching User Profiles. Please check key.");
      console.error(e);
    }
  };

  // Hosted is paid-only (no BYOK core). Self-host uses BYOK keys.
  // `keysMissing` now means "self-host BYOK keys missing" — it never fires on hosted.
  // A self-hosted server running the moment picker on a local LLM
  // (LLM_BASE_URL) does not need a Gemini key for the core pipeline.
  const geminiOk = !!apiKey || !!localLlm;
  const keysMissing = !billingEnabled && !geminiOk;
  const needsPlan = billingEnabled && !isManaged;   // hosted, signed-out or no active plan/trial

  // Fresh sign-up: Clip Generator tutorial (AuthContext set os_show_clip_tutorial
  // after the auth redirect). QA: #app?tutorial=1. Resume coach if they refreshed
  // mid-job. Runs once on mount so a later isSignedIn flip cannot reset intro→coach.
  useEffect(() => {
    let showTutorial = false;
    let resumeCoach = false;
    try {
      const q = new URLSearchParams((window.location.hash.split('?')[1] || ''));
      const qa = q.get('tutorial');
      if (qa === '1') showTutorial = true;
      if (qa === 'coach') resumeCoach = true;
      if (qa === 'celebrate') { setTutorialPhase('celebrate'); return; }
      if (localStorage.getItem('os_show_clip_tutorial') === '1') showTutorial = true;
      if (localStorage.getItem('os_clip_tutorial') === 'coach') resumeCoach = true;
      // A request parked before the sign-in redirect is about to resume on its
      // own: opening the intro ("paste a link and generate") on top of a job
      // that is already starting contradicts itself. Skip it for this signup.
      if (showTutorial && peekPendingJob()) {
        showTutorial = false;
        localStorage.removeItem('os_show_clip_tutorial');
      }
    } catch (_) { /* ignore */ }
    if (showTutorial) {
      setTutorialPhase('intro');
      setActiveTab('dashboard');
    } else if (resumeCoach) {
      setTutorialPhase('coach');
      setActiveTab('dashboard');
    }
  }, []);

  // Legacy: an older build may still have set os_show_plan_choice. Don't open it
  // on top of the tutorial.
  useEffect(() => {
    if (tutorialPhase) return;
    if (!(billingEnabled && isSignedIn)) return;
    let showPlans = false;
    try { showPlans = localStorage.getItem('os_show_plan_choice') === '1'; } catch (_) { /* ignore */ }
    if (showPlans) {
      setShowPlanChoice(true);
      try { localStorage.removeItem('os_show_plan_choice'); } catch (_) { /* ignore */ }
    }
  }, [billingEnabled, isSignedIn, tutorialPhase]);

  const tutorialLock = tutorialPhase === 'intro' || tutorialPhase === 'coach' || tutorialPhase === 'celebrate';

  // Sign-up survey (cloud/onboarding.py): before the tutorial intro, never
  // during the coach phase or the celebration. It may open while a job runs or
  // once it is done: a link pasted on the landing resumes straight into
  // processing after sign-in, and gating on 'idle' left ~half of all sign-ups
  // (the landing-paste flow, 98% of whom never come back) unasked.
  const [surveyDone, setSurveyDone] = useState(false);
  const showSurvey = billingEnabled && !!me?.onboarding_survey_pending && !surveyDone
    && (tutorialPhase === null || tutorialPhase === 'intro') && status !== 'error';

  useEffect(() => {
    if (tutorialLock && activeTab !== 'dashboard') setActiveTab('dashboard');
  }, [tutorialLock, activeTab]);

  // Deep links into a tab: #app?tab=autopilot (Autopilot emails, the social
  // connect page's return URL). Read once per hash change, then the query is
  // dropped so a reload does not keep forcing the tab.
  const [autopilotConnected, setAutopilotConnected] = useState(null); // connect outcome, see lib/connectReturn.js
  useEffect(() => {
    const DEEP_LINK_TABS = ['autopilot', 'history', 'settings', 'thumbnails', 'dashboard', 'saasshorts'];
    const apply = () => {
      const hash = window.location.hash || '';
      if (!hash.startsWith('#app?')) return;
      const params = new URLSearchParams(hash.slice(5));
      const tab = params.get('tab');
      if (!tab || !DEEP_LINK_TABS.includes(tab)) return;  // e.g. #app?tutorial=1
      setActiveTab(tab);
      // The connect outcome rides in the query string, not in the hash
      // (lib/connectReturn.js): a cancel also comes back with connected=1.
      if (tab === 'autopilot' && params.get('connected') === '1') {
        setAutopilotConnected(readConnectReturn(window.location.search));
      }
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${stripConnectReturn(window.location.search)}#app`);
      } catch (_) { /* ignore */ }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // Signed out on a tab that needs a session (the clips-ready email links to
  // #app?tab=history): remember it, so the sign-in comes back here instead of
  // to the Clip Generator (lib/tabAfterLogin, read by AuthContext).
  useEffect(() => {
    if (billingEnabled && !authLoading && !isSignedIn) rememberTabAfterLogin(activeTab);
  }, [billingEnabled, authLoading, isSignedIn, activeTab]);

  // #app?checkout=cancel: back from a Stripe checkout opened inside the app
  // (cancel_url in cloud/billing.py), so the user lands on their clips again.
  useEffect(() => {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#app?') || new URLSearchParams(hash.slice(5)).get('checkout') !== 'cancel') return;
    track('CheckoutCanceled', { props: { back_to: 'app' } });
    try { window.history.replaceState(null, '', '#app'); } catch (_) { /* ignore */ }
  }, []);

  // #app?login=1: the "Log in" link of the site nav (seo/nav.js). Opens the
  // sign-in dialog once the session is known (already signed in: just the
  // app), then drops the query so a reload does not reopen it.
  const wantsLogin = () => {
    const hash = window.location.hash || '';
    return hash.startsWith('#app?') && new URLSearchParams(hash.slice(5)).get('login') === '1';
  };
  const [loginRequested, setLoginRequested] = useState(wantsLogin);
  useEffect(() => {
    const onHash = () => { if (wantsLogin()) setLoginRequested(true); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (!loginRequested || authLoading) return;
    setLoginRequested(false);
    if (billingEnabled && !isSignedIn) setShowLogin(true);
    try { window.history.replaceState(null, '', '#app'); } catch (_) { /* ignore */ }
  }, [loginRequested, authLoading, billingEnabled, isSignedIn]);

  useEffect(() => {
    if (tutorialPhase === 'coach' && status === 'complete' && (results?.clips?.length > 0)) {
      setTutorialPhase('celebrate');
      track('ClipTutorialCompleted', { props: { clips: results.clips.length } });
    }
  }, [tutorialPhase, status, results]);

  const finishTutorial = () => {
    try { localStorage.setItem('os_clip_tutorial', 'done'); } catch (_) { /* ignore */ }
    try { localStorage.removeItem('os_show_clip_tutorial'); } catch (_) { /* ignore */ }
    setTutorialPhase(null);
  };
  const startTutorial = () => {
    try { localStorage.setItem('os_clip_tutorial', 'coach'); } catch (_) { /* ignore */ }
    try { localStorage.removeItem('os_show_clip_tutorial'); } catch (_) { /* ignore */ }
    track('ClipTutorialStarted');
    setTutorialPhase('coach');
    setActiveTab('dashboard');
  };
  const skipTutorial = () => {
    track('ClipTutorialSkipped', { props: { phase: tutorialPhase } });
    finishTutorial();
  };
  // Included in the plan (fully managed, no keys): Clip Generator + YouTube Studio.
  // Advanced (bring your own fal.ai + ElevenLabs keys): AI Shorts + AI Agent.
  const INCLUDED_TOOL_TABS = ['dashboard', 'thumbnails'];
  const ADVANCED_TOOL_TABS = ['saasshorts', 'ai-agent'];
  const TOOL_NAMES = { dashboard: 'the Clip Generator', thumbnails: 'the YouTube Studio' };
  const gateThisTab = needsPlan && INCLUDED_TOOL_TABS.includes(activeTab);      // included tool, no plan yet
  const advancedThisTab = billingEnabled && ADVANCED_TOOL_TABS.includes(activeTab); // BYOK-notice tools

  // Social nudge visibility: managed users with clips on screen and no network
  // connected yet. userProfiles being empty (not yet fetched / none created)
  // also counts as "not connected" — that is the 97% case.
  const connectedSocials = ((userProfiles.find((p) => p.username === uploadUserId) || userProfiles[0])?.connected) || [];
  const showAutopilotNudge = billingEnabled && isManaged && !autopilotNudgeDismissed && !autopilotOn && !tutorialLock;
  const showSocialNudge = isManaged && !socialNudgeDismissed && connectedSocials.length === 0 && !tutorialLock
    && !showAutopilotNudge;

  // Paid plans may already run Autopilot: ask once, on the first results.
  const autopilotCheckedRef = useRef(false);
  useEffect(() => {
    if (status !== 'complete' || !showAutopilotNudge || plan === 'free' || autopilotCheckedRef.current) return;
    autopilotCheckedRef.current = true;
    apiJson('/api/autopilot')
      .then((d) => { if (d?.settings?.enabled) setAutopilotOn(true); })
      .catch(() => { /* keep the nudge */ });
  }, [status, showAutopilotNudge, plan]);

  const _dismissAutopilotNudge = (event) => {
    track(event);
    setAutopilotNudgeDismissed(true);
    try { localStorage.setItem('os_autopilot_nudge_dismissed', '1'); } catch (_) { /* ignore */ }
  };

  const autopilotNudgeSeenRef = useRef(null);
  useEffect(() => {
    if (status === 'complete' && (results?.clips?.length > 0) && showAutopilotNudge && autopilotNudgeSeenRef.current !== jobId) {
      autopilotNudgeSeenRef.current = jobId;
      track('AutopilotNudgeSeen', { props: { plan: plan || 'free' } });
    }
  }, [status, results, showAutopilotNudge, jobId, plan]);

  // One Seen event per job, only when the banner actually rendered.
  const socialNudgeSeenRef = useRef(null);
  useEffect(() => {
    if (status === 'complete' && (results?.clips?.length > 0) && showSocialNudge && socialNudgeSeenRef.current !== jobId) {
      socialNudgeSeenRef.current = jobId;
      track('SocialNudgeSeen', { props: { clips: results.clips.length } });
    }
  }, [status, results, showSocialNudge, jobId]);

  // Managed users connect their socials via Upload-Post's branded hosted page.
  const handleConnectSocials = async () => {
    try {
      const { access_url } = await apiJson('/api/social/connect', { method: 'POST' });
      // Same tab so the connect page's redirectUrl brings the user back into the app.
      if (access_url) window.location.href = access_url;
    } catch (e) {
      if (e instanceof QuotaError) { openQuotaWall(e, 'social_connect'); return; }
      alert('Could not open the connection page. Please try again.');
    }
  };

  // Open the Upload-Post white-label page (which includes the scheduling calendar)
  // in a new tab, for consulting/managing scheduled posts from the dashboard.
  const handleOpenCalendar = async () => {
    try {
      const { access_url } = await apiJson('/api/social/connect', { method: 'POST' });
      if (access_url) window.open(access_url, '_blank', 'noopener');
    } catch (e) {
      if (e instanceof QuotaError) { openQuotaWall(e, 'calendar'); return; }
      alert('Could not open the calendar. Please try again.');
    }
  };

  const handleProcess = async (data, forceLowQuality = false) => {
    // Hosted: must be signed in AND on an active plan/trial. Self-host: BYOK keys.
    if (billingEnabled) {
      // The billing gate below is unchanged: signed in, then entitled, then the
      // processing path. The only new thing is the first branch remembering what
      // the visitor asked for before sending them to sign in, so the resume
      // effect can hand the exact same request back to this function and let it
      // fall through the same gates.
      if (!isSignedIn) { stashPendingJob(data); setShowLogin(true); return; }
      if (!isManaged) { window.location.hash = '#/pricing'; return; }
    } else if (keysMissing) {
      setShowKeyModal(true);
      return;
    }
    // Past every gate, so this request is really running: nothing left to resume.
    clearPendingJob();
    setStatus('processing');
    setJobError('');
    setLogs(["Starting process..."]);
    setLogTimes([Date.now() / 1000]);
    setResults(null);
    // Studio handovers have no local media object; the preview switches to the
    // backend-served source once the job id is known.
    setProcessingMedia(data.type === 'thumbnail_session' ? null : data);
    setQualityGate(null);
    setProjectState(null);
    setNoSource(false);
    setPartialJob(null);
    setFirstVideoJob(false);

    try {
      let body;
      // BYOK sends the Gemini header; managed users rely on the bearer token
      // that apiFetch attaches automatically.
      const headers = apiKey ? { 'X-Gemini-Key': apiKey } : {};

      // Advanced generation controls: only sent when the user set them, so the
      // default request stays byte-identical to the pre-feature one.
      const advanced = {
        target_clips: data.targetClips || null,
        clip_min_seconds: data.clipMinSeconds || null,
        clip_max_seconds: data.clipMaxSeconds || null,
        // Sent explicitly both ways: absent means off for raw API callers,
        // but the dashboard always states the user's choice.
        auto_hook: data.autoHook ? '1' : '0',
        auto_hook_style: data.autoHook ? (data.autoHookStyle || 'pill') : null,
        // 'auto' is the server default, so only a deliberate choice travels.
        layouts: data.layout && data.layout !== 'auto' ? data.layout : null,
        // Set when the user took the quota wall's "clip the first N minutes"
        // offer: the server reserves N minutes and cuts the source to them.
        max_minutes: data.maxMinutes || null,
        // The stretch picked under the cost line (seconds); absent = whole video.
        source_start: data.sourceStart ?? null,
        source_end: data.sourceEnd ?? null,
      };

      if (data.type === 'url') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          url: data.payload,
          acknowledged: !!data.acknowledged,
          output_format: data.outputFormat || 'auto',
          force_low_quality: forceLowQuality,
          ...Object.fromEntries(Object.entries(advanced).filter(([, v]) => v != null)),
        });
      } else if (data.type === 'thumbnail_session') {
        // Handover from Thumbnail Studio (issue #68): the video and transcript
        // already live server-side, keyed by the Studio session.
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          thumbnail_session_id: data.payload,
          acknowledged: !!data.acknowledged,
          output_format: data.outputFormat || 'auto',
          ...Object.fromEntries(Object.entries(advanced).filter(([, v]) => v != null)),
        });
      } else {
        const formData = new FormData();
        formData.append('file', data.payload);
        formData.append('acknowledged', data.acknowledged ? 'true' : 'false');
        formData.append('output_format', data.outputFormat || 'auto');
        for (const [k, v] of Object.entries(advanced)) {
          if (v != null) formData.append(k, v);
        }
        body = formData;
      }

      const res = await apiFetch('/api/process', { method: 'POST', headers, body });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();

      // Quality gate: the source is below the min resolution — ask before burning
      // 20 min on it. On confirm we resend with force_low_quality.
      if (resData.needs_confirmation) {
        setStatus('idle');
        setQualityGate({ info: resData.quality_check, data });
        return;
      }

      setJobId(resData.job_id);
      setPartialJob(resData.partial || null);
      setFirstVideoJob(!!resData.first_video);
      // The server clipped past the balance on its own (no wall): the first
      // video whole, or the first N minutes of a later one.
      if (resData.first_video) track('FirstVideoGrant');
      else if (resData.partial && !resData.partial.chosen && data.maxMinutes == null) {
        track('AutoPartial', { props: { processed: resData.partial.processed_minutes, total: resData.partial.total_minutes } });
      }
      if (data.type === 'thumbnail_session') {
        setProcessingMedia({ type: 'server', payload: `/api/source/${resData.job_id}` });
      }
      // Minutes are reserved at job start, not at complete.
      refreshMe();

    } catch (e) {
      if (e instanceof QuotaError && e.code === 'free_queue_full') {
        // The free queue is full: nothing was reserved or spent. Same plan
        // wall, its own copy and source so the funnel is measured apart.
        setStatus('idle');
        setTopUpInfo({ context: 'queue_full', source: 'queue_full', highlight: 'starter' });
        setShowTopUp(true);
        return;
      }
      if (e instanceof QuotaError) {
        setStatus('idle');
        refreshMe();
        // Trial users hit the trial minute cap → prompt them to activate the plan
        // now (unlocks full minutes). Active users → offer a top-up.
        if (me?.status === 'trialing') {
          setShowTrialUpgrade(true);
        } else {
          // The wall can offer the first N minutes of this same submission on
          // the minutes they have: same data, plus max_minutes.
          const partial = e.partialMinutes || 0;
          setTopUpInfo({
            required: e.minutesRequired,
            remaining: e.minutesRemaining,
            partialMinutes: partial,
            onPartial: partial
              ? () => {
                  track('PartialClipChosen', { props: { required: e.minutesRequired, partial } });
                  setShowTopUp(false);
                  handleProcess({ ...data, maxMinutes: partial }, forceLowQuality);
                }
              : null,
          });
          setShowTopUp(true);
        }
        return;
      }
      const reason = readableError(e.message);
      setJobError(reason);
      setStatus('error');
      setLogs(l => [...l, `Error starting job: ${reason}`]);
    }
  };

  // Resume the job the visitor started before signing in. Runs on the render
  // that first sees isSignedIn true — after a magic link or a Google round trip,
  // i.e. a fresh document — and replays the request through handleProcess, so
  // the entitlement gate still decides whether it actually runs: an unentitled
  // account lands on #/pricing with the request still parked, and pays for it
  // later. `resumedStamp` keeps one parked request from being replayed twice in
  // the same document (the pricing redirect would otherwise loop on it).
  const handleProcessRef = useRef(null);
  const resumedStampRef = useRef(0);
  useEffect(() => {
    handleProcessRef.current = handleProcess;
  });
  useEffect(() => {
    if (!billingEnabled || !isSignedIn) return;
    const pending = peekPendingJob();
    if (!pending || pending.stamp === resumedStampRef.current) return;
    resumedStampRef.current = pending.stamp;
    track('JobResumedAfterSignin', { props: { type: pending.data?.type || 'unknown' } });
    handleProcessRef.current(pending.data);
  }, [billingEnabled, isSignedIn]);

  const handleReset = () => {
    setJobGone(false);
    // Flush any pending edit-state sync before dropping the project: the clips
    // themselves are already archived to R2 as they were edited.
    flushClipState();
    setStatus('idle');
    setJobId(null);
    setResults(null);
    setLogs([]);
    setLogTimes([]);
    setProcessingMedia(null);
    setProjectState(null);
    setNoSource(false);
    setPartialJob(null);
    setFirstVideoJob(false);
    setQueueInfo(null);
    setJobError('');
    localStorage.removeItem(SESSION_KEY);
  };
  useEffect(() => {
    handleResetRef.current = handleReset;
  });

  // --- UI Components ---

  // One nav definition drives all three surfaces: the desktop rail, the mobile
  // drawer, and the bottom tab bar. `short` is the tab-bar label — the full one
  // wraps to two lines in a 5-up bar on a 360px phone.
  const navItems = [
    { id: 'dashboard', ord: '01', icon: Film, label: 'Clip Generator', short: 'clips', primary: true },
    { id: 'batch', ord: '02', icon: Layers, label: 'Batch Studio', short: 'batch', isNew: true, primary: true },
    // Cloud only: it runs on the managed pipeline and the Upload-Post connection.
    ...(billingEnabled ? [{ id: 'autopilot', ord: '02', icon: Rocket, label: 'Autopilot', short: 'autopilot', isNew: true }] : []),
    { id: 'saasshorts', ord: '03', icon: Sparkles, label: 'AI Shorts', short: 'ai shorts', byok: true, primary: true },
    { id: 'ai-agent', ord: '04', icon: Bot, label: 'AI Agent', short: 'agent', byok: true },
    { id: 'ugc-gallery', ord: '05', icon: LayoutGrid, label: 'UGC Gallery', short: 'gallery', primary: true },
    { id: 'thumbnails', ord: '06', icon: Image, label: 'YouTube Studio', short: 'studio', primary: true },
    ...(billingEnabled && isSignedIn ? [{ id: 'history', ord: '07', icon: History, label: 'History', short: 'history' }] : []),
    { id: 'settings', ord: '08', icon: Settings, label: 'Settings', short: 'settings' },
  ];
  const activeNav = navItems.find((n) => n.id === activeTab);

  // Escape closes the mobile drawer. The shell itself is overflow-hidden, so
  // there is no body scroll to lock behind it.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const goToTab = (id) => {
    if (tutorialLock && id !== 'dashboard') return;
    setActiveTab(id);
    setNavOpen(false);
  };
  const tabLocked = (id) => tutorialLock && id !== 'dashboard';

  // Shared footer links (landing, repo, pricing, contact) — same list in the
  // desktop rail and the mobile drawer, so they can never drift apart.
  const NavFooterLinks = ({ collapsed = false }) => (
    <>
      <a
        href="#landing"
        className="flex items-center gap-2 px-3 py-2 text-xs lowercase text-muted hover:text-ink2 transition-colors"
      >
        <Globe size={14} className="shrink-0" />
        <span className={collapsed ? 'hidden lg:block truncate' : 'truncate'}>landing page</span>
      </a>
      <a
        href="https://github.com/digitalinproject-ui/Digiclip"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 text-xs lowercase text-muted hover:text-ink2 transition-colors"
      >
        <svg height="14" viewBox="0 0 16 16" version="1.1" width="14" aria-hidden="true" fill="currentColor" className="shrink-0"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
        <span className={collapsed ? 'hidden lg:block truncate' : 'truncate'}>open source</span>
      </a>
      {billingEnabled && (
        <a
          href="#/pricing"
          className="flex items-center gap-2 px-3 py-2 text-xs lowercase text-muted hover:text-ink2 transition-colors"
        >
          <Sparkles size={14} className="shrink-0" />
          <span className={collapsed ? 'hidden lg:block truncate' : 'truncate'}>plans &amp; pricing</span>
        </a>
      )}
      <a
        href="mailto:info@openshorts.app"
        className="flex items-center gap-2 px-3 py-2 text-xs lowercase text-muted hover:text-ink2 transition-colors"
      >
        <Mail size={14} className="shrink-0" />
        <span className={collapsed ? 'hidden lg:block truncate' : 'truncate'}>info@openshorts.app</span>
      </a>
    </>
  );

  // Desktop rail: icon-only from md, labelled from lg. Below md it is gone
  // entirely — an unlabelled 80px rail ate a fifth of a phone screen.
  const Sidebar = () => (
    <div className="hidden md:flex w-20 lg:w-64 bg-white border-r border-[#e5e5ea] flex-col h-full shrink-0 transition-all duration-300">
      <a href="#app" onClick={() => goToTab('dashboard')} className="p-6 flex items-center group" title="Digiclip Studio">
        <div className="w-9 h-9 flex items-center justify-center shrink-0 lg:hidden">
          <img src="/logo-black.png" alt="Digiclip" className="w-full h-full object-contain" />
        </div>
        <div className="hidden lg:flex items-center">
          <img src="/logo-full.png" alt="Digiclip" className="h-7 w-auto object-contain" />
        </div>
      </a>

      <nav className="flex-1 px-3.5 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const NavIcon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              data-tutorial={item.id === 'dashboard' ? 'nav-clips' : undefined}
              onClick={() => goToTab(item.id)}
              title={tabLocked(item.id) ? 'Finish your first clips to unlock' : item.label}
              disabled={tabLocked(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#0000fb]/10 text-[#0000fb] font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
              } ${tabLocked(item.id) ? 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-neutral-400' : ''}`}
            >
              <NavIcon size={18} strokeWidth={1.8} className={`shrink-0 ${isActive ? 'text-[#0000fb]' : 'text-neutral-500'}`} />
              <span className="hidden lg:block flex-1 text-left truncate">{item.label}</span>
              {tabLocked(item.id)
                ? <Lock size={12} className="shrink-0 hidden lg:block text-neutral-400" />
                : item.byok ? (
                  <span
                    title="Bring Your Own Key — Menggunakan API Key Anda sendiri (fal.ai / ElevenLabs) yang dapat diatur di Settings"
                    className="text-[10px] font-medium tracking-tight bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200/80 hidden lg:inline-flex items-center gap-1 shadow-2xs"
                  >
                    <KeyRound size={10} className="text-neutral-400" />
                    BYOK
                  </span>
                ) : item.isNew ? (
                  <span className="text-[10px] font-semibold tracking-wider bg-[#0000fb] text-white px-2 py-0.5 rounded-full shadow-2xs hidden lg:block">
                    New
                  </span>
                ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#e5e5ea] space-y-1 text-xs">
        <a
          href="https://saweria.co/Digitalin"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 rounded-xl transition-all font-semibold group"
          title="Support & Donate Digiclip on Saweria"
        >
          <Heart size={16} className="shrink-0 text-rose-500 fill-rose-500 group-hover:scale-110 transition-transform" />
          <span className="hidden lg:inline">Support Donate</span>
          <span className="hidden lg:inline ml-auto text-[9px] font-bold uppercase bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded-full">Saweria</span>
        </a>
        <a href="https://github.com/digitalinproject-ui/Digiclip" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100/60 transition-colors">
          <HelpCircle size={16} /> <span className="hidden lg:inline">Help & Support</span>
        </a>
        <button onClick={() => billingEnabled && !isSignedIn ? setShowLogin(true) : goToTab('settings')} className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100/60 transition-colors text-left">
          <User size={16} /> <span className="hidden lg:inline">{billingEnabled && isSignedIn ? 'Account' : 'Settings'}</span>
        </button>
        <div className="pt-2 px-1 text-[11px] text-neutral-400 hidden lg:block text-center">
          Powered by{' '}
          <a
            href="https://digitalinlabs.id"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-neutral-600 hover:text-[#0000fb] transition-colors"
          >
            Digitalinlabs.id
          </a>
        </div>
      </div>
    </div>
  );

  // Mobile drawer: the complete nav, reachable from the header's menu button.
  const MobileNavDrawer = () => (
    <div
      className="md:hidden fixed inset-0 z-[90] flex"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <div
        className="absolute inset-0 bg-black/60 animate-fade"
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <div className="relative w-[17rem] max-w-[82vw] h-full bg-white border-r border-[#e5e5ea] flex flex-col animate-slide-in-left">
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#e5e5ea] shrink-0">
          <a href="#app" className="flex items-center" onClick={() => goToTab('dashboard')}>
            <img src="/logo-full.png" alt="Digiclip" className="h-7 w-auto object-contain" />
          </a>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="close navigation"
            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const NavIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goToTab(item.id)}
                disabled={tabLocked(item.id)}
                aria-current={isActive ? 'page' : undefined}
                title={tabLocked(item.id) ? 'Finish your first clips to unlock' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-[#0000fb]/10 text-[#0000fb] font-semibold' : 'text-neutral-600 active:bg-neutral-100'} ${tabLocked(item.id) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <NavIcon size={18} strokeWidth={1.8} className={`shrink-0 ${isActive ? 'text-[#0000fb]' : 'text-neutral-500'}`} />
                <span className="text-[0.95rem] flex-1 text-left truncate">{item.label}</span>
                {tabLocked(item.id)
                  ? <Lock size={12} className="shrink-0 text-neutral-400" />
                  : item.byok ? (
                    <span
                      title="Bring Your Own Key — Menggunakan API Key Anda sendiri (fal.ai / ElevenLabs) yang dapat diatur di Settings"
                      className="text-[10px] font-medium tracking-tight bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200/80 inline-flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      <KeyRound size={10} className="text-neutral-400" />
                      BYOK
                    </span>
                  ) : item.isNew ? (
                    <span className="text-[10px] font-semibold tracking-wider bg-[#0000fb] text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                      New
                    </span>
                  ) : null}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[#e5e5ea] space-y-1 safe-bottom shrink-0 text-xs">
          <a
            href="https://saweria.co/Digitalin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 text-rose-600 bg-rose-50/70 hover:bg-rose-100/80 rounded-xl transition-all font-semibold"
            title="Support & Donate Digiclip on Saweria"
          >
            <Heart size={16} className="text-rose-500 fill-rose-500" />
            <span>Support Donate</span>
            <span className="ml-auto text-[9px] font-bold uppercase bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded-full">Saweria</span>
          </a>
          <a href="https://github.com/digitalinproject-ui/Digiclip" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2 text-neutral-500 hover:text-neutral-900 rounded-lg transition-colors">
            <HelpCircle size={16} /> <span>Help & Support</span>
          </a>
          <div className="pt-2 px-1 text-[11px] text-neutral-400 text-center">
            Powered by{' '}
            <a
              href="https://digitalinlabs.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-neutral-600 hover:text-[#0000fb] transition-colors"
            >
              Digitalinlabs.id
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  // Bottom tab bar: the four everyday destinations plus "more" for the rest.
  const MobileTabBar = () => {
    const tabs = navItems.filter((n) => n.primary);
    const moreActive = !tabs.some((t) => t.id === activeTab);
    return (
      <nav className="md:hidden shrink-0 border-t border-[#e5e5ea] bg-white/95 backdrop-blur-sm safe-bottom">
        <div className="flex items-stretch">
          {tabs.map((item) => {
            const NavIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                data-tutorial={item.id === 'dashboard' ? 'nav-clips' : undefined}
                onClick={() => goToTab(item.id)}
                disabled={tabLocked(item.id)}
                aria-current={isActive ? 'page' : undefined}
                title={tabLocked(item.id) ? 'Finish your first clips to unlock' : undefined}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors ${isActive ? 'text-[#0000fb] font-semibold' : 'text-neutral-500 active:text-neutral-900'} ${tabLocked(item.id) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <NavIcon size={19} strokeWidth={1.8} className={isActive ? 'text-[#0000fb]' : ''} />
                <span className="text-[10.5px] leading-none truncate max-w-full px-0.5">{item.short}</span>
              </button>
            );
          })}
          <button
            onClick={() => setNavOpen(true)}
            aria-label="more sections"
            aria-expanded={navOpen}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors ${moreActive ? 'text-[#0000fb] font-semibold' : 'text-neutral-500 active:text-neutral-900'}`}
          >
            <Menu size={19} className={moreActive ? 'text-[#0000fb]' : ''} />
            <span className="text-[10.5px] leading-none">more</span>
          </button>
        </div>
      </nav>
    );
  };

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-[#f8f9fa] text-neutral-900 overflow-hidden font-sans">
      <Sidebar />
      {navOpen && <MobileNavDrawer />}

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        {/* Top Header - Apple Clean White Navbar with Search & CTA */}
        <header className="h-16 border-b border-[#e5e5ea] bg-white flex items-center justify-between gap-4 px-4 sm:px-8 shrink-0 z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="open navigation"
              className="md:hidden -ml-1 p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors shrink-0"
            >
              <Menu size={20} />
            </button>

            {/* Apple-style Search Bar matching Reference Image */}
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your clips..."
                className="w-full pl-9 pr-12 py-2 bg-neutral-100/80 hover:bg-neutral-100 focus:bg-white border border-transparent focus:border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-neutral-400 bg-white border border-neutral-200 px-1.5 py-0.5 rounded shadow-2xs">⌘ K</span>
            </div>

            <span className="md:hidden font-bold text-neutral-900 text-sm">
              {activeNav?.label || 'Digiclip'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Primary Action Button (Generate New Clip / New Project) */}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 bg-[#0000fb] hover:bg-[#0000d6] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>Generate New Clip</span>
            </button>

            {/* Notifications Bell matching Reference Image */}
            <button className="relative p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors hidden sm:inline-flex">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
            </button>

            {userProfiles.length > 0 && (
              <UserProfileSelector
                profiles={userProfiles}
                selectedUserId={uploadUserId}
                onSelect={setUploadUserId}
                onConnect={isManaged ? handleConnectSocials : undefined}
              />
            )}

            {billingEnabled && isManaged && (
              <UsageMeter onClick={() => {
                if (plan === 'free') openUpsell({ source: 'meter' });
                else { window.location.hash = '#/account'; }
              }} />
            )}
            {billingEnabled && isSignedIn && !isManaged && (
              <button onClick={() => setShowPlanChoice(true)}
                className="btn-primary px-4 py-2 text-xs">
                Choose a plan
              </button>
            )}
            {billingEnabled && !isSignedIn && (
              <button onClick={() => setShowLogin(true)}
                className="btn-ghost px-4 py-2 text-xs">
                Sign in
              </button>
            )}
            {billingEnabled && isSignedIn && <ProfileMenu onUpgrade={isManaged ? openUpsell : null} />}

            {keysMissing && (
              <button
                onClick={() => (billingEnabled && !isSignedIn ? setShowLogin(true) : goToTab('settings'))}
                className="badge-warn hover:brightness-110 transition-all hidden sm:inline-flex"
                title="Configure API keys or choose a plan"
              >
                <AlertTriangle size={12} />
                <span className="hidden md:inline">
                  {!geminiOk ? 'Gemini API Key Missing' : 'Settings'}
                </span>
                <span className="md:hidden">key missing</span>
              </button>
            )}
          </div>
        </header>

        {/* Persistent Missing Keys Banner — visible on every screen */}
        {keysMissing && activeTab !== 'settings' && (
          <div className="mx-3 sm:mx-6 mt-3 px-3.5 sm:px-4 py-3 bg-paper2 border border-rule rounded-card flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 shrink-0 animate-fade">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 text-sm text-ink2 min-w-0 flex-1">
              <KeyRound size={16} className="shrink-0 text-warn mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-medium text-ink">Gemini API key missing.</span>{' '}
                <span className="text-muted">
                  Set your free Gemini API key to use OpenShorts.
                </span>
              </div>
            </div>
            <button
              onClick={() => goToTab('settings')}
              className="btn-quiet px-3 py-1.5 text-xs shrink-0 w-full sm:w-auto"
            >
              Go to Settings
            </button>
          </div>
        )}

        {/* Session Recovery Banner */}
        {sessionRecovered && (
          <div className="mx-3 sm:mx-6 mt-2 px-3.5 sm:px-4 py-3 bg-paper2 border border-rule rounded-card flex items-start justify-between gap-3 animate-fade shrink-0">
            <div className="flex items-start sm:items-center gap-2 text-sm text-ink2 flex-wrap min-w-0">
              <RotateCcw size={16} className="text-brass shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-medium">Session recovered</span>
              <span className="text-muted text-xs">Your previous work has been restored.</span>
            </div>
            <button
              onClick={() => setSessionRecovered(false)}
              aria-label="dismiss"
              className="text-muted hover:text-ink transition-colors shrink-0 -m-1 p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* The restored job is no longer on the server (purged or not yours). */}
        {jobGone && (
          <div role="status" className="mx-3 sm:mx-6 mt-2 px-3.5 sm:px-4 py-3 bg-paper2 border border-rule rounded-card flex items-start justify-between gap-3 animate-fade shrink-0">
            <div className="flex items-start sm:items-center gap-2 text-sm text-ink2 flex-wrap min-w-0">
              <History size={16} className="text-brass shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-medium">That project is no longer open</span>
              <span className="text-muted text-xs">
                {billingEnabled && isSignedIn
                  ? 'If it finished, its clips are saved in History.'
                  : 'The server has already cleared it. Start a new project to keep going.'}
              </span>
            </div>
            <button
              onClick={() => setJobGone(false)}
              aria-label="dismiss"
              className="text-muted hover:text-ink transition-colors shrink-0 -m-1 p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Included tools (Clip Generator, YouTube Studio): non-blocking trial prompt. */}
        {gateThisTab && <TrialGate toolName={TOOL_NAMES[activeTab] || 'this'} />}

        {/* Advanced tools (AI Shorts, AI Agent): BYOK fal.ai + ElevenLabs notice. */}
        {advancedThisTab && <AdvancedBanner needsPlan={needsPlan} onKeys={() => goToTab('settings')} />}

        {/* Main Workspace */}
        <div className="flex-1 overflow-hidden relative">

          {/* View: Settings */}
          {activeTab === 'settings' && (
            <div className="h-full overflow-y-auto p-4 sm:p-8 max-w-2xl mx-auto animate-fade">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Preferences</p>
                  <h1 className="font-display font-bold text-2xl sm:text-3xl text-neutral-900 tracking-tight">Settings</h1>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted mt-1">
                  <Shield size={12} className="text-ok shrink-0" /> Privacy: keys only live in your browser (sent to backend just to process)
                </div>
              </div>
              {/* Self-hosted installs have no account page, so the agent
                  how-to lives here; cloud users get it (with OAuth) in Account. */}
              {!billingEnabled && <div className="mb-6"><McpConnectCard cloud={false} /></div>}
              {isManaged ? (
                <div className="card p-6 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-input bg-paper3 flex items-center justify-center shrink-0">
                        <Shield size={16} className="text-brass" />
                      </div>
                      <h2 className="text-base font-bold text-neutral-900">Included In Your Plan</h2>
                    </div>
                    <span className="badge-ok">Managed</span>
                  </div>
                  <p className="text-xs text-muted mb-5 leading-relaxed">
                    Your plan includes the <strong>Clip Generator</strong> and <strong>YouTube Studio</strong>,
                    fully managed — no API keys required. AI Shorts &amp; dubbing use your own fal.ai / ElevenLabs
                    keys (below). Connect your social accounts to publish directly.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleConnectSocials} className="btn-primary py-2 px-4 text-sm">
                      <Share2 size={16} /> Connect social accounts
                    </button>
                    <button onClick={handleOpenCalendar} className="btn-quiet py-2 px-4 text-sm">
                      <Calendar size={16} /> Content calendar
                    </button>
                  </div>
                </div>
              ) : billingEnabled ? (
                <div className="card p-6 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-input bg-paper3 flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="text-brass" />
                      </div>
                      <h2 className="text-base font-bold text-neutral-900">Choose Your Plan</h2>
                    </div>
                    <span className="badge-ok">Free plan available</span>
                  </div>
                  <p className="text-xs text-muted mb-5 leading-relaxed">
                    Generate shorts with zero setup — no API keys needed. Start free with 20 min/month, or go paid from $12/mo. Cancel anytime.
                  </p>
                  <button onClick={() => setShowPlanChoice(true)} className="btn-primary py-2 px-4 text-sm">
                    <Sparkles size={16} /> Choose a plan
                  </button>
                </div>
              ) : (
                <>
              <KeyInput onKeySet={setApiKey} savedKey={apiKey} />

              <div className="card p-4 sm:p-6 mt-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-input bg-paper3 flex items-center justify-center shrink-0">
                      <Share2 size={16} className="text-brass" />
                    </div>
                    <h2 className="text-base font-bold text-neutral-900">Social Integration</h2>
                  </div>
                  <span className="text-xs text-muted">Optional (Auto-Publish)</span>
                </div>
                <p className="text-xs text-muted mb-6 leading-relaxed">
                  Required to publish your clips to TikTok, Instagram Reels, and YouTube Shorts via <strong>Upload-Post</strong>.
                  Includes a <strong>free tier</strong> (no credit card required).
                </p>
                <div className="space-y-4">
                  <label className="block text-sm text-muted">Upload-Post API Key</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={uploadPostKey}
                      onChange={(e) => setUploadPostKey(e.target.value)}
                      className="input-field"
                      placeholder="ey..."
                    />
                    <button onClick={fetchUserProfiles} className="btn-quiet py-2 px-4 text-sm">
                      Connect
                    </button>
                  </div>
                  <div className="text-xs text-muted leading-relaxed">
                    Connect your Upload-Post account to enable one-click publishing.
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <a href="https://app.upload-post.com/login" target="_blank" rel="noopener noreferrer" className="p-2 border border-rule rounded-input hover:bg-paper3 transition-colors flex flex-col gap-1">
                        <span className="text-ink2 font-medium">1. Login</span>
                        <span className="text-xs text-muted">Register account</span>
                      </a>
                      <a href="https://app.upload-post.com/manage-users" target="_blank" rel="noopener noreferrer" className="p-2 border border-rule rounded-input hover:bg-paper3 transition-colors flex flex-col gap-1">
                        <span className="text-ink2 font-medium">2. Profiles</span>
                        <span className="text-xs text-muted">Create & Connect</span>
                      </a>
                      <a href="https://app.upload-post.com/api-keys" target="_blank" rel="noopener noreferrer" className="p-2 border border-rule rounded-input hover:bg-paper3 transition-colors flex flex-col gap-1">
                        <span className="text-ink2 font-medium">3. API Key</span>
                        <span className="text-xs text-muted">Generate key</span>
                      </a>
                    </div>
                    <br />
                    <span className="text-muted">
                      Keys are only stored in your browser. They are sent to the backend only to process your request, never stored server-side.
                    </span>
                  </div>
                </div>
              </div>

                </>
              )}

              <div className="card p-4 sm:p-6 mt-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-input bg-paper3 flex items-center justify-center shrink-0">
                      <Globe size={16} className="text-brass" />
                    </div>
                    <h2 className="text-base font-bold text-neutral-900">Video Translation</h2>
                  </div>
                  <span className="readout">BYOK</span>
                </div>
                <p className="text-xs text-muted mb-6 leading-relaxed">
                  For <strong>AI Shorts &amp; dubbing</strong> — bring your own key. Translate your clips to different
                  languages using <strong>ElevenLabs</strong> AI dubbing (billed by ElevenLabs). Not covered by your plan.
                </p>
                <div className="space-y-4">
                  <label className="block text-sm text-muted">ElevenLabs API Key</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={elevenLabsKey}
                      onChange={(e) => setElevenLabsKey(e.target.value)}
                      className="input-field"
                      placeholder="sk_..."
                    />
                    <button
                      onClick={() => {
                        if (elevenLabsKey) {
                          localStorage.setItem('elevenLabsKey_v1', encrypt(elevenLabsKey));
                          setElevenLabsSaved(true);
                          setTimeout(() => setElevenLabsSaved(false), 2000);
                        }
                      }}
                      className={elevenLabsSaved ? 'badge-ok px-4' : 'btn-quiet py-2 px-4 text-sm'}
                    >
                      {elevenLabsSaved ? <><Check size={12} /> saved</> : 'Save'}
                    </button>
                  </div>
                  <div className="text-xs text-muted leading-relaxed">
                    Get your API key from ElevenLabs to enable video translation.
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <a href="https://elevenlabs.io/sign-up" target="_blank" rel="noopener noreferrer" className="p-2 border border-rule rounded-input hover:bg-paper3 transition-colors flex flex-col gap-1">
                        <span className="text-ink2 font-medium">1. Sign Up</span>
                        <span className="text-xs text-muted">Create account</span>
                      </a>
                      <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="p-2 border border-rule rounded-input hover:bg-paper3 transition-colors flex flex-col gap-1">
                        <span className="text-ink2 font-medium">2. API Key</span>
                        <span className="text-xs text-muted">Generate key</span>
                      </a>
                    </div>
                    <br />
                    <span className="text-muted">
                      Keys are only stored in your browser. They are sent to the backend only to process your request, never stored server-side.
                    </span>
                  </div>
                </div>
              </div>

              <div className="card p-4 sm:p-6 mt-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-input bg-paper3 flex items-center justify-center shrink-0">
                      <Sparkles size={16} className="text-brass" />
                    </div>
                    <h2 className="text-base font-bold text-neutral-900">AI Shorts (UGC Videos)</h2>
                  </div>
                  <span className="readout">BYOK</span>
                </div>
                <p className="text-xs text-muted mb-6 leading-relaxed">
                  Generate UGC-style videos with AI actors for any product or business using <strong>fal.ai</strong>.
                  <strong> Not covered by your plan</strong> — bring your own fal.ai + ElevenLabs keys (billed by those
                  providers, ~$0.65-2 per video). Your plan still covers the AI script &amp; orchestration.
                </p>
                <div className="space-y-4">
                  <label className="block text-sm text-muted">fal.ai API Key</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={falKey}
                      onChange={(e) => setFalKey(e.target.value)}
                      className="input-field"
                      placeholder="fal_..."
                    />
                    <button
                      onClick={() => {
                        if (falKey) {
                          localStorage.setItem('falKey_v1', encrypt(falKey));
                          setFalSaved(true);
                          setTimeout(() => setFalSaved(false), 2000);
                        }
                      }}
                      className={falSaved ? 'badge-ok px-4' : 'btn-quiet py-2 px-4 text-sm'}
                    >
                      {falSaved ? <><Check size={12} /> saved</> : 'Save'}
                    </button>
                  </div>
                  <div className="text-xs text-muted leading-relaxed">
                    Get your API key from fal.ai to enable AI actor video generation.
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="p-2 border border-rule rounded-input hover:bg-paper3 transition-colors flex flex-col gap-1">
                        <span className="text-ink2 font-medium">1. Sign Up</span>
                        <span className="text-xs text-muted">Create fal.ai account</span>
                      </a>
                      <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="p-2 border border-rule rounded-input hover:bg-paper3 transition-colors flex flex-col gap-1">
                        <span className="text-ink2 font-medium">2. API Key</span>
                        <span className="text-xs text-muted">Generate key</span>
                      </a>
                    </div>
                    <br />
                    <span className="text-muted">
                      Keys are only stored in your browser. Sent to backend only to process requests.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View: Batch Studio */}
          {activeTab === 'batch' && (
            <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 animate-fade">
              <BatchTab />
            </div>
          )}

          {/* View: SaaS Shorts */}
          {activeTab === 'saasshorts' && (
            <SaaShortsTab geminiApiKey={apiKey} elevenLabsKey={elevenLabsKey} falKey={falKey} uploadPostKey={uploadPostKey} uploadUserId={uploadUserId} managed={isManaged} />
          )}

          {/* View: AI Agent */}
          {activeTab === 'ai-agent' && (
            <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10 animate-fade">
              <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <Bot size={14} className="text-[#0000fb]" /> Autonomous Agent
                  </p>
                  <h1 className="font-bold text-3xl md:text-4xl tracking-tight text-neutral-900">
                    Your Personal Clipping Team
                  </h1>
                  <p className="text-neutral-600 text-base md:text-lg leading-relaxed max-w-2xl">
                    Drop your videos in a folder and a team of AI clippers picks the viral moments, edits them, and queues them for your approval — like having a 24/7 short-form editing crew on autopilot.
                  </p>
                </div>

                {/* Mobile-format warning */}
                <div className="px-4 py-3 rounded-2xl border border-neutral-200 bg-white flex items-start gap-3 shadow-2xs">
                  <Smartphone size={18} className="text-[#0000fb] shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-neutral-900 mb-1">Upload videos already in vertical (9:16) mobile format.</p>
                    <p className="text-neutral-500 leading-relaxed">
                      The agent does not reframe horizontal footage. Make sure every source video is shot or pre-cropped to mobile/portrait format before dropping it into the input folder.
                    </p>
                  </div>
                </div>

                {/* Workflow */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-2.5 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 flex items-center justify-center">
                      <Upload size={18} className="text-[#0000fb]" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">1. Drop your videos</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Put your long-form vertical footage in the watched folder. The skill picks one video per run.
                    </p>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-2.5 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 flex items-center justify-center">
                      <Users size={18} className="text-[#0000fb]" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">2. AI clippers work</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Whisper transcribes, Gemini spots viral beats, FFmpeg cuts each clip and adds a hook overlay.
                    </p>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-2.5 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 flex items-center justify-center">
                      <CheckCircle2 size={18} className="text-[#0000fb]" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">3. You validate, it ships</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Approve the candidates you like and the skill auto-publishes them to TikTok, Reels and YouTube Shorts via Upload-Post.
                    </p>
                  </div>
                </div>

                {/* Repo CTA */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xs">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="font-bold text-xl text-neutral-900 mb-1">Digiclip Autonomous Agent</h2>
                      <p className="text-sm text-neutral-500">
                        Autonomous background worker that powers this workflow. Install it once and trigger it whenever you want a fresh batch of clips.
                      </p>
                    </div>
                    <a
                      href="https://github.com/digitalinproject-ui/Digiclip"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary py-2 px-4 text-sm shrink-0"
                    >
                      View on GitHub <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 font-mono text-xs text-neutral-800 flex items-center justify-between gap-3">
                    <span className="truncate">git clone https://github.com/digitalinproject-ui/Digiclip.git</span>
                    <button
                      onClick={() => navigator.clipboard.writeText('git clone https://github.com/digitalinproject-ui/Digiclip.git')}
                      className="text-neutral-500 hover:text-neutral-900 transition-colors shrink-0"
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2 text-neutral-700">
                      <Check size={16} className="text-[#0000fb] shrink-0 mt-0.5" />
                      <span>Daily batch — picks one long video per run</span>
                    </div>
                    <div className="flex items-start gap-2 text-neutral-700">
                      <Check size={16} className="text-[#0000fb] shrink-0 mt-0.5" />
                      <span>Whisper transcription with word-level timing</span>
                    </div>
                    <div className="flex items-start gap-2 text-neutral-700">
                      <Check size={16} className="text-[#0000fb] shrink-0 mt-0.5" />
                      <span>Gemini multimodal viral moment detection</span>
                    </div>
                    <div className="flex items-start gap-2 text-neutral-700">
                      <Check size={16} className="text-[#0000fb] shrink-0 mt-0.5" />
                      <span>Auto-publish to TikTok, Reels & YouTube Shorts</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* View: UGC Gallery */}
          {activeTab === 'ugc-gallery' && (
            <div className="h-full overflow-y-auto custom-scrollbar animate-fade">
              <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
                <UGCGallery />
              </div>
            </div>
          )}

          {/* View: Autopilot */}
          {activeTab === 'autopilot' && (
            <div className="h-full overflow-y-auto custom-scrollbar animate-fade">
              <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
                {isSignedIn ? (
                  <AutopilotTab
                    onOpenProject={restoreProject}
                    onUpgrade={() => (isManaged ? openUpsell({ source: 'autopilot' }) : setShowPlanChoice(true))}
                    justConnected={autopilotConnected}
                  />
                ) : (
                  <div className="max-w-2xl mx-auto card p-8 text-center">
                    <Rocket size={28} className="mx-auto mb-4 text-[#0000fb]" />
                    <h1 className="font-display font-bold text-2xl text-neutral-900 mb-2">Your Channel, Clipped Automatically</h1>
                    <p className="text-muted text-sm mb-6">
                      Connect your YouTube channel and every new video turns into shorts automatically.
                      Sign in to set it up.
                    </p>
                    <button onClick={() => setShowLogin(true)} className="btn-primary">Sign In</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View: History */}
          {activeTab === 'history' && (
            <div className="h-full overflow-y-auto custom-scrollbar animate-fade">
              <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
                {billingEnabled && !isSignedIn ? (
                  <div className="max-w-2xl mx-auto card p-8 text-center">
                    <History size={28} className="mx-auto mb-4 text-[#0000fb]" />
                    <h1 className="font-display font-bold text-2xl text-neutral-900 mb-2">Your Clips Saved To Your Account</h1>
                    <p className="text-muted text-sm mb-6">
                      Sign in with the email address you used to create them and they open right here.
                    </p>
                    <button onClick={() => setShowLogin(true)} className="btn-primary">Sign In</button>
                  </div>
                ) : (
                  <HistoryTab onReopenProject={restoreProject} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'thumbnails' && (
            <ThumbnailStudio
              geminiApiKey={apiKey}
              uploadPostKey={uploadPostKey}
              uploadUserId={uploadUserId}
              managed={isManaged}
              onCreateClips={(sessionId) => {
                setActiveTab('dashboard');
                // The Studio source is the user's own upload, published to their
                // own channel; the handover carries that same attestation.
                handleProcess({ type: 'thumbnail_session', payload: sessionId, acknowledged: true });
              }}
            />
          )}

          {/* View: Gallery */}
          {/* {activeTab === 'gallery' && (
            <Gallery />
          )} */}

          {/* View: Dashboard (Idle) */}
          {activeTab === 'dashboard' && status === 'idle' && (
            <div className="h-full overflow-y-auto custom-scrollbar animate-fade relative bg-paper">
              <div className="absolute inset-0 bg-dot-grid mask-radial-fade pointer-events-none" aria-hidden="true" />
              <div className="min-h-full flex flex-col items-center justify-center px-4 py-5 sm:p-6 relative z-10">
              {/* On a phone the hero used to fill the fold on its own and push
                  the uploader — the whole point of the screen — below it. The
                  eyebrow, the display size and the gaps all shrink first. */}
              <div className="max-w-2xl w-full text-center">
                {/* Header Block with Proportional Apple Hierarchy & Vertical Rhythm */}
                <div className="mb-6 sm:mb-8">
                  <BlurReveal delay={0.04} duration={0.6}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-xs font-medium text-neutral-600 mb-3.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0000fb]"></span>
                      <span>AI Clip Generator</span>
                    </div>
                  </BlurReveal>

                  <BlurReveal delay={0.12} duration={0.75} yOffset={14}>
                    <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#1d1d1f] tracking-tight leading-tight">
                      Smart AI Clipping for Creators
                    </h1>
                  </BlurReveal>

                  <BlurReveal delay={0.22} duration={0.7} yOffset={10}>
                    <p className="text-neutral-500 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mt-2.5 font-normal">
                      Drop your podcast, stream, or video below to automatically extract 4 viral moments with AI.
                    </p>
                  </BlurReveal>
                </div>

                <MediaInput onProcess={handleProcess} isProcessing={status === 'processing'} />
              </div>
              </div>
            </div>
          )}

          {/* View: Clip Results - 4 across, 2 rows down (8 clips in 1 screen) */}
          {activeTab === 'dashboard' && status === 'complete' && (
            <div className="h-full overflow-hidden flex flex-col p-3 sm:p-4 lg:p-5 animate-fade">
              <div className="w-full max-w-[1720px] mx-auto flex flex-col h-full space-y-2 sm:space-y-2.5">

                {/* Header Row: Clip Results + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                      Clip Results
                    </h1>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Your {displayClips?.length || 4} generated clips are ready. Download, edit, or share them.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-medium transition-colors shadow-2xs"
                      title="Download all clips as a ZIP"
                    >
                      {downloadingAll ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-[#0000fb]" />
                          <span>Zipping...</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Download All (ZIP)</span>
                        </>
                      )}
                    </button>

                    {results?.clips?.length > 1 && (
                      <button
                        onClick={() => setShowScheduleWeek(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-medium transition-colors shadow-2xs"
                      >
                        <Calendar size={13} />
                        <span>Schedule Week</span>
                      </button>
                    )}

                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 bg-[#0000fb] hover:bg-[#0000d6] text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-all"
                    >
                      <Plus size={14} />
                      <span>Generate New Clip</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Sort Pills Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        filterStatus === 'all'
                          ? 'bg-[#0000fb] text-white shadow-sm'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                      }`}
                    >
                      <span>All Clips</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        filterStatus === 'all' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {Math.min(8, rankedClips.length)}
                      </span>
                    </button>

                    <button
                      onClick={() => setFilterStatus('completed')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        filterStatus === 'completed'
                          ? 'bg-[#0000fb] text-white shadow-sm'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                      }`}
                    >
                      <span>Completed</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        filterStatus === 'completed' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {Math.min(8, rankedClips.length)}
                      </span>
                    </button>

                    <button
                      onClick={() => setFilterStatus('processing')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        filterStatus === 'processing'
                          ? 'bg-[#0000fb] text-white shadow-sm'
                          : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      <span>Processing</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-100 text-neutral-500">0</span>
                    </button>

                    <button
                      onClick={() => setFilterStatus('failed')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        filterStatus === 'failed'
                          ? 'bg-[#0000fb] text-white shadow-sm'
                          : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      <span>Failed</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-100 text-neutral-500">0</span>
                    </button>

                    {/* Source Video & Logs Inspector Toggle */}
                    <button
                      onClick={() => setShowSourceModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-neutral-200 text-neutral-600 hover:text-[#0000fb] hover:border-[#0000fb]/40 transition-colors ml-auto sm:ml-2"
                      title="Inspect original source video and system processing logs"
                    >
                      <Terminal size={12} className="text-[#0000fb]" />
                      <span>Source & Logs</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                      <Calendar size={12} className="text-neutral-500" />
                      <span>Last 7 days</span>
                      <ChevronDown size={12} className="text-neutral-400" />
                    </button>

                    <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                      <span>Sort by: Newest</span>
                      <ChevronDown size={12} className="text-neutral-400" />
                    </button>
                  </div>
                </div>

                {/* Notifications & Nudges */}
                <div className="space-y-1.5">
                  {partialJob && !partialJob.chosen && (
                    <button
                      onClick={() => openUpsell({ source: 'partial_banner', partialJob })}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white border border-[#0000fb]/30 hover:border-[#0000fb] text-xs transition-colors shadow-2xs"
                    >
                      <span className="text-neutral-900">These clips come from the first {partialJob.processed_minutes} of {partialJob.total_minutes} minutes.</span>{' '}
                      <span className="text-[#0000fb] font-semibold">Clip the whole video →</span>
                    </button>
                  )}
                </div>

                {/* 4 across grid - adapts to 1 row for 4 clips or 2 rows for 8 clips */}
                <div className={`flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${displayClips.length > 4 ? 'lg:grid-rows-2' : ''} gap-2.5 sm:gap-3 overflow-y-auto lg:overflow-hidden pb-1`}>
                  {displayClips.slice(0, 8).map(({ clip, index: i }) => (
                    <ResultCard
                      key={`${jobId}-${i}-${clip.video_url || ''}`}
                      clip={clip}
                      index={i}
                      jobId={jobId}
                      onEditClip={(index) => setEditingClip(index)}
                      onReframeClip={(index) => setReframingClip(index)}
                      onModeChanged={handleClipRerendered}
                      onUpgrade={isManaged ? openUpsell : null}
                      initialState={projectState?.clips?.find((c) => c.index === i) || null}
                      onStateChange={handleClipStateChange}
                      durable={durableClips[i]}
                      uploadPostKey={uploadPostKey}
                      uploadUserId={uploadUserId}
                      geminiApiKey={apiKey}
                      elevenLabsKey={elevenLabsKey}
                      isManaged={isManaged}
                      connectedPlatforms={(userProfiles.find((p) => p.username === uploadUserId) || userProfiles[0])?.connected ?? null}
                      onConnectSocials={isManaged ? handleConnectSocials : null}
                      onPlay={(time) => handleClipPlay(time)}
                      onPause={handleClipPause}
                      onBulkSubtitle={handleBulkSubtitles}
                      clipCount={results.clips.length}
                      bulkProgress={bulkSub}
                    />
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* View: Processing / Error State */}
          {activeTab === 'dashboard' && (status === 'processing' || status === 'error') && (
            <div className="h-full overflow-y-auto custom-scrollbar p-3 sm:p-6 animate-fade">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="card p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                      <Activity className={`text-[#0000fb] ${status === 'processing' ? 'animate-pulse' : ''}`} size={18} />
                      Live Analysis
                    </h2>
                    <span className={status === 'processing' ? 'badge-warn' : 'badge-danger'}>
                      {status.toUpperCase()}
                    </span>
                  </div>

                  {status === 'processing' && partialJob && !partialJob.chosen && plan === 'free' && isManaged && (
                    <button
                      onClick={() => openUpsell({ source: 'partial_processing', partialJob })}
                      className="mb-4 w-full text-left rounded-xl border border-[#0000fb]/30 bg-[#0000fb]/5 px-4 py-3 text-sm hover:border-[#0000fb] transition-colors"
                    >
                      <span className="text-neutral-900">Clipping the first {partialJob.processed_minutes} of {partialJob.total_minutes} minutes with your free minutes.</span>{' '}
                      <span className="text-[#0000fb] font-medium">Clip the whole video →</span>
                    </button>
                  )}

                  {status === 'processing' && queueInfo && (
                    <div className="rounded-xl border border-[#0000fb]/30 bg-[#0000fb]/5 px-4 py-3 text-sm">
                      <p className="text-neutral-900">
                        {queueInfo.ahead === 0
                          ? 'You are next in line. Starting in a moment…'
                          : <>You are <b>#{queueInfo.position}</b> in line · {queueInfo.eta_is_minimum ? 'at least' : 'about'} <b>{Math.max(1, Math.round(queueInfo.eta_seconds / 60))} min</b></>}
                      </p>
                      {queueSlow ? (
                        <>
                          <p className="mt-1 text-neutral-500">
                            High demand right now: free videos wait behind paid ones and this can take hours.
                            We are adding capacity.
                          </p>
                          <button
                            onClick={() => { track('QueueUpsellClick', { props: { position: String(queueInfo.position), slow: '1' } }); if (isManaged) openUpsell({ source: 'queue' }); else setShowPlanChoice(true); }}
                            className="btn-primary mt-3"
                          >
                            Skip the line with a plan
                          </button>
                        </>
                      ) : billingEnabled && !['starter', 'creator', 'pro'].includes(plan) && queueInfo.ahead > 0 && (
                        <button
                          onClick={() => { track('QueueUpsellClick', { props: { position: String(queueInfo.position) } }); if (isManaged) openUpsell({ source: 'queue' }); else setShowPlanChoice(true); }}
                          className="mt-2 text-xs text-[#0000fb] hover:underline"
                        >
                          paid plans skip the line →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Video Preview */}
                  {processingMedia && (
                    <ProcessingAnimation
                      media={processingMedia}
                      isComplete={false}
                      syncedTime={syncedTime}
                      isSyncedPlaying={isSyncedPlaying}
                      syncTrigger={syncTrigger}
                    />
                  )}

                  {/* Phones only */}
                  {status === 'processing' && (
                    <div className="sm:hidden mb-3 flex items-start gap-2 text-xs text-neutral-700 min-w-0">
                      <Loader2 size={14} className="animate-spin text-[#0000fb] shrink-0 mt-px" />
                      <span className="min-w-0 leading-snug break-words">
                        {logs.length ? logs[logs.length - 1] : 'starting up…'}
                      </span>
                    </div>
                  )}

                  {/* Star banner */}
                  {status === 'processing' && (
                    <div className="my-2">
                      <StarBanner message="Got a minute while this renders?" />
                    </div>
                  )}

                  {/* Logs Terminal */}
                  <div className="bg-neutral-900 text-neutral-200 rounded-xl overflow-hidden flex flex-col">
                    <button
                      type="button"
                      onClick={() => setLogsVisible(!logsVisible)}
                      aria-expanded={logsVisible}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-2 bg-neutral-800 text-left text-xs font-mono"
                    >
                      <span className="flex items-center gap-2 text-white">
                        <Terminal size={13} className="text-[#0000fb]" /> System Logs
                      </span>
                      <span className="flex items-center gap-2 text-neutral-400">
                        {logs.length > 0 && <span>{logs.length} lines</span>}
                        <ChevronDown size={14} className={logsVisible ? '' : 'rotate-180'} />
                      </span>
                    </button>
                    {logsVisible && (
                      <div className="p-4 max-h-48 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar text-neutral-300 break-words">
                        {logs.map((log, i) => (
                          <div key={i} className={`flex gap-2 ${log.toLowerCase().includes('error') ? 'text-red-400' : 'text-neutral-300'}`}>
                            <span className="text-neutral-500 shrink-0 hidden sm:inline tabular-nums">
                              {logTimes[i] ? new Date(logTimes[i] * 1000).toLocaleTimeString() : ''}
                            </span>
                            <span className="min-w-0 break-words">{log}</span>
                          </div>
                        ))}
                        {status === 'processing' && (
                          <div className="animate-pulse text-[#0000fb]">_</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Phone navigation. A flex sibling of the scrolling pane, not a fixed
            overlay, so content is never trapped behind it. */}
        <MobileTabBar />

      </main>

      {/* Missing API Key Modal */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        eyebrow="SETUP"
        title="Gemini API Key Required"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowKeyModal(false)}
              className="btn-ghost flex-1 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => { setShowKeyModal(false); goToTab('settings'); }}
              className="btn-primary flex-1 px-4 py-2 text-sm"
            >
              Go to Settings
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            OpenShorts needs both a <strong className="text-ink2">Gemini</strong> API key and an <strong className="text-ink2">Upload-Post</strong> API key. Both have free tiers.
          </p>

          {/* Gemini block */}
          <div className={`rounded-input p-4 space-y-2 border ${!apiKey ? 'border-rule2' : 'border-rule opacity-70'}`}>
            <p className="text-xs font-medium text-ink flex items-center gap-2">
              {apiKey ? <Check size={12} className="text-ok" /> : <AlertTriangle size={12} className="text-warn" />}
              Gemini API Key {apiKey && <span className="text-ok">— set</span>}
            </p>
            {!apiKey && (
              <>
                <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brass underline">aistudio.google.com/app/apikey</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Create API Key"</li>
                  <li>Copy the key and paste it below</li>
                </ol>
                <input
                  type="text"
                  placeholder="Paste your Gemini API key here..."
                  className="input-field"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setApiKey(e.target.value.trim());
                    }
                  }}
                />
              </>
            )}
          </div>

          {/* Upload-Post block */}
          <div className={`rounded-input p-4 space-y-2 border ${!uploadPostKey ? 'border-rule2' : 'border-rule opacity-70'}`}>
            <p className="text-xs font-medium text-ink flex items-center gap-2">
              {uploadPostKey ? <Check size={12} className="text-ok" /> : <AlertTriangle size={12} className="text-warn" />}
              Upload-Post API Key {uploadPostKey && <span className="text-ok">— set</span>}
            </p>
            {!uploadPostKey && (
              <>
                <p className="text-xs text-muted">
                  Required to publish your clips to TikTok, Instagram Reels, and YouTube Shorts. Free tier available, no credit card needed.
                </p>
                <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
                  <li>Register at <a href="https://app.upload-post.com/login" target="_blank" rel="noopener noreferrer" className="text-brass underline">app.upload-post.com</a></li>
                  <li>Connect your TikTok, Instagram, or YouTube accounts</li>
                  <li>Go to <a href="https://app.upload-post.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-brass underline">API Keys</a> and generate one</li>
                  <li>Paste it below</li>
                </ol>
                <input
                  type="text"
                  placeholder="Paste your Upload-Post API key here..."
                  className="input-field"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setUploadPostKey(e.target.value.trim());
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      </Modal>

      <ScheduleWeekModal
        isOpen={showScheduleWeek}
        onClose={() => setShowScheduleWeek(false)}
        clips={results?.clips || []}
        jobId={jobId}
        uploadPostKey={uploadPostKey}
        uploadUserId={uploadUserId}
        isManaged={isManaged}
      />

      {/* Pre-flight quality gate */}
      {qualityGate && (
        <Modal isOpen={true} onClose={() => setQualityGate(null)} size="md" eyebrow="HEADS UP" title="low source quality">
          <div className="space-y-4">
            <p className="text-sm text-ink2">
              YouTube only offers <span className="text-brass font-semibold">{qualityGate.info.max_height}p</span> for this video
              (below the {qualityGate.info.min_height}p we recommend). Processing anyway will produce lower-quality clips.
            </p>
            {qualityGate.info.cookies_invalid && (
              <p className="text-xs text-muted">
                Your YouTube cookies look expired — refreshing them (export again from an incognito window) often unlocks HD.
              </p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setQualityGate(null)} className="btn-ghost">cancel</button>
              <button
                onClick={() => { const d = qualityGate.data; setQualityGate(null); handleProcess(d, true); }}
                className="btn-primary"
              >
                process anyway
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Source Video & Logs Inspector Modal */}
      {showSourceModal && (
        <Modal
          isOpen={showSourceModal}
          onClose={() => setShowSourceModal(false)}
          eyebrow="INSPECTOR"
          title="Source Video & Logs"
          size="lg"
        >
          <div className="space-y-4">
            {processingMedia && (
              <div className="rounded-xl overflow-hidden border border-neutral-200">
                <ProcessingAnimation
                  media={processingMedia}
                  isComplete={true}
                  syncedTime={syncedTime}
                  isSyncedPlaying={isSyncedPlaying}
                  syncTrigger={syncTrigger}
                />
              </div>
            )}

            <div className="bg-neutral-900 text-neutral-200 rounded-xl overflow-hidden flex flex-col">
              <div className="w-full px-4 py-2.5 flex items-center justify-between gap-2 bg-neutral-800 text-left text-xs font-mono">
                <span className="flex items-center gap-2 text-white">
                  <Terminal size={13} className="text-[#0000fb]" /> System Logs
                </span>
                <span className="text-neutral-400 text-xs">{logs.length} lines</span>
              </div>
              <div className="p-4 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar text-neutral-300 break-words">
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${log.toLowerCase().includes('error') ? 'text-red-400' : 'text-neutral-300'}`}>
                    <span className="text-neutral-500 shrink-0 hidden sm:inline tabular-nums">
                      {logTimes[i] ? new Date(logTimes[i] * 1000).toLocaleTimeString() : ''}
                    </span>
                    <span className="min-w-0 break-words">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editingClip !== null && results?.clips?.[editingClip] && (
        <ClipEditor
          jobId={jobId}
          clipIndex={editingClip}
          clipTitle={results.clips[editingClip].video_title_for_youtube_short || ''}
          onClose={() => setEditingClip(null)}
          onRerendered={handleClipRerendered}
        />
      )}
      {reframingClip !== null && results?.clips?.[reframingClip] && (
        <ReframeEditor
          jobId={jobId}
          clipIndex={reframingClip}
          clipTitle={results.clips[reframingClip].video_title_for_youtube_short || ''}
          onClose={() => setReframingClip(null)}
          onReframed={handleClipRerendered}
        />
      )}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} queued={typeof peekPendingJob()?.data?.payload === 'string'} />}
      {showSurvey && <OnboardingSurvey onDone={() => setSurveyDone(true)} />}
      {tutorialPhase && !showSurvey && (
        <ClipTutorial
          phase={tutorialPhase}
          jobStatus={status}
          errorText={jobError}
          onStart={startTutorial}
          onSkip={skipTutorial}
          onDismissCelebrate={finishTutorial}
        />
      )}
      {showPlanChoice && <PlanChoiceModal onClose={() => setShowPlanChoice(false)} />}
      {showWmNotice && (
        <WatermarkModal
          source="results"
          jobId={jobId}
          previewSrc={results?.clips?.[0]?.video_url ? getApiUrl(results.clips[0].video_url) : null}
          onUpgrade={openUpsell}
          onClose={() => setShowWmNotice(false)}
        />
      )}
      {showTopUp && (
        <TopUpModal
          onClose={() => setShowTopUp(false)}
          required={topUpInfo.required}
          remaining={topUpInfo.remaining}
          partialMinutes={topUpInfo.partialMinutes}
          onPartial={topUpInfo.onPartial}
          context={topUpInfo.context || 'wall'}
          source={topUpInfo.source}
          highlight={topUpInfo.highlight}
          partialJob={topUpInfo.partialJob}
        />
      )}
      {showTrialUpgrade && (
        <TrialUpgradeModal
          plan={plan}
          onActivated={refreshMe}
          onClose={() => setShowTrialUpgrade(false)}
        />
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { Download, Share2, AlertCircle, Loader2, Copy, Check, Wand2, Type, Calendar, Languages, FileText, Link2, Scissors, Crosshair, TrendingUp, Sparkles, Play, Pause, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { getApiUrl } from '../config';
import { apiFetch, QuotaError, openQuotaWall } from '../lib/api';
import { platformOptions as buildPlatformOptions, defaultPlatformFlags, flagsFromList } from '../lib/socialPlatforms';
import { track } from '../lib/analytics';
import SubtitleModal from './SubtitleModal';
import HookModal from './HookModal';
import TranslateModal from './TranslateModal';
import Modal from './ui/Modal';
import SegmentedControl from './ui/SegmentedControl';
import WatermarkModal, { watermarkNoticeDismissed } from './WatermarkModal';
import TikTokDraftNotice from './TikTokDraftNotice';
import { useAuth } from '../contexts/AuthContext';
import { renderInBrowser } from '../lib/renderInBrowser';

const QUIET_BTN = 'group flex flex-col items-center justify-center gap-1.5 py-2.5 sm:py-2 px-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 text-[11px] font-medium text-neutral-800 whitespace-nowrap transition-colors disabled:opacity-45 disabled:cursor-not-allowed';

// Follow an async post (request_id from /api/social/post) for about a minute.
// Returns {done, failed}: done once every platform finished, failed lists
// "platform: reason" for the ones that did not. Unknown or slow = neither.
const POST_TERMINAL = new Set(['completed', 'failed', 'not_found']);
async function followPost(requestId, tries = 12, everyMs = 5000) {
    for (let i = 0; i < tries; i++) {
        await new Promise((r) => setTimeout(r, everyMs));
        let d;
        try {
            const r = await apiFetch(`/api/social/post-status/${encodeURIComponent(requestId)}`);
            if (!r.ok) continue;
            d = await r.json();
        } catch {
            continue;
        }
        if (d.status === 'unknown') return { done: false, failed: [] };
        if (!POST_TERMINAL.has(d.status)) continue;
        const failed = (d.results || [])
            .filter((x) => x.success === false)
            .map((x) => `${x.platform}${x.message ? `: ${x.message}` : ''}`);
        if (d.status !== 'completed' && !failed.length) failed.push('every platform');
        return { done: d.status === 'completed', failed };
    }
    return { done: false, failed: [] };
}

const PLATFORM_OPTIONS = buildPlatformOptions({ lower: true });

function clipDurationSeconds(clip) {
    // A recut clip's start/end are the covering source range (segments may be
    // non-contiguous or reordered); its real duration is the segment sum.
    const segments = clip.recipe?.segments;
    if (segments?.length) {
        return segments.reduce((acc, s) => acc + (s.end - s.start), 0);
    }
    return clip.end && clip.start ? clip.end - clip.start : NaN;
}

function formatDuration(clip) {
    const secs = Math.floor(clipDurationSeconds(clip));
    if (!Number.isFinite(secs) || secs < 0) return null;
    return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

export default function ResultCard({ clip, index, jobId, durable, uploadPostKey, uploadUserId, geminiApiKey, elevenLabsKey, isManaged, onPlay, onPause, onBulkSubtitle, clipCount = 1, bulkProgress, initialState = null, onStateChange, connectedPlatforms = null, onConnectSocials, onEditClip = null, onReframeClip = null, onModeChanged = null, onUpgrade = null }) {
    const [showModal, setShowModal] = useState(false);
    // The "why" line is clamped to two lines so cards in a row stay level;
    // when it overflows, a hover (desktop) or tap (touch) shows the whole
    // sentence in a popover that floats over the card instead of growing it.
    const whyRef = useRef(null);
    const [whyOpen, setWhyOpen] = useState(false);
    const [whyClamped, setWhyClamped] = useState(false);
    useEffect(() => {
        const el = whyRef.current;
        if (!el) return;
        const check = () => setWhyClamped(el.scrollHeight > el.clientHeight + 1);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, [clip.why]);
    const [showDescModal, setShowDescModal] = useState(false);
    const [showSubtitleModal, setShowSubtitleModal] = useState(false);
    const [showWatermarkModal, setShowWatermarkModal] = useState(false);
    const [showTools, setShowTools] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
            if (onPause) onPause();
        } else {
            videoRef.current.play();
            setIsPlaying(true);
            if (onPlay) onPlay(clip.start + (videoRef.current.currentTime || 0));
        }
    };
    const { plan } = useAuth();
    const videoRef = React.useRef(null);
    // Pristine base clip (no burned subtitles/hook), stable regardless of how
    // clip.video_url mutates after server edits. Used as the compositing base
    // for the Remotion preview so it never stacks subtitles over an already-
    // subtitled file (double-subtitle bug).
    const stripBurns = (filename) => {
        let f = filename || '', prev;
        do { prev = f; f = f.replace(/^subtitled_\d+_/, '').replace(/^hooked_\d+_/, '').replace(/^hook_/, ''); } while (f !== prev);
        return f;
    };
    const originalVideoUrl = getApiUrl((clip.video_url || '').replace(/[^/]+$/, stripBurns((clip.video_url || '').split('/').pop())));
    const [currentVideoUrl, setCurrentVideoUrl] = useState(getApiUrl(clip.video_url));
    // Where the <video> element pulls its bytes from. The clips are archived to
    // R2 anyway, and R2 egress is free and edge-served, while /videos is served
    // by the same single-worker API process that is running the renders. So play
    // from R2 when possible.
    //
    // ONLY when R2 holds exactly the file the server considers current for this
    // clip (durable.filename === serverVideoFile). Every server-side edit sends
    // input_filename: serverVideoFile and rewrites clip.video_url, but the R2
    // re-archive behind it is fire-and-forget, so for a few seconds the durable
    // copy is the PRE-edit clip. Preferring it blindly would silently show the
    // clip without the subtitles/hook the user just burned.
    //
    // This is display-only: currentVideoUrl remains the source of truth for the
    // download button and for every server operation, so no edit can be routed
    // to the wrong file by this.
    const [durableSrc, setDurableSrc] = useState(null);
    const [durableFailed, setDurableFailed] = useState(false);
    // Switching src reloads the element and restarts playback, so the durable copy
    // is only ever adopted before the user has touched this player. After an edit
    // the chase in App.jsx can land while they are watching the result, and losing
    // their position to save a few seconds of buffering is a bad trade.
    const [hasPlayed, setHasPlayed] = useState(false);

    // A delivered clip is tens of MB, and on a slow link the old silent
    // fetch-then-save took minutes with nothing on screen, which reads as a dead
    // button. Stream it instead and report progress.
    const [downloadPct, setDownloadPct] = useState(null);

    // Where a download pulls its bytes from: the archived copy when storage
    // holds exactly this file (the API is one busy process, and a clip through
    // it was slow), else the API as before. A preview rendered in this tab
    // (blob:) and anything the server does not vouch for stay as they were.
    const downloadSource = async () => {
        const local = String(currentVideoUrl || '');
        const match = /\/videos\/[^/]+\/([^/?#]+)/.exec(local);
        if (!isManaged || !jobId || local.startsWith('blob:') || !match) return null;
        try {
            const res = await apiFetch(
                `/api/media-url?job_id=${encodeURIComponent(jobId)}&filename=${encodeURIComponent(decodeURIComponent(match[1]))}`);
            if (!res.ok) return null;
            return (await res.json()).url || null;
        } catch {
            return null;
        }
    };

    const downloadClip = async () => {
        try {
            setDownloadPct(0);
            let response = null;
            const archived = await downloadSource();
            if (archived) {
                try {
                    response = await fetch(archived);
                    if (!response.ok) response = null;
                } catch {
                    response = null;
                }
            }
            if (!response) response = await fetch(currentVideoUrl);
            if (!response.ok) throw new Error('Download failed');
            const total = Number(response.headers.get('content-length')) || 0;
            let blob;
            // No body reader (old browser) or no length to measure against: fall
            // back to the plain path rather than lose the download.
            if (!response.body || !total) {
                blob = await response.blob();
            } else {
                const reader = response.body.getReader();
                const chunks = [];
                let received = 0;
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    received += value.length;
                    setDownloadPct(Math.min(99, Math.round((received / total) * 100)));
                }
                blob = new Blob(chunks, { type: 'video/mp4' });
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `clip-${index + 1}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            track('ClipDownloaded', { props: {
                surface: 'results', clip_index: index, clips: clipCount,
                score: Number.isFinite(clip.predicted_score) ? clip.predicted_score : undefined } });
        } catch (err) {
            console.error('Download error:', err);
            window.open(currentVideoUrl, '_blank');
        } finally {
            setDownloadPct(null);
        }
    };
    // Latest file that exists ON THE SERVER (blob: previews don't count).
    // All server-side operations must chain from this, so burned-in edits
    // (subtitles, hooks, effects) never get silently dropped.
    // A reopened project seeds it from the persisted project state.
    const [serverVideoFile, setServerVideoFile] = useState(initialState?.server_file || (clip.video_url || '').split('/').pop());
    const [videoErrored, setVideoErrored] = useState(false);
    const [resolution, setResolution] = useState(null);

    // Adopt the durable copy only while it matches the current server file, and
    // pin the first signed URL seen for that file: /api/history mints a fresh
    // signature on every call, and swapping src mid-playback restarts the video.
    useEffect(() => {
        if (durable?.url && durable.filename && durable.filename === serverVideoFile && !hasPlayed) {
            setDurableSrc((prev) => prev || durable.url);
        } else {
            setDurableSrc(null);
        }
    }, [durable?.url, durable?.filename, serverVideoFile, hasPlayed]);

    // If the local video failed and a durable R2 URL is (now) available, use it.
    // Handles the race where the video errors before the durable URL has loaded.
    // Deliberately NOT version-gated: reaching here means the local file is gone
    // (retention sweep after a reload), so an older durable copy still beats a
    // broken player.
    useEffect(() => {
        if (videoErrored && durable?.url && currentVideoUrl !== durable.url) {
            setCurrentVideoUrl(durable.url);
            setVideoErrored(false);
        }
    }, [videoErrored, durable, currentVideoUrl]);

    // When an external refresh changes this clip's server file (e.g. bulk
    // subtitles applied from another card), adopt it so the card shows the
    // freshly subtitled video instead of a stale one.
    useEffect(() => {
        const serverUrl = getApiUrl(clip.video_url);
        const serverName = (clip.video_url || '').split('/').pop();
        if (serverName && serverName !== serverVideoFile) {
            setServerVideoFile(serverName);
            setCurrentVideoUrl(serverUrl);
            setDurableFailed(false);
            setHasPlayed(false);
            if (videoRef.current) videoRef.current.load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clip.video_url]);

    const [platforms, setPlatforms] = useState(defaultPlatformFlags);
    const [postTitle, setPostTitle] = useState("");
    const [postDescription, setPostDescription] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");

    const [posting, setPosting] = useState(false);
    const [postResult, setPostResult] = useState(null);
    const [copied, setCopied] = useState(null);

    const handleCopy = async (field, text) => {
        try {
            await navigator.clipboard.writeText(text || '');
            setCopied(field);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            // clipboard unavailable — silent
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [isSubtitling, setIsSubtitling] = useState(false);
    const [isHooking, setIsHooking] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showHookModal, setShowHookModal] = useState(false);
    const [showTranslateModal, setShowTranslateModal] = useState(false);
    const [editError, setEditError] = useState(null);

    // Pro mode: the talking-head re-edit (tighter frame on the face, dead air
    // cut, graded picture). The server renders a new file both ways, so the
    // card remounts from it exactly like after a recut.
    const isPro = clip.mode === 'pro';
    const [isSwitchingMode, setIsSwitchingMode] = useState(false);
    // Pro mode frames a face in a vertical clip: on a horizontal or square
    // one the server refuses, so the switch is not offered there. Unknown
    // until the video's metadata loads, and offered meanwhile.
    const [isUpright, setIsUpright] = useState(true);
    const canSwitchMode = Boolean(onModeChanged) && (isUpright || isPro);
    const handleMode = async () => {
        setIsSwitchingMode(true);
        setEditError(null);
        try {
            const res = await apiFetch('/api/clip/mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    mode: isPro ? 'normal' : 'pro',
                    input_filename: serverVideoFile,
                }),
            });
            if (!res.ok) {
                let detail = '';
                try { detail = (await res.json()).detail; } catch { /* not JSON */ }
                throw new Error(typeof detail === 'string' && detail ? detail : 'Could not switch the clip mode.');
            }
            const data = await res.json();
            track('ClipModeSwitched', { props: { mode: data.mode } });
            if (onModeChanged && data.new_video_url) onModeChanged(index, data);
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 6000);
        } finally {
            setIsSwitchingMode(false);
        }
    };

    const [clipDuration, setClipDuration] = useState(() => {
        const secs = clipDurationSeconds(clip);
        return Number.isFinite(secs) ? secs : 30;
    });

    // Accumulate Remotion layers across operations. A reopened project restores
    // the layers persisted in its project state, so the next edit composes over
    // them instead of silently dropping previous browser-side work.
    const [activeLayers, setActiveLayers] = useState(initialState?.active_layers || { subtitles: null, hook: null, effects: null });

    // Report edit state upward (debounced sync to the project record). Skip the
    // mount run: only user-driven changes are worth persisting.
    const stateReported = React.useRef(false);
    useEffect(() => {
        if (!stateReported.current) { stateReported.current = true; return; }
        onStateChange?.(index, { activeLayers, serverVideoFile });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeLayers, serverVideoFile]);

    // True when the current server file already carries burned-in content.
    // Browser (Remotion) renders compose over the ORIGINAL clip, so using them
    // here would silently drop those burns — chain via server FFmpeg instead.
    const hasServerBurns = /(^|_)(subtitled|hook|hooked)_/.test(serverVideoFile || '');

    // The hook currently burned into the server file (auto-hook or a manual
    // one). /api/hook REPLACES it; tracked locally so the modal stays honest
    // after edits without refetching the job.
    const [burnedHook, setBurnedHook] = useState(clip.auto_hook?.text || null);

    // Fetch clip duration from transcript endpoint
    useEffect(() => {
        if (!jobId || index === undefined) return;
        apiFetch(`/api/clip/${jobId}/${index}/transcript`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.durationSec) setClipDuration(data.durationSec);
            })
            .catch(() => {});
    }, [jobId, index]);

    // Which platforms the selected profile actually has linked. `null` means
    // unknown (profile list not loaded) — in that case nothing is gated.
    const knownConnections = Array.isArray(connectedPlatforms);
    const noAccountsConnected = knownConnections && connectedPlatforms.length === 0;
    const platformOptions = knownConnections
        ? PLATFORM_OPTIONS.map((o) => (connectedPlatforms.includes(o.value) ? o : { ...o, disabled: true, hint: 'not connected' }))
        : PLATFORM_OPTIONS;

    const handleConnectAccounts = () => {
        setShowModal(false);
        if (onConnectSocials) onConnectSocials();
        else window.open('https://app.upload-post.com', '_blank', 'noopener');
    };

    // Initialize/Reset form when modal opens
    useEffect(() => {
        if (showModal) {
            setPostTitle(clip.video_title_for_youtube_short || "Viral Short");
            setPostDescription(clip.video_description_for_instagram || clip.video_description_for_tiktok || "");
            setIsScheduling(false);
            setScheduleDate("");
            setPostResult(null);
            // Only preselect platforms the profile can actually publish to.
            if (knownConnections) {
                setPlatforms(flagsFromList(connectedPlatforms));
            }
        }
        // Reset only when the modal opens for a clip; connection changes while
        // it is open must not wipe the user's selection.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showModal, clip]);

    const handleAutoEdit = async () => {
        setIsEditing(true);
        setEditError(null);
        try {
            const apiKey = geminiApiKey || localStorage.getItem('gemini_key');

            // Managed (paid) users get the Gemini key resolved server-side;
            // only BYOK/self-host needs a local key.
            if (!apiKey && !isManaged) {
                throw new Error("Gemini API Key is missing. Please set it in Settings.");
            }
            const geminiHeaders = apiKey ? { 'X-Gemini-Key': apiKey } : {};

            // Try Remotion effects endpoint first
            const effectsRes = hasServerBurns ? null : await apiFetch('/api/effects/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...geminiHeaders
                },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    input_filename: serverVideoFile
                })
            });

            if (effectsRes && effectsRes.ok) {
                const data = await effectsRes.json();
                if (data.effects && data.effects.segments) {
                    const newLayers = { ...activeLayers, effects: data.effects };
                    setActiveLayers(newLayers);
                    const blobUrl = await renderInBrowser({
                        videoUrl: originalVideoUrl,
                        durationInSeconds: clipDuration,
                        subtitles: newLayers.subtitles,
                        hook: newLayers.hook,
                        effects: newLayers.effects,
                    });
                    setCurrentVideoUrl(blobUrl);
                    if (videoRef.current) videoRef.current.load();
                    return;
                }
            }

            // Fallback: legacy FFmpeg edit endpoint
            const res = await apiFetch('/api/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...geminiHeaders
                },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    input_filename: serverVideoFile
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                try {
                    const jsonErr = JSON.parse(errText);
                    throw new Error(jsonErr.detail || errText);
                } catch (e) {
                    throw new Error(errText);
                }
            }

            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getApiUrl(data.new_video_url));
                setServerVideoFile(data.new_video_url.split('/').pop());
                if (videoRef.current) {
                    videoRef.current.load();
                }
            }

        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsEditing(false);
        }
    };

    // Clips are captioned by default, so "no captions" has to be reachable.
    // Nothing is re-encoded: the server still holds the clean file next to the
    // captioned one and just points this clip back at it.
    const handleRemoveSubtitles = async () => {
        setIsSubtitling(true);
        setEditError(null);
        try {
            const res = await apiFetch('/api/subtitle/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId, clip_index: index, input_filename: serverVideoFile,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (data.new_video_url) {
                const serverUrl = getApiUrl(data.new_video_url);
                setServerVideoFile(data.new_video_url.split('/').pop());
                const remaining = { ...activeLayers, subtitles: null };
                setActiveLayers(remaining);
                if (remaining.hook || remaining.effects) {
                    setCurrentVideoUrl(await renderInBrowser({
                        videoUrl: serverUrl,
                        durationInSeconds: clipDuration,
                        subtitles: null,
                        hook: remaining.hook,
                        effects: remaining.effects,
                    }));
                } else {
                    setCurrentVideoUrl(serverUrl);
                }
                if (videoRef.current) videoRef.current.load();
                setShowSubtitleModal(false);
            }
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsSubtitling(false);
        }
    };

    const handleSubtitle = async (options) => {
        setIsSubtitling(true);
        setEditError(null);
        try {
            // Karaoke styles are burned server-side (ASS word-highlight render);
            // the in-browser Remotion path only handles classic styles, and only
            // when the server file has no burned-in content to preserve.
            if (options.remotion && options.style !== 'karaoke' && !hasServerBurns) {
                // Accumulate layer and render all layers together
                const newLayers = { ...activeLayers, subtitles: options.remotion };
                setActiveLayers(newLayers);
                const blobUrl = await renderInBrowser({
                    videoUrl: originalVideoUrl,
                    durationInSeconds: clipDuration,
                    subtitles: newLayers.subtitles,
                    hook: newLayers.hook,
                    effects: newLayers.effects,
                });
                setCurrentVideoUrl(blobUrl);
                if (videoRef.current) videoRef.current.load();
                setShowSubtitleModal(false);
                return;
            }

            // Fallback: legacy FFmpeg
            const res = await apiFetch('/api/subtitle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    position: options.position,
                    font_size: options.fontSize,
                    font_name: options.fontName,
                    font_color: options.fontColor,
                    border_color: options.borderColor,
                    border_width: options.borderWidth,
                    bg_color: options.bgColor,
                    bg_opacity: options.bgOpacity,
                    style: options.style || 'classic',
                    highlight_color: options.highlightColor || '#FFD700',
                    effect: options.effect || 'none',
                    base_opacity: options.baseOpacity ?? 1.0,
                    uppercase: options.uppercase || false,
                    reveal: options.reveal || false,
                    shadow: options.shadow || 0,
                    max_chars: options.maxChars ?? null,
                    max_duration: options.maxDuration ?? null,
                    input_filename: serverVideoFile,
                    // Edited caption text (clip-relative ms); null = server
                    // regenerates from the transcript as before.
                    words: options.captions || null
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (data.new_video_url) {
                const serverUrl = getApiUrl(data.new_video_url);
                setServerVideoFile(data.new_video_url.split('/').pop());
                // Subtitles are burned into the server file now — drop the
                // browser subtitle layer and re-compose any remaining browser
                // layers (hook/effects) over the new file so they aren't lost.
                const remaining = { ...activeLayers, subtitles: null };
                setActiveLayers(remaining);
                if (remaining.hook || remaining.effects) {
                    const blobUrl = await renderInBrowser({
                        videoUrl: serverUrl,
                        durationInSeconds: clipDuration,
                        subtitles: null,
                        hook: remaining.hook,
                        effects: remaining.effects,
                    });
                    setCurrentVideoUrl(blobUrl);
                } else {
                    setCurrentVideoUrl(serverUrl);
                }
                if (videoRef.current) videoRef.current.load();
                setShowSubtitleModal(false);
            }
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsSubtitling(false);
        }
    };

    const handleHook = async (hookData) => {
        setIsHooking(true);
        setEditError(null);
        try {
            if (hookData.remotion && !hasServerBurns) {
                // Accumulate layer and render all layers together
                const newLayers = { ...activeLayers, hook: hookData.remotion };
                setActiveLayers(newLayers);
                const blobUrl = await renderInBrowser({
                    videoUrl: originalVideoUrl,
                    durationInSeconds: clipDuration,
                    subtitles: newLayers.subtitles,
                    hook: newLayers.hook,
                    effects: newLayers.effects,
                });
                setCurrentVideoUrl(blobUrl);
                if (videoRef.current) videoRef.current.load();
                setShowHookModal(false);
                return;
            }

            // Fallback: legacy FFmpeg
            const payload = typeof hookData === 'string'
                ? { text: hookData, position: 'top', size: 'M' }
                : hookData;

            const res = await apiFetch('/api/hook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    text: payload.text,
                    position: payload.position,
                    size: payload.size,
                    style: payload.style || 'pill',
                    font: payload.font || null,
                    duration_seconds: payload.remotion?.displayDurationSec ?? null,
                    input_filename: serverVideoFile
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getApiUrl(data.new_video_url));
                setServerVideoFile(data.new_video_url.split('/').pop());
                setBurnedHook(data.burned_hook?.text ?? payload.text ?? null);
                if (videoRef.current) videoRef.current.load();
                setShowHookModal(false);
            }
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsHooking(false);
        }
    };

    // Strip the burned hook (auto-hook or manual) off the server file.
    const handleRemoveHook = async () => {
        setIsHooking(true);
        setEditError(null);
        try {
            const res = await apiFetch('/api/hook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    remove: true,
                    input_filename: serverVideoFile,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getApiUrl(data.new_video_url));
                setServerVideoFile(data.new_video_url.split('/').pop());
                setBurnedHook(null);
                if (videoRef.current) videoRef.current.load();
                setShowHookModal(false);
            }
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsHooking(false);
        }
    };

    const handleTranslate = async (options) => {
        console.log('[Translate] Starting translation with options:', options);
        setIsTranslating(true);
        setEditError(null);
        try {
            const apiKey = elevenLabsKey;
            console.log('[Translate] API Key available:', !!apiKey);

            if (!apiKey) {
                throw new Error("ElevenLabs API Key is missing. Please set it in Settings.");
            }

            const requestBody = {
                job_id: jobId,
                clip_index: index,
                target_language: options.targetLanguage,
                input_filename: serverVideoFile
            };
            console.log('[Translate] Request body:', requestBody);
            console.log('[Translate] Sending request to /api/translate');

            const res = await apiFetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ElevenLabs-Key': apiKey
                },
                body: JSON.stringify(requestBody)
            });

            console.log('[Translate] Response status:', res.status);

            if (!res.ok) {
                const errText = await res.text();
                console.error('[Translate] Error response:', errText);
                try {
                    const jsonErr = JSON.parse(errText);
                    throw new Error(jsonErr.detail || errText);
                } catch (e) {
                    if (e.message !== errText) throw e;
                    throw new Error(errText);
                }
            }

            const data = await res.json();
            console.log('[Translate] Success response:', data);
            if (data.new_video_url) {
                setCurrentVideoUrl(getApiUrl(data.new_video_url));
                setServerVideoFile(data.new_video_url.split('/').pop());
                if (videoRef.current) {
                    videoRef.current.load();
                }
                setShowTranslateModal(false);
            }

        } catch (e) {
            console.error('[Translate] Exception:', e);
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsTranslating(false);
        }
    };

    // Managed (cloud plan/trial) users post with the server-side key — no BYOK needed
    const canPost = isManaged || (uploadPostKey && uploadUserId);

    const handlePost = async () => {
        if (!canPost) {
            setPostResult({ success: false, msg: "Missing API Key or User ID." });
            return;
        }

        if (noAccountsConnected) {
            setPostResult({ success: false, msg: "Connect a social account first." });
            return;
        }

        const selectedPlatforms = Object.keys(platforms).filter(k => platforms[k]);
        if (selectedPlatforms.length === 0) {
            setPostResult({ success: false, msg: "Select at least one platform." });
            return;
        }

        if (isScheduling && !scheduleDate) {
            setPostResult({ success: false, msg: "Please select a date and time." });
            return;
        }

        setPosting(true);
        setPostResult(null);

        try {
            const payload = {
                job_id: jobId,
                clip_index: index,
                api_key: uploadPostKey,
                user_id: uploadUserId,
                platforms: selectedPlatforms,
                title: postTitle,
                description: postDescription
            };

            if (isScheduling && scheduleDate) {
                // Convert to ISO-8601
                payload.scheduled_date = new Date(scheduleDate).toISOString();
                // Optional: pass timezone if needed, backend defaults to UTC or we can send user's timezone
                payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            }

            const res = await apiFetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                let detail = errText;
                try { detail = JSON.parse(errText).detail || errText; } catch { /* not JSON */ }
                throw new Error(detail);
            }

            const sent = await res.json().catch(() => ({}));
            // Free plan: posting is a paid feature it can try a few times.
            const freeLeft = typeof sent?.free_posts_left === 'number'
                ? ` ${sent.free_posts_left} free post${sent.free_posts_left === 1 ? '' : 's'} left; posting is part of the paid plans.`
                : '';
            if (isScheduling || !sent?.request_id) {
                setPostResult({ success: true, msg: (isScheduling ? "Scheduled successfully!" : "Sent for publishing.") + freeLeft });
                setTimeout(() => {
                    setShowModal(false);
                    setPostResult(null);
                }, 3000);
                return;
            }
            // A 200 only means Upload-Post took the file: follow the post to
            // its real end, so a platform that fails says so here.
            setPostResult({ success: true, msg: "Publishing…" });
            const outcome = await followPost(sent.request_id);
            if (outcome.failed.length) {
                setPostResult({ success: false, msg: `Failed on ${outcome.failed.join('; ')}` });
                track('SocialPostFailed', { props: { platforms: selectedPlatforms.join(',') } });
            } else {
                setPostResult({ success: true, msg: (outcome.done ? "Posted successfully!" : "Still publishing: check your accounts in a few minutes.") + freeLeft });
                setTimeout(() => {
                    setShowModal(false);
                    setPostResult(null);
                }, 3000);
            }

        } catch (e) {
            if (e instanceof QuotaError) {
                setShowModal(false);
                openQuotaWall(e, 'social_post');
                return;
            }
            setPostResult({ success: false, msg: `Failed: ${e.message}` });
        } finally {
            setPosting(false);
        }
    };

    // Browser-rendered previews (Remotion) live in a blob: URL that exists only
    // in this tab, so they always win over the durable copy.
    const playbackUrl = (durableSrc && !durableFailed && !String(currentVideoUrl || '').startsWith('blob:'))
        ? durableSrc
        : currentVideoUrl;

    const durationReadout = formatDuration(clip);

    return (
        <div className="bg-white border border-neutral-200/90 hover:border-neutral-300 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group/card animate-fade h-full" style={{ animationDelay: `${index * 0.05}s` }}>
            {/* Top: Video Thumbnail & Preview */}
            <div className="relative w-full aspect-video bg-neutral-950 overflow-hidden group/video flex items-center justify-center shrink-0">
                <video
                    ref={videoRef}
                    src={playbackUrl}
                    controls={isPlaying}
                    className="w-full h-full object-contain"
                    playsInline
                    onLoadedMetadata={(e) => {
                        if (e.target.videoWidth) {
                            setResolution(`${e.target.videoWidth}×${e.target.videoHeight}`);
                            setIsUpright(e.target.videoHeight > e.target.videoWidth);
                        }
                    }}
                    onError={() => {
                        if (playbackUrl === durableSrc) {
                            setDurableFailed(true);
                            return;
                        }
                        if (durable?.url && currentVideoUrl !== durable.url) setCurrentVideoUrl(durable.url);
                        else setVideoErrored(true);
                    }}
                    onPlay={() => {
                        if (!hasPlayed) track('ClipPlayed', { props: { clip_index: index, clips: clipCount } });
                        setHasPlayed(true);
                        setIsPlaying(true);
                        const currentTime = videoRef.current ? videoRef.current.currentTime : 0;
                        onPlay && onPlay(clip.start + currentTime);
                    }}
                    onPause={() => {
                        setIsPlaying(false);
                        onPause && onPause();
                    }}
                    onEnded={() => {
                        setIsPlaying(false);
                        if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                        }
                    }}
                />

                {/* Translucent Center Play Button overlay */}
                {!isPlaying && (
                    <button
                        onClick={togglePlay}
                        aria-label="Play clip"
                        className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors group/play z-10"
                    >
                        <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg group-hover/play:scale-110 transition-transform">
                            <Play size={18} className="ml-0.5 fill-white text-white" />
                        </div>
                    </button>
                )}

                {/* Clip Number Badge */}
                <div className="absolute top-2 left-2 z-20 pointer-events-none">
                    <span className="bg-black/75 backdrop-blur-md text-white font-mono text-[9.5px] uppercase px-2 py-0.5 rounded-full border border-white/15 font-semibold">
                        Clip {index + 1}
                    </span>
                </div>

                {/* Viral Score Badge */}
                {Number.isFinite(clip.predicted_score) && (
                    <div className="absolute top-2 right-2 z-20 pointer-events-none">
                        <span className="bg-black/75 backdrop-blur-md text-white font-mono text-[9.5px] uppercase px-2 py-0.5 rounded-full border border-white/15 flex items-center gap-1 font-semibold">
                            <TrendingUp size={10} className="text-[#60a5fa]" />
                            <b className={clip.predicted_score >= 80 ? 'text-emerald-400 font-bold' : clip.predicted_score >= 65 ? 'text-[#60a5fa] font-bold' : 'text-white font-bold'}>
                                {clip.predicted_score}
                            </b>
                            <span className="text-white/50">/100</span>
                        </span>
                    </div>
                )}

                {/* Duration Badge Bottom Right */}
                {durationReadout && (
                    <span className="absolute bottom-2 right-2 z-20 bg-black/80 backdrop-blur-sm text-white font-mono text-[9.5px] px-1.5 py-0.5 rounded font-medium pointer-events-none">
                        {durationReadout}
                    </span>
                )}

                {/* Auto Edit Overlay if Processing */}
                {isEditing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-2 text-center">
                        <Loader2 size={24} className="text-[#0000fb] animate-spin mb-1.5" />
                        <span className="text-xs text-white font-medium">Applying AI edits…</span>
                    </div>
                )}
            </div>

            {/* Bottom Content Area */}
            <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-white space-y-1.5">
                <div>
                    <h3 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug truncate" title={clip.video_title_for_youtube_short}>
                        {clip.video_title_for_youtube_short || "Viral Clip Generated"}
                    </h3>
                    {clip.why && (
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5 leading-normal">
                            {clip.why}
                        </p>
                    )}
                </div>

                {/* Meta & Quick Action Icons Row */}
                <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 mt-auto">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                        <span>{durationReadout || '00:30'}</span>
                        <span>•</span>
                        <span className="text-neutral-800 font-semibold">{clip.predicted_score || 90}% Viral</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Download MP4 */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                if (plan === 'free' && !watermarkNoticeDismissed(jobId)) {
                                    setShowWatermarkModal(true);
                                    return;
                                }
                                downloadClip();
                            }}
                            title="Download MP4"
                            className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                        >
                            <Download size={14} />
                        </button>

                        {/* Share / Post to Socials */}
                        <button
                            onClick={() => setShowModal(true)}
                            title="Post to TikTok / Instagram / YouTube"
                            className="p-1 rounded-lg text-neutral-500 hover:text-[#0000fb] hover:bg-[#0000fb]/10 transition-colors"
                        >
                            <Share2 size={14} />
                        </button>

                        {/* More Tools Toggle */}
                        <button
                            onClick={() => setShowTools(true)}
                            title="More editing tools & captions"
                            className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                        >
                            <MoreVertical size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Editing Tools Modal - preserving ALL tools cleanly without stretching grid */}
            <Modal
                isOpen={showTools}
                onClose={() => setShowTools(false)}
                eyebrow={`CLIP ${index + 1}`}
                title="Editing Suite & Copy"
                size="md"
            >
                <div className="space-y-4">
                    {/* Editing Actions Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {onEditClip && (
                            <button onClick={() => { setShowTools(false); onEditClip(index); }} className={QUIET_BTN}>
                                <Scissors size={14} className="text-neutral-500 group-hover:text-[#0000fb]" />
                                <span>Trim Clip</span>
                            </button>
                        )}
                        {onReframeClip && (
                            <button onClick={() => { setShowTools(false); onReframeClip(index); }} className={QUIET_BTN}>
                                <Crosshair size={14} className="text-neutral-500 group-hover:text-[#0000fb]" />
                                <span>Reframing</span>
                            </button>
                        )}
                        <button onClick={handleAutoEdit} disabled={isEditing} className={QUIET_BTN}>
                            {isEditing ? <Loader2 size={14} className="animate-spin text-[#0000fb]" /> : <Wand2 size={14} className="text-neutral-500 group-hover:text-[#0000fb]" />}
                            <span>{isEditing ? 'Editing…' : 'Auto Edit'}</span>
                        </button>
                        <button onClick={() => { setShowTools(false); setShowSubtitleModal(true); }} disabled={isSubtitling} className={QUIET_BTN}>
                            {isSubtitling ? <Loader2 size={14} className="animate-spin text-[#0000fb]" /> : <Type size={14} className="text-neutral-500 group-hover:text-[#0000fb]" />}
                            <span>Subtitles</span>
                        </button>
                        <button onClick={() => { setShowTools(false); setShowHookModal(true); }} disabled={isHooking} className={QUIET_BTN}>
                            {isHooking ? <Loader2 size={14} className="animate-spin text-[#0000fb]" /> : <Sparkles size={14} className="text-neutral-500 group-hover:text-[#0000fb]" />}
                            <span>Hook 5s</span>
                        </button>
                        <button onClick={() => { setShowTools(false); setShowTranslateModal(true); }} disabled={isTranslating} className={QUIET_BTN}>
                            {isTranslating ? <Loader2 size={14} className="animate-spin text-[#0000fb]" /> : <Languages size={14} className="text-neutral-500 group-hover:text-[#0000fb]" />}
                            <span>Dub Voice</span>
                        </button>
                    </div>

                    {canSwitchMode && !isPro && clip.pro_suggested && (
                        <button
                            onClick={handleMode}
                            disabled={isSwitchingMode}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#0000fb]/30 bg-[#0000fb]/5 hover:bg-[#0000fb]/10 text-left transition-colors text-xs text-neutral-900"
                        >
                            <Sparkles size={16} className="text-[#0000fb] shrink-0" />
                            <span className="font-semibold">Try pro mode on this clip</span>
                        </button>
                    )}

                    {/* Copy YouTube and TikTok Titles */}
                    <div className="space-y-2 pt-2 border-t border-neutral-100">
                        <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold tracking-wider">YouTube Title</span>
                                <span className="text-neutral-900 truncate block text-xs font-medium">{clip.video_title_for_youtube_short || "Viral Short Video"}</span>
                            </div>
                            <button onClick={() => handleCopy('youtube', clip.video_title_for_youtube_short || "Viral Short Video")} className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0000fb] hover:bg-neutral-100 transition-colors">
                                {copied === 'youtube' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                        </div>

                        <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold tracking-wider">TikTok / IG Caption</span>
                                <span className="text-neutral-900 truncate block text-xs font-medium">{clip.video_description_for_tiktok || clip.video_description_for_instagram}</span>
                            </div>
                            <button onClick={() => handleCopy('caption', clip.video_description_for_tiktok || clip.video_description_for_instagram)} className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0000fb] hover:bg-neutral-100 transition-colors">
                                {copied === 'caption' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                        </div>

                        <button
                            onClick={() => { setShowTools(false); setShowDescModal(true); }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-neutral-300 hover:border-[#0000fb] bg-neutral-50/50 hover:bg-[#0000fb]/5 text-xs font-medium text-neutral-700 hover:text-[#0000fb] transition-colors"
                        >
                            <FileText size={14} /> View full descriptions
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Descriptions Modal */}
            <Modal
                isOpen={showDescModal}
                onClose={() => setShowDescModal(false)}
                eyebrow="GENERATED COPY"
                title="descriptions"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label className="eyebrow">YOUTUBE TITLE</label>
                            <button
                                onClick={() => handleCopy('youtube', clip.video_title_for_youtube_short || "Viral Short Video")}
                                aria-label="copy youtube title"
                                className="p-1 rounded-full text-muted hover:text-brass transition-colors shrink-0"
                            >
                                {copied === 'youtube' ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <p className="text-sm text-ink2 select-all break-words bg-paper rounded-input p-3 border border-rule">
                            {clip.video_title_for_youtube_short || "Viral Short Video"}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label className="eyebrow">TIKTOK · IG CAPTION</label>
                            <button
                                onClick={() => handleCopy('caption', clip.video_description_for_tiktok || clip.video_description_for_instagram)}
                                aria-label="copy caption"
                                className="p-1 rounded-full text-muted hover:text-brass transition-colors shrink-0"
                            >
                                {copied === 'caption' ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <p className="text-sm text-ink2 select-all break-words bg-paper rounded-input p-3 border border-rule whitespace-pre-wrap">
                            {clip.video_description_for_tiktok || clip.video_description_for_instagram}
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Post Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                eyebrow="PUBLISH"
                title="post clip"
                size="md"
                footer={
                    noAccountsConnected ? (
                        <button onClick={handleConnectAccounts} className="btn-primary w-full">
                            <Link2 size={16} /> connect accounts
                        </button>
                    ) : (
                        <button
                            onClick={handlePost}
                            disabled={posting || !canPost}
                            className="btn-primary w-full"
                        >
                            {posting ? <><Loader2 size={16} className="animate-spin" /> {isScheduling ? 'scheduling…' : 'publishing…'}</> : <><Share2 size={16} /> {isScheduling ? 'schedule post' : 'publish now'}</>}
                        </button>
                    )
                }
            >
                {!canPost && (
                    <div className="mb-4 px-3 py-2 rounded-input text-xs text-warn bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <div className="lowercase">configure api key in settings first.</div>
                    </div>
                )}

                {noAccountsConnected && (
                    <div className="mb-4 px-3 py-2 rounded-input text-xs text-warn bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <div className="lowercase">no social accounts connected yet — link tiktok, instagram, youtube, facebook, linkedin, threads or bluesky to publish this clip.</div>
                    </div>
                )}

                {/* Both the title/description fields below and the schedule
                    button are downstream of this: on a tiktok draft neither
                    travels. See TikTokDraftNotice. */}
                {platforms.tiktok && <TikTokDraftNotice />}

                <div className="space-y-4">
                    {/* Title & Description */}
                    <div>
                        <label className="eyebrow block mb-1.5">TITLE</label>
                        <input
                            type="text"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            className="input-field"
                            placeholder="enter a catchy title…"
                        />
                    </div>

                    <div>
                        <label className="eyebrow block mb-1.5">CAPTION</label>
                        <textarea
                            value={postDescription}
                            onChange={(e) => setPostDescription(e.target.value)}
                            rows={4}
                            className="input-field resize-none"
                            placeholder="write a caption for your post…"
                        />
                    </div>

                    {/* Scheduling */}
                    <div className="p-3 bg-paper rounded-input border border-rule">
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-2 text-sm text-ink2 lowercase">
                                <Calendar size={16} className={isScheduling ? 'text-brass' : 'text-muted'} /> schedule post
                            </span>
                            <input
                                type="checkbox"
                                checked={isScheduling}
                                onChange={(e) => setIsScheduling(e.target.checked)}
                                className="w-4 h-4 accent-brass cursor-pointer"
                            />
                        </label>

                        {isScheduling && (
                            <div className="mt-3 animate-fade">
                                <label className="eyebrow block mb-1.5">DATE · TIME</label>
                                <input
                                    type="datetime-local"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="input-field [color-scheme:dark]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Platforms */}
                    <div>
                        <label className="eyebrow block mb-2">PLATFORMS</label>
                        <SegmentedControl
                            multi
                            columns={4}
                            options={platformOptions}
                            value={Object.keys(platforms).filter(k => platforms[k])}
                            onChange={(arr) => setPlatforms(flagsFromList(arr))}
                        />
                    </div>

                    {postResult && (
                        <div className={postResult.success ? 'badge-ok' : 'badge-danger'}>
                            {postResult.success ? <Check size={12} className="shrink-0" /> : <AlertCircle size={12} className="shrink-0" />}
                            {postResult.msg}
                        </div>
                    )}
                </div>
            </Modal>

            <SubtitleModal
                isOpen={showSubtitleModal}
                onClose={() => setShowSubtitleModal(false)}
                onGenerate={handleSubtitle}
                onApplyAll={onBulkSubtitle ? async (options) => {
                    await onBulkSubtitle(options);
                    setShowSubtitleModal(false);
                } : undefined}
                onRemove={handleRemoveSubtitles}
                bulkCount={clipCount}
                bulkProgress={bulkProgress}
                isProcessing={isSubtitling || (bulkProgress?.running ?? false)}
                videoUrl={originalVideoUrl}
                jobId={jobId}
                clipIndex={index}
                existingHook={activeLayers.hook}
            />

            <HookModal
                isOpen={showHookModal}
                onClose={() => setShowHookModal(false)}
                onGenerate={handleHook}
                isProcessing={isHooking}
                videoUrl={originalVideoUrl}
                initialText={clip.viral_hook_text}
                durationInSeconds={clip.end && clip.start ? clip.end - clip.start : 30}
                existingSubtitles={activeLayers.subtitles}
                hasCaptions={!!activeLayers.subtitles || /(^|_)subtitled_/.test(serverVideoFile || '')}
                serverRender={hasServerBurns}
                burnedHook={burnedHook}
                onRemove={burnedHook ? handleRemoveHook : null}
            />

            <TranslateModal
                isOpen={showTranslateModal}
                onClose={() => setShowTranslateModal(false)}
                onTranslate={handleTranslate}
                isProcessing={isTranslating}
                videoUrl={currentVideoUrl}
                hasApiKey={!!elevenLabsKey}
            />

            {showWatermarkModal && (
                <WatermarkModal
                    source="download"
                    jobId={jobId}
                    onUpgrade={onUpgrade}
                    onClose={() => setShowWatermarkModal(false)}
                    onContinue={downloadClip}
                />
            )}

        </div>
    );
}

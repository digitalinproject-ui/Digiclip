import React, { useEffect, useState, useRef } from 'react';
import { Scan, Scissors, Activity, Radio, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../config';
import { apiFetch } from '../lib/api';

const ProcessingAnimation = ({ media, isComplete, syncedTime, isSyncedPlaying, syncTrigger }) => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!media) return;

    if (media.type === 'file') {
      const url = URL.createObjectURL(media.payload);
      setIsYouTube(false);
      setVideoSrc(url);
      return () => URL.revokeObjectURL(url);
    } else if (media.type === 'server') {
      setIsYouTube(false);
      let cancelled = false;
      const jobId = media.payload.split('/').pop();
      (async () => {
        try {
          const res = await apiFetch(`/api/source-url/${jobId}`);
          const { url } = await res.json();
          if (!cancelled && url) setVideoSrc(getApiUrl(url));
        } catch (e) {
          if (!cancelled) setVideoSrc(getApiUrl(media.payload));
        }
      })();
      return () => { cancelled = true; };
    } else if (media.type === 'url') {
      setIsYouTube(true);
      const videoId = getYouTubeId(media.payload);
      setVideoSrc(videoId);
    }
  }, [media]);

  // Handle Sync Playback for Local Video
  useEffect(() => {
    if (!isYouTube && videoRef.current) {
      if (isSyncedPlaying) {
        if (Number.isFinite(syncedTime)) videoRef.current.currentTime = syncedTime;
        videoRef.current.play().catch(e => console.log("Auto-play prevented", e));
        videoRef.current.loop = false;
        videoRef.current.muted = true;
      } else {
        videoRef.current.pause();

        if (isComplete) {
          videoRef.current.loop = true;
          videoRef.current.play().catch(e => console.log("Ambient play prevented", e));
        }
      }
    }
  }, [syncedTime, isSyncedPlaying, isYouTube, isComplete, syncTrigger]);

  // Handle Sync Playback for YouTube
  useEffect(() => {
    if (isYouTube && iframeRef.current && videoSrc) {
      const iframeWindow = iframeRef.current.contentWindow;
      if (isSyncedPlaying) {
        iframeWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [syncedTime, true] }), '*');
        iframeWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      } else {
        iframeWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      }
    }
  }, [syncedTime, isSyncedPlaying, isYouTube, videoSrc, syncTrigger]);

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const containerClasses = `relative w-full aspect-[2/1] sm:aspect-video rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-200 mb-4 sm:mb-6 group animate-fade transition-all duration-500 shadow-sm
    ${isComplete && !isSyncedPlaying ? 'grayscale brightness-75' : ''}
    ${isSyncedPlaying ? 'ring-2 ring-[#0000fb] ring-offset-2 ring-offset-white' : ''}`;

  const getVideoOpacityClass = () => {
    if (isSyncedPlaying) return 'opacity-100';
    if (isComplete) return 'opacity-35';
    return 'opacity-50 grayscale group-hover:grayscale-0';
  };

  return (
    <div className={containerClasses}>
      {/* Video Layer */}
      <div className={`absolute inset-0 transition-all duration-700 ${getVideoOpacityClass()}`}>
        {isYouTube && videoSrc ? (
          <iframe
            ref={iframeRef}
            className={`w-full h-full ${isSyncedPlaying ? '' : 'pointer-events-none scale-110'}`}
            src={`https://www.youtube.com/embed/${videoSrc}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoSrc}&modestbranding=1&showinfo=0&rel=0&enablejsapi=1`}
            title="Processing Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div className="w-12 h-12 border-3 border-neutral-200 border-t-[#0000fb] rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Overlays - Electric Blue Scanner (ZERO ORANGE) */}
      {!isSyncedPlaying && !isComplete && (
        <>
          <div className="hidden sm:block absolute inset-0 bg-[linear-gradient(rgba(0,0,251,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,251,0.04)_1px,transparent_1px)] bg-[size:40px_40px] z-10 pointer-events-none"></div>
          <div className="absolute left-0 w-full h-[2.5px] bg-[#0000fb] shadow-[0_0_16px_3px_rgba(0,0,251,0.6)] animate-[scan_2.5s_linear_infinite] z-20 pointer-events-none"></div>
          <div className="absolute left-0 w-full h-[18%] bg-[rgba(0,0,251,0.05)] animate-[scan-overlay_2.5s_linear_infinite] z-10 pointer-events-none"></div>
        </>
      )}

      {/* Top HUD bar */}
      {!isSyncedPlaying && (
        <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-4 sm:left-4 sm:right-4 z-30 flex items-start justify-between gap-2 pointer-events-none">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-xs font-mono border border-white/10 min-w-0 transition-colors duration-500 ${isComplete ? 'text-emerald-400' : 'text-[#60a5fa] animate-pulse'}`}>
            {isComplete
              ? <CheckCircle size={14} className="shrink-0 text-emerald-400" />
              : <Scan size={14} className="shrink-0 text-[#0000fb]" />}
            <span className="truncate text-white font-medium">{isComplete ? 'Analysis Complete' : 'Scanning Content...'}</span>
          </div>
          {!isComplete && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-full text-xs font-mono text-white/90 border border-white/10 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#0000fb] animate-ping"></span>
              VIRAL_DETECTION: ACTIVE
            </div>
          )}
        </div>
      )}

      {/* Visual Flair */}
      {!isSyncedPlaying && !isComplete && (
        <div className="hidden sm:block absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div className="absolute top-0 bottom-0 left-[35%] w-px border-r border-dashed border-[#0000fb]/40"></div>
          <div className="absolute top-0 bottom-0 right-[35%] w-px border-l border-dashed border-[#0000fb]/40"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-white/20 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#0000fb] rounded-full animate-ping"></div>
          </div>
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-2 opacity-50">
            <Scissors size={24} className="text-white/40" />
          </div>
        </div>
      )}

      {/* Synced Playing Indicator */}
      {isSyncedPlaying && (
        <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-30 badge-brass bg-black/80 backdrop-blur-md text-[#0000fb] border border-[#0000fb]/30 animate-pulse">
          <Activity size={12} /> Live Sync
        </div>
      )}

      {/* Bottom Info Bar - Crisp Blue Equalizer & Status (ZERO ORANGE) */}
      {!isSyncedPlaying && !isComplete && (
        <div className="hidden sm:flex absolute bottom-0 left-0 right-0 p-3.5 bg-black/80 backdrop-blur-md z-30 justify-between items-end border-t border-white/10">
          <div className="text-xs font-mono text-[#93c5fd] space-y-1">
            <div className="flex items-center gap-2"><Activity size={11} className="animate-pulse text-[#0000fb]" /> <span className="text-white">{'>'} ANALYSIS_THREAD_01: ACTIVE</span></div>
            <div className="flex items-center gap-2"><Radio size={11} className="text-[#0000fb]" /> <span className="text-white">{'>'} AUDIO_TRANSCRIPT: PROCESSING</span></div>
          </div>
          <div className="flex items-end gap-1">
            <div className="w-1 h-3 bg-[#0000fb] rounded-full animate-[pulse_0.5s_infinite]"></div>
            <div className="w-1 h-5 bg-[#0000fb] rounded-full animate-[pulse_0.7s_infinite]"></div>
            <div className="w-1 h-2 bg-[#0000fb] rounded-full animate-[pulse_0.4s_infinite]"></div>
            <div className="w-1 h-4 bg-[#0000fb] rounded-full animate-[pulse_0.6s_infinite]"></div>
            <div className="w-1 h-3 bg-[#0000fb] rounded-full animate-[pulse_0.5s_infinite]"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingAnimation;

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// VIDEO EMBED
// YouTube, Vimeo, or custom video
// =============================================================================

interface VideoEmbedProps {
  src: string;
  type?: "youtube" | "vimeo" | "custom";
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  aspectRatio?: "video" | "square" | "cinema";
  className?: string;
}

export function VideoEmbed({
  src,
  type = "youtube",
  title = "Video",
  poster,
  autoPlay = false,
  aspectRatio = "video",
  className,
}: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showPoster, setShowPoster] = useState(!autoPlay && !!poster);

  const aspectStyles = {
    video: "aspect-video",
    square: "aspect-square",
    cinema: "aspect-[2.35/1]",
  };

  const getEmbedUrl = () => {
    if (type === "youtube") {
      // Extract video ID
      const videoId = src.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/
      )?.[1];
      return `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&rel=0`;
    }
    if (type === "vimeo") {
      const videoId = src.match(/vimeo\.com\/(\d+)/)?.[1];
      return `https://player.vimeo.com/video/${videoId}?autoplay=${isPlaying ? 1 : 0}`;
    }
    return src;
  };

  const handlePlay = () => {
    setShowPoster(false);
    setIsPlaying(true);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted",
        aspectStyles[aspectRatio],
        className
      )}
    >
      {showPoster && poster ? (
        <div
          className="absolute inset-0 cursor-pointer group"
          onClick={handlePlay}
        >
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            >
              <Play className="w-8 h-8 ml-1" />
            </motion.div>
          </div>
        </div>
      ) : type === "custom" ? (
        <video
          src={src}
          controls
          autoPlay={isPlaying}
          className="absolute inset-0 w-full h-full object-cover"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <iframe
          src={getEmbedUrl()}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  );
}

// =============================================================================
// VIDEO PLAYER
// Custom HTML5 video player with controls
// =============================================================================

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  title,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress =
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-black group",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full aspect-video object-contain"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      {/* Play overlay (when paused) */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-20 h-20 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center"
          >
            <Play className="w-8 h-8 ml-1" />
          </motion.div>
        </div>
      )}

      {/* Controls */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
      >
        {/* Progress bar */}
        <div
          className="h-1 bg-white/30 rounded-full cursor-pointer mb-3"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center text-white hover:text-primary transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center text-white hover:text-primary transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>

          {title && (
            <span className="text-white text-sm truncate mx-4">{title}</span>
          )}

          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-primary transition-colors"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// VIDEO SECTION
// Full section with video
// =============================================================================

interface VideoSectionProps {
  title?: string;
  description?: string;
  videoSrc: string;
  videoType?: "youtube" | "vimeo" | "custom";
  poster?: string;
  reversed?: boolean;
  className?: string;
}

export function VideoSection({
  title,
  description,
  videoSrc,
  videoType = "youtube",
  poster,
  reversed = false,
  className,
}: VideoSectionProps) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "grid md:grid-cols-2 gap-12 items-center",
            reversed && "md:flex-row-reverse"
          )}
        >
          <div className={reversed ? "md:order-2" : ""}>
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className={reversed ? "md:order-1" : ""}>
            <VideoEmbed
              src={videoSrc}
              type={videoType}
              poster={poster}
              title={title}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

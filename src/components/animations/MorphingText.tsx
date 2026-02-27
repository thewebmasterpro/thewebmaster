"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface MorphingTextProps {
  texts: string[];
  interval?: number;
  duration?: number;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

export function MorphingText({
  texts,
  interval = 3000,
  duration = 0.5,
  className,
  as: Component = "span",
}: MorphingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <span className={`relative inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration }}
        >
          <Component>{texts[currentIndex]}</Component>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  cursorChar?: string;
  onComplete?: () => void;
  className?: string;
}

export function Typewriter({
  text,
  speed = 50,
  delay = 0,
  cursor = true,
  cursorChar = "|",
  onComplete,
  className,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setDisplayText("");
    setIsTyping(true);

    const startTimer = setTimeout(() => {
      let currentIndex = 0;

      const typeTimer = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeTimer);
          setIsTyping(false);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(typeTimer);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, speed, delay, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <motion.span
          animate={{ opacity: isTyping ? 1 : [1, 0] }}
          transition={{ 
            duration: 0.5, 
            repeat: isTyping ? 0 : Infinity, 
            repeatType: "reverse" 
          }}
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  );
}

interface RotatingWordsProps {
  prefix?: string;
  words: string[];
  suffix?: string;
  interval?: number;
  className?: string;
  wordClassName?: string;
}

export function RotatingWords({
  prefix = "",
  words,
  suffix = "",
  interval = 2000,
  className,
  wordClassName,
}: RotatingWordsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span className={className}>
      {prefix}
      <span className="relative inline-block">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, rotateX: -90 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 90 }}
            transition={{ duration: 0.4 }}
            className={`inline-block ${wordClassName}`}
            style={{ transformPerspective: 500 }}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </span>
      {suffix}
    </span>
  );
}

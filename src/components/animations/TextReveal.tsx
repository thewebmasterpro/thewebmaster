"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";

interface TextRevealProps {
  children: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  animation?: "fade" | "slide" | "blur" | "wave";
  staggerDelay?: number;
  duration?: number;
  delay?: number;
  once?: boolean;
  className?: string;
}

export function TextReveal({
  children,
  as: Component = "p",
  animation = "slide",
  staggerDelay = 0.03,
  duration = 0.5,
  delay = 0,
  once = true,
  className,
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once });

  const letters = children.split("");

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const letterVariants: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration } },
    },
    slide: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration } },
    },
    blur: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      visible: { opacity: 1, filter: "blur(0px)", transition: { duration } },
    },
    wave: {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration, type: "spring", stiffness: 200 },
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      <Component className="inline-block">
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            variants={letterVariants[animation]}
            className="inline-block"
            style={{ whiteSpace: letter === " " ? "pre" : "normal" }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </Component>
    </motion.div>
  );
}

interface SplitWordsProps {
  children: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  staggerDelay?: number;
  duration?: number;
  delay?: number;
  once?: boolean;
  className?: string;
  wordClassName?: string;
}

export function SplitWords({
  children,
  as: Component = "p",
  staggerDelay = 0.1,
  duration = 0.5,
  delay = 0,
  once = true,
  className,
  wordClassName,
}: SplitWordsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once });

  const words = children.split(" ");

  return (
    <div ref={ref} className={className}>
      <Component className="inline">
        {words.map((word, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration,
              delay: delay + index * staggerDelay,
              ease: "easeOut",
            }}
            className={`inline-block mr-[0.25em] ${wordClassName}`}
          >
            {word}
          </motion.span>
        ))}
      </Component>
    </div>
  );
}

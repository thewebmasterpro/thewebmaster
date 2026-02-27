"use client";

import { motion, AnimatePresence, TargetAndTransition } from "framer-motion";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

type TransitionType = "fade" | "slide" | "scale" | "slideUp" | "slideDown";

interface PageTransitionProps {
  children: ReactNode;
  type?: TransitionType;
  duration?: number;
  className?: string;
}

const transitions: Record<TransitionType, {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
  },
  slideDown: {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
  },
};

export function PageTransition({
  children,
  type = "fade",
  duration = 0.3,
  className,
}: PageTransitionProps) {
  const pathname = usePathname();
  const { initial, animate, exit } = transitions[type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={{ duration, ease: "easeInOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Overlay transition for more dramatic page changes
interface OverlayTransitionProps {
  children: ReactNode;
  color?: string;
  duration?: number;
}

export function OverlayTransition({
  children,
  color = "bg-black",
  duration = 0.5,
}: OverlayTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <div key={pathname}>
        <motion.div
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          exit={{ scaleY: 1 }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
          style={{ originY: 0 }}
          className={`fixed inset-0 z-50 ${color}`}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: duration / 2, delay: duration / 2 }}
        >
          {children}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

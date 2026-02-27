"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatePresenceWrapperProps {
  children: ReactNode;
  mode?: "sync" | "wait" | "popLayout";
  initial?: boolean;
}

export function AnimatePresenceWrapper({
  children,
  mode = "wait",
  initial = true,
}: AnimatePresenceWrapperProps) {
  return (
    <AnimatePresence mode={mode} initial={initial}>
      {children}
    </AnimatePresence>
  );
}

interface FadePresenceProps {
  children: ReactNode;
  isVisible: boolean;
  duration?: number;
  className?: string;
}

export function FadePresence({
  children,
  isVisible,
  duration = 0.3,
  className,
}: FadePresenceProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

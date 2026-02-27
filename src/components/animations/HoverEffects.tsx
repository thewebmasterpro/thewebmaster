"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HoverScaleProps {
  children: ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
}

export function HoverScale({
  children,
  scale = 1.05,
  duration = 0.2,
  className,
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.98 }}
      transition={{ duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface HoverTiltProps {
  children: ReactNode;
  tiltDegree?: number;
  scale?: number;
  className?: string;
}

export function HoverTilt({
  children,
  tiltDegree = 10,
  scale = 1.02,
  className,
}: HoverTiltProps) {
  return (
    <motion.div
      whileHover={{
        scale,
        rotateX: tiltDegree,
        rotateY: tiltDegree,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface HoverLiftProps {
  children: ReactNode;
  y?: number;
  shadow?: boolean;
  className?: string;
}

export function HoverLift({
  children,
  y = -8,
  shadow = true,
  className,
}: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{
        y,
        boxShadow: shadow ? "0 20px 40px rgba(0,0,0,0.15)" : undefined,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface HoverGlowProps {
  children: ReactNode;
  color?: string;
  blur?: number;
  className?: string;
}

export function HoverGlow({
  children,
  color = "rgba(59, 130, 246, 0.5)",
  blur = 20,
  className,
}: HoverGlowProps) {
  return (
    <motion.div
      whileHover={{
        boxShadow: `0 0 ${blur}px ${color}`,
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MagneticHoverProps {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export function MagneticHover({
  children,
  strength = 0.3,
  className,
}: MagneticHoverProps) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    
    const x = (clientX - left - width / 2) * strength;
    const y = (clientY - top - height / 2) * strength;
    
    currentTarget.style.transform = `translate(${x}px, ${y}px)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translate(0px, 0px)";
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

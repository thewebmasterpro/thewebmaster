"use client";

import { motion, useInView } from "framer-motion";
import { useRef, ReactNode } from "react";

interface DrawSVGProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
  fillDelay?: number;
  once?: boolean;
  className?: string;
}

export function DrawSVG({
  children,
  duration = 2,
  delay = 0,
  once = true,
  className,
}: DrawSVGProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once });

  return (
    <div ref={ref} className={className}>
      <motion.svg
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="w-full h-full"
      >
        <motion.g
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: {
              pathLength: 1,
              opacity: 1,
              transition: {
                pathLength: { duration, delay, ease: "easeInOut" },
                opacity: { duration: 0.3, delay },
              },
            },
          }}
        >
          {children}
        </motion.g>
      </motion.svg>
    </div>
  );
}

interface DrawPathProps {
  d: string;
  strokeWidth?: number;
  stroke?: string;
  fill?: string;
  duration?: number;
  delay?: number;
  once?: boolean;
  className?: string;
}

export function DrawPath({
  d,
  strokeWidth = 2,
  stroke = "currentColor",
  fill = "none",
  duration = 2,
  delay = 0,
  once = true,
  className,
}: DrawPathProps) {
  const ref = useRef<SVGPathElement>(null);
  const isInView = useInView(ref, { once });

  return (
    <motion.path
      ref={ref}
      d={d}
      strokeWidth={strokeWidth}
      stroke={stroke}
      fill={fill}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={
        isInView
          ? { pathLength: 1, opacity: 1 }
          : { pathLength: 0, opacity: 0 }
      }
      transition={{
        pathLength: { duration, delay, ease: "easeInOut" },
        opacity: { duration: 0.3, delay },
      }}
      className={className}
    />
  );
}

interface DrawCircleProps {
  cx: number;
  cy: number;
  r: number;
  strokeWidth?: number;
  stroke?: string;
  fill?: string;
  duration?: number;
  delay?: number;
  once?: boolean;
}

export function DrawCircle({
  cx,
  cy,
  r,
  strokeWidth = 2,
  stroke = "currentColor",
  fill = "none",
  duration = 1.5,
  delay = 0,
  once = true,
}: DrawCircleProps) {
  const ref = useRef<SVGCircleElement>(null);
  const isInView = useInView(ref, { once });

  return (
    <motion.circle
      ref={ref}
      cx={cx}
      cy={cy}
      r={r}
      strokeWidth={strokeWidth}
      stroke={stroke}
      fill={fill}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={
        isInView
          ? { pathLength: 1, opacity: 1 }
          : { pathLength: 0, opacity: 0 }
      }
      transition={{
        pathLength: { duration, delay, ease: "easeInOut" },
        opacity: { duration: 0.3, delay },
      }}
    />
  );
}

interface AnimatedCheckmarkProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedCheckmark({
  size = 48,
  strokeWidth = 3,
  color = "currentColor",
  duration = 0.5,
  delay = 0,
  className,
}: AnimatedCheckmarkProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <motion.path
        d="M5 12l5 5L20 7"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          isInView
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{
          pathLength: { duration, delay, ease: "easeOut" },
          opacity: { duration: 0.2, delay },
        }}
      />
    </motion.svg>
  );
}

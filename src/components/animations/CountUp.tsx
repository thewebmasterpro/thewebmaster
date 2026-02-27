"use client";

import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  once?: boolean;
  className?: string;
  formatter?: (value: number) => string;
}

export function CountUp({
  to,
  from = 0,
  duration = 2,
  delay = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  once = true,
  className,
  formatter,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once });
  const [hasAnimated, setHasAnimated] = useState(false);

  const springValue = useSpring(from, {
    duration: duration * 1000,
    bounce: 0,
  });

  const displayValue = useTransform(springValue, (current) => {
    if (formatter) {
      return formatter(current);
    }
    return current.toFixed(decimals);
  });

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timer = setTimeout(() => {
        springValue.set(to);
        setHasAnimated(true);
      }, delay * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isInView, hasAnimated, springValue, to, delay]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{displayValue}</motion.span>
      {suffix}
    </span>
  );
}

interface CountUpGroupProps {
  stats: {
    value: number;
    label: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  }[];
  duration?: number;
  staggerDelay?: number;
  className?: string;
  statClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function CountUpGroup({
  stats,
  duration = 2,
  staggerDelay = 0.2,
  className,
  statClassName,
  labelClassName,
  valueClassName,
}: CountUpGroupProps) {
  return (
    <div className={className}>
      {stats.map((stat, index) => (
        <div key={index} className={statClassName}>
          <CountUp
            to={stat.value}
            prefix={stat.prefix}
            suffix={stat.suffix}
            decimals={stat.decimals}
            duration={duration}
            delay={index * staggerDelay}
            className={valueClassName}
          />
          <span className={labelClassName}>{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

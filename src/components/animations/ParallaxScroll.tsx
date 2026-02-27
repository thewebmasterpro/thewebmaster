"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";

interface ParallaxScrollProps {
  children: ReactNode;
  speed?: number; // -1 to 1 (negative = opposite direction)
  direction?: "vertical" | "horizontal";
  className?: string;
}

export function ParallaxScroll({
  children,
  speed = 0.5,
  direction = "vertical",
  className,
}: ParallaxScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100]);
  const x = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100]);

  return (
    <div ref={ref} className={className}>
      <motion.div
        style={direction === "vertical" ? { y } : { x }}
        className="relative w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

interface ParallaxLayersProps {
  layers: {
    content: ReactNode;
    speed: number;
    className?: string;
  }[];
  className?: string;
}

function ParallaxLayer({
  layer,
  scrollYProgress,
}: {
  layer: ParallaxLayersProps["layers"][number];
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [layer.speed * -100, layer.speed * 100]
  );

  return (
    <motion.div
      style={{ y }}
      className={`absolute inset-0 ${layer.className}`}
    >
      {layer.content}
    </motion.div>
  );
}

export function ParallaxLayers({ layers, className }: ParallaxLayersProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <div ref={ref} className={`relative ${className}`}>
      {layers.map((layer, index) => (
        <ParallaxLayer
          key={index}
          layer={layer}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </div>
  );
}

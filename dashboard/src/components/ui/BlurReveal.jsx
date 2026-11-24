import React, { useEffect, useState } from 'react';

/**
 * BlurReveal - Apple HIG inspired smooth blur-reveal animation component.
 * Replicates the popular @spell/blur-reveal & MagicUI blur-reveal effect.
 * Smoothly interpolates filter: blur(Xpx) + translateY(Ypx) + opacity: 0
 * to filter: blur(0px) + translateY(0px) + opacity: 1 using Apple's signature cubic bezier.
 */
export function BlurReveal({
  children,
  delay = 0,
  duration = 0.7,
  blur = '12px',
  yOffset = 12,
  className = '',
  as: Component = 'div',
  style = {},
  ...props
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealed(true);
    }, Math.max(0, delay * 1000));
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Component
      className={className}
      style={{
        ...style,
        opacity: revealed ? 1 : 0,
        filter: revealed ? 'blur(0px)' : `blur(${blur})`,
        transform: revealed ? 'translateY(0px)' : `translateY(${yOffset}px)`,
        transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1), filter ${duration}s cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
        willChange: 'opacity, filter, transform',
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * BlurRevealWords - Staggers each word individually with an Apple-style blur reveal.
 */
export function BlurRevealWords({
  text = '',
  delay = 0,
  wordDelay = 0.06,
  duration = 0.65,
  blur = '10px',
  yOffset = 10,
  className = '',
  as: Component = 'span',
  highlightIndices = [],
  highlightClass = 'text-[#0000fb]',
  ...props
}) {
  const words = typeof text === 'string' ? text.split(' ') : [];

  return (
    <Component className={`inline-block ${className}`} {...props}>
      {words.map((word, i) => {
        const isHighlight = highlightIndices.includes(i);
        return (
          <span key={i} className={`inline-block mr-[0.28em] ${isHighlight ? highlightClass : ''}`}>
            <BlurReveal
              delay={delay + i * wordDelay}
              duration={duration}
              blur={blur}
              yOffset={yOffset}
              as="span"
            >
              {word}
            </BlurReveal>
          </span>
        );
      })}
    </Component>
  );
}

export default BlurReveal;

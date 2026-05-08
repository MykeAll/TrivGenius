import React, { useEffect, useRef } from 'react';
import { animate } from 'motion/react';

export const AnimatedNumber: React.FC<{ value: number, className?: string }> = ({ value, className }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(parseInt(node.textContent || "0", 10), value, {
        duration: 0.5,
        onUpdate: (v) => {
          node.textContent = Math.round(v).toString();
        },
      });
      return () => controls.stop();
    }
  }, [value]);

  return <span ref={nodeRef} className={className}>{value}</span>;
}

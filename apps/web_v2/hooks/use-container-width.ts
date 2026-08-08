import * as React from "react";

/* ─── Width observer — measures an element's own container width ────────── */

export function useContainerWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(0);
  const rafRef = React.useRef(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        for (const entry of entries) {
          setWidth(entry.contentRect.width);
        }
      });
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, []);

  return [ref, width];
}

/* ─── Size observer — width AND height, for previews that must fit a box ──── */

export interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Like {@link useContainerWidth}, but reports both axes.
 *
 * A callback ref rather than `useRef` + `useEffect([])`: a preview's measured
 * element often mounts only after its frame has a size, so an effect that reads
 * `ref.current` on first render would find null and never observe anything.
 */
export function useContainerSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  ContainerSize,
] {
  const [size, setSize] = React.useState<ContainerSize>({
    width: 0,
    height: 0,
  });
  const observerRef = React.useRef<ResizeObserver | null>(null);

  React.useEffect(() => () => observerRef.current?.disconnect(), []);

  const ref = React.useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return [ref, size];
}

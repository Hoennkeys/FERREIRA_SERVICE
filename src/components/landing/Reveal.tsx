import { useEffect, useRef, type ReactNode, type ElementType } from "react";

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-visible", "true");
      return;
    }

    const show = () => {
      setTimeout(() => el.setAttribute("data-visible", "true"), delay);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show();
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);

    // Content above the fold should not stay invisible if IO is delayed.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show();
      io.unobserve(el);
    }

    return () => io.disconnect();
  }, [delay]);

  const Component = Tag as ElementType;
  return (
    <Component ref={ref} data-reveal className={className}>
      {children}
    </Component>
  );
}

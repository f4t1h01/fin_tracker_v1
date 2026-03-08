"use client";

import { useEffect, useState } from "react";

export function MarketingEffects() {
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover, setCursorHover] = useState(false);

  useEffect(() => {
    const body = document.body;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const enableCursorEffects = supportsFinePointer.matches && !prefersReducedMotion.matches;

    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = prefersReducedMotion.matches
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("visible");
              }
            });
          },
          { threshold: 0.15 }
        );

    if (observer) {
      revealNodes.forEach((node) => observer.observe(node));
    } else {
      revealNodes.forEach((node) => node.classList.add("visible"));
    }

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let frame = 0;
    let hasShownCursor = false;

    const orbit = document.getElementById("cursor-orbit");

    const syncPointerEffects = () => {
      frame = 0;

      if (orbit) {
        orbit.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      body.style.setProperty("--mouse-x", `${(x / window.innerWidth - 0.5) * 30}px`);
      body.style.setProperty("--mouse-y", `${(y / window.innerHeight - 0.5) * 20}px`);
    };

    if (enableCursorEffects) {
      body.classList.add("landing-page-active");
      syncPointerEffects();
    }

    const onPointerMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;

      if (!hasShownCursor) {
        hasShownCursor = true;
        setCursorVisible(true);
      }

      if (!frame) {
        frame = window.requestAnimationFrame(syncPointerEffects);
      }
    };

    const hoverables = enableCursorEffects
      ? Array.from(document.querySelectorAll<HTMLElement>("a, button, [data-cursor='hover']"))
      : [];
    const onEnter = () => setCursorHover(true);
    const onLeave = () => setCursorHover(false);
    hoverables.forEach((element) => {
      element.addEventListener("mouseenter", onEnter);
      element.addEventListener("mouseleave", onLeave);
    });

    if (enableCursorEffects) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    return () => {
      body.classList.remove("landing-page-active");
      body.style.removeProperty("--mouse-x");
      body.style.removeProperty("--mouse-y");
      observer?.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("pointermove", onPointerMove);
      hoverables.forEach((element) => {
        element.removeEventListener("mouseenter", onEnter);
        element.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  return <div className={`cursor-orbit${cursorVisible ? "" : " hidden"}${cursorHover ? " is-hovering" : ""}`} id="cursor-orbit" />;
}

export function NavShell({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const syncScrollState = () => {
      frame = 0;
      const next = window.scrollY > 50;
      setIsScrolled((current) => (current === next ? current : next));
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(syncScrollState);
    };

    syncScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <div className={`nav-shell${isScrolled ? " is-scrolled" : ""}`}>{children}</div>;
}

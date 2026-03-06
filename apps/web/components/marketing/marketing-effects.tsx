"use client";

import { useEffect, useState } from "react";

export function MarketingEffects() {
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover, setCursorHover] = useState(false);

  useEffect(() => {
    document.body.classList.add("landing-page-active");

    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    revealNodes.forEach((node) => observer.observe(node));

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cursorX = x;
    let cursorY = y;
    let rafId = 0;

    const orbit = document.getElementById("cursor-orbit");
    const animate = () => {
      cursorX += (x - cursorX) * 0.12;
      cursorY += (y - cursorY) * 0.12;
      if (orbit) {
        orbit.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
      }
      rafId = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      setCursorVisible(true);

      const xRatio = event.clientX / window.innerWidth - 0.5;
      const yRatio = event.clientY / window.innerHeight - 0.5;
      document.documentElement.style.setProperty("--mouse-x", `${xRatio * 30}px`);
      document.documentElement.style.setProperty("--mouse-y", `${yRatio * 20}px`);
    };

    const hoverables = Array.from(document.querySelectorAll<HTMLElement>("a, button, [data-cursor='hover']"));
    const onEnter = () => setCursorHover(true);
    const onLeave = () => setCursorHover(false);
    hoverables.forEach((element) => {
      element.addEventListener("mouseenter", onEnter);
      element.addEventListener("mouseleave", onLeave);
    });

    window.addEventListener("pointermove", onPointerMove);
    rafId = window.requestAnimationFrame(animate);

    return () => {
      document.body.classList.remove("landing-page-active");
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(rafId);
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
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div className={`nav-shell${isScrolled ? " is-scrolled" : ""}`}>{children}</div>;
}

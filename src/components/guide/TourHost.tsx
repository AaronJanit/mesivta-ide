"use client";

import { useEffect, useState } from "react";
import { INTRO_TOUR_STEPS, IntroTour } from "@/components/guide/IntroTour";

/**
 * Hosts the site-wide intro tour at the root layout level so it survives
 * client navigation between pages (dashboard → ide → docs → ...).
 * The tour only starts when the user clicks "Take the intro guide" on the
 * dashboard, which dispatches a "mesivta:start-intro-tour" window event.
 */
export function TourHost() {
  const [active, setActive] = useState(false);

  // The dashboard's "Take the intro guide" button starts it manually.
  useEffect(() => {
    const start = () => setActive(true);
    window.addEventListener("mesivta:start-intro-tour", start);
    return () => window.removeEventListener("mesivta:start-intro-tour", start);
  }, []);

  if (!active) return null;
  return <TourRunner onFinish={() => setActive(false)} />;
}

function TourRunner({ onFinish }: { onFinish: () => void }) {
  // Mark the document while the tour is on screen so pages can hide
  // distracting content (e.g. the Vibes stage list during the progress stop).
  useEffect(() => {
    document.documentElement.setAttribute("data-tour-active", "");
    return () => document.documentElement.removeAttribute("data-tour-active");
  }, []);

  return <IntroTour steps={INTRO_TOUR_STEPS} onFinish={onFinish} />;
}
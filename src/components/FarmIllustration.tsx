"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { sunInDrawing, sunPosition } from "@/lib/sun";
import { ChickenBody, ChickenLeg, ChickenWing } from "./Chicken";
import { PauseIcon, PlayIcon } from "./icons";
import styles from "./FarmIllustration.module.css";

// The clock for the sun, read once a minute. Null on the server, so the
// static page never bakes in the time it was built.
function subscribeToMinutes(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinute = () => null;

/**
 * Drawn farmyard for the home hero. The sun stands where the real sun is;
 * the chicken walks, pecks and tries to fly; birds and now and then a
 * tractor pass by. Everything moves with CSS, so the Rustknop and
 * prefers-reduced-motion stop it (globals.css), and the button pauses it.
 */
export function FarmIllustration({ className }: { className?: string }) {
  const t = useTranslations("home");
  const [paused, setPaused] = useState(false);
  const minute = useSyncExternalStore(subscribeToMinutes, currentMinute, noMinute);
  const sun = minute === null ? null : sunInDrawing(sunPosition(new Date(minute * 60_000)));
  const line = "var(--color-outline)";

  return (
    <div className={styles.wrap}>
      <svg
        viewBox="0 0 560 400"
        className={`${className ?? ""} ${paused ? styles.paused : ""}`}
        role="img"
        aria-label={t("illustration")}
        focusable="false"
      >
        {sun ? (
          <g transform={`translate(${sun.x.toFixed(1)} ${sun.y.toFixed(1)})`}>
            <circle r="58" fill="var(--color-eigeel)" opacity="0.3" />
            <circle r="42" fill={sun.low ? "var(--color-kam-oranje)" : "var(--color-eigeel)"} />
          </g>
        ) : null}

        {/* Birds far away: a flock to the right, a pair to the left. */}
        <g transform="translate(250 64)">
          <g className={styles.flockA}>
            <Bird x={0} y={0} delay={0} />
            <Bird x={26} y={12} delay={-0.25} />
            <Bird x={-22} y={16} delay={-0.4} />
          </g>
        </g>
        <g transform="translate(150 40)">
          <g className={styles.flockB}>
            <Bird x={0} y={0} delay={-0.1} small />
            <Bird x={20} y={-8} delay={-0.35} small />
          </g>
        </g>

        <path
          d="M0 250 C120 190 220 210 320 240 C420 270 500 220 560 200 L560 400 L0 400 Z"
          fill="var(--color-hill-light)"
        />

        {/* The tractor rides the back hill, behind the milking parlour. */}
        <g className={styles.tractor}>
          <Tractor />
        </g>

        <path
          d="M0 300 C140 260 260 290 380 300 C460 306 520 290 560 280 L560 400 L0 400 Z"
          fill="var(--color-hill)"
        />
        <g stroke={line} strokeWidth="4" strokeLinejoin="round">
          <path d="M90 290 V200 L160 150 L230 200 V290 Z" fill="var(--color-barn)" />
          <path d="M135 290 V240 H185 V290" fill="var(--color-stro)" />
          <path d="M80 205 L160 145 L240 205" fill="none" />
          <rect x="146" y="180" width="28" height="22" fill="var(--color-stro)" />
        </g>
        <g stroke={line} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M300 300 V260 M340 300 V260 M380 300 V260 M290 272 H400" />
        </g>

        {/* The chicken. Each nested group moves one thing, around its own pivot. */}
        <g transform="translate(380 250)">
          <g className={styles.walk}>
            <g className={styles.hop}>
              <g transform="scale(1.15) translate(64 0)">
                <g className={styles.facing}>
                  <g transform="translate(-64 0)">
                    <g className={styles.standingLegs}>
                      <ChickenLeg which="back" />
                      <ChickenLeg which="front" />
                    </g>
                    <g className={styles.walkingLegs}>
                      <g transform="translate(56 94)">
                        <g className={styles.legBack}>
                          <g transform="translate(-56 -94)">
                            <ChickenLeg which="back" />
                          </g>
                        </g>
                      </g>
                      <g transform="translate(70 92)">
                        <g className={styles.legFront}>
                          <g transform="translate(-70 -92)">
                            <ChickenLeg which="front" />
                          </g>
                        </g>
                      </g>
                    </g>
                    <g transform="translate(62 94)">
                      <g className={styles.peck}>
                        <g transform="translate(-62 -94)">
                          <ChickenBody />
                          <g className={styles.restingWing}>
                            <ChickenWing />
                          </g>
                          <g className={styles.flappingWing}>
                            <g transform="translate(66 66)">
                              <g className={styles.flap}>
                                <g transform="translate(-66 -66)">
                                  <ChickenWing />
                                </g>
                              </g>
                            </g>
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <button
        type="button"
        className={`btn btn-quiet ${styles.toggle}`}
        aria-label={paused ? t("animationPlay") : t("animationPause")}
        title={paused ? t("animationPlay") : t("animationPause")}
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
      </button>
    </div>
  );
}

/** A bird far off in the sky: just a "v" of two arcs, flapping. */
function Bird({ x, y, delay, small }: { x: number; y: number; delay: number; small?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${small ? 0.75 : 1})`}>
      <path
        className={styles.wings}
        style={{ animationDelay: `${delay}s` }}
        d="M-10 -4 Q-5 -6 0 1 Q5 -6 10 -4"
        fill="none"
        stroke="var(--color-outline)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** A small farm tractor, facing right, standing on (0, 0). */
function Tractor() {
  const line = "var(--color-outline)";
  return (
    <g stroke={line} strokeWidth="2.5" strokeLinejoin="round">
      <g className={styles.rumble}>
        <path d="M8 -19 V-29" strokeLinecap="round" fill="none" />
        <path d="M-17 -10 V-33 H-2 L0 -19 H18 V-9 Z" fill="var(--color-barn)" />
        <path d="M-13 -29 H-5 V-20 H-13 Z" fill="var(--color-stro)" strokeWidth="2" />
      </g>
      <circle cx="13" cy="-6" r="6" fill="var(--color-ink-soft)" />
      <g transform="translate(-9 -10)">
        <circle r="10" fill="var(--color-ink-soft)" />
        <g className={styles.wheel}>
          <path d="M-6 0 H6 M0 -6 V6" stroke="var(--color-stro)" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
      <g transform="translate(8 -32)" stroke="none" fill="var(--color-border)">
        <circle className={styles.puff} r="3.5" />
        <circle className={styles.puff} r="3.5" style={{ animationDelay: "-0.45s" }} />
      </g>
    </g>
  );
}

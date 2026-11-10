"use client";

import { useEffect } from "react";
import { caveat } from "../fonts";
import styles from "./LockerScene.module.css";

type Props = {
  exiting: boolean;
  onClose: () => void;
};

/** The p.s. locker's sticky note, enlarged so the Instagram handle is a real link. */
export default function StickyNote({ exiting, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-text"
      onClick={onClose}
      className={`${styles.noteBackdrop} ${exiting ? styles.exiting : ""}`}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${styles.stickyNote} ${caveat.className} ${exiting ? styles.exiting : ""}`}>
        <button aria-label="Close" onClick={onClose} className={styles.noteClose}>
          ×
        </button>
        <p id="note-text">
          Visit our Instagram{" "}
          <a
            href="https://www.instagram.com/molelitmag/"
            target="_blank"
            rel="noopener noreferrer">
            @molelitmag
          </a>{" "}
          {/* Non-breaking spaces keep the last line together, as on the 3D note. */}
          {"to\u00a0learn\u00a0more."}
        </p>
      </div>
    </div>
  );
}

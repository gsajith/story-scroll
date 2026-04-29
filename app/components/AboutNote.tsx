"use client";

import { useEffect } from "react";
import styles from "./LockerScene.module.css";

type Props = {
  exiting: boolean;
  onClose: () => void;
};

export default function AboutNote({ exiting, onClose }: Props) {
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
      aria-labelledby="note-title"
      onClick={onClose}
      className={`${styles.noteBackdrop} ${exiting ? styles.exiting : ""}`}>
      <article
        onClick={(e) => e.stopPropagation()}
        className={`${styles.noteArticle} ${exiting ? styles.exiting : ""}`}>
        <button aria-label="Close" onClick={onClose} className={styles.noteClose}>
          ×
        </button>
        <h1 id="note-title" className={styles.noteTitle}>
          About Us
        </h1>
        <p className={styles.noteBody}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </p>
        <p className={styles.noteBody}>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
          officia deserunt mollit anim id est laborum. Pellentesque habitant
          morbi tristique senectus et netus et malesuada fames ac turpis
          egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget,
          tempor sit amet, ante.
        </p>
        <p className={styles.noteBody}>
          Donec eu libero sit amet quam egestas semper. Aenean ultricies mi
          vitae est. Mauris placerat eleifend leo. Quisque sit amet est et
          sapien ullamcorper pharetra.
        </p>
      </article>
    </div>
  );
}

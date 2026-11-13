import { readdir } from "fs/promises";
import path from "path";
import LockerScene from "./components/LockerScene";
import styles from "./page.module.css";
import { INSTAGRAM_URL, SITE_NAME, SITE_URL, SUBMIT_URL } from "./site";

// Tells search engines who publishes the site and which Instagram account is theirs.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      sameAs: [INSTAGRAM_URL],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default async function Home() {
  let bookCovers: string[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "book_covers");
    const files = await readdir(dir);
    bookCovers = files.filter((f) => /\.(png|jpe?g|webp|avif|gif)$/i.test(f));
  } catch {
    // book_covers dir missing or unreadable — render without books
  }
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {/* The scene is a canvas, which search engines, screen readers and keyboards
          cannot read. This says the same things as text and real links. */}
      <div className={styles.about}>
        <h1>{SITE_NAME}</h1>
        <p>A literary magazine. Submissions are open.</p>
        <a href={SUBMIT_URL}>Submit your story</a>
        <a href={INSTAGRAM_URL}>Follow @molelitmag on Instagram</a>
      </div>
      <LockerScene bookCovers={bookCovers} />
    </main>
  );
}

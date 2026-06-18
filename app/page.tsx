import { readdir } from "fs/promises";
import path from "path";
import LockerScene from "./components/LockerScene";

export default async function Home() {
  let bookCovers: string[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "book_covers");
    const files = await readdir(dir);
    bookCovers = files.filter((f) => /\.(png|jpe?g|webp|avif|gif)$/i.test(f));
  } catch {
    // book_covers dir missing or unreadable — render without books
  }
  return <LockerScene bookCovers={bookCovers} />;
}

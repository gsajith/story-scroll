import { Caveat, Red_Hat_Display } from "next/font/google";

// Each font is loaded once here and imported wherever it is needed. The canvas
// textures in app/lib/locker read `style.fontFamily` to draw with the same faces.
export const redHatDisplay = Red_Hat_Display({ subsets: ["latin"] });

// Handwriting for the p.s. sticky note.
export const caveat = Caveat({ subsets: ["latin"] });

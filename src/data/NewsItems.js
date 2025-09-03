export const newsTimelineItems = [
  {
    date: "July 10, 2024",
    body: "Text goes here",
    image: { src: "/George.png", alt: "hi" },
  },
  {
    date: "Aug 20, 2024",
    body: "Another textbox with identical styling to your GlowDot tooltip.",
  },
  {
    date: "Sep 2, 2024",
    title: "Optional Title",
    body: "Cyan center dot stays pinned; background remains fixed.",
  },
  {
    date: "Sep 2, 2021",
    title: "Optional Title",
    body: "ADIFJFJOFJ.",
    href: "https://instagram.com",
    target: "_blank",
    ariaLabel: "Open insta",
    image: { src: "/George.png", alt: "hi" },
  },
]

/**
 * NEWS DATA
 * ------------------
 * How this file works:
 *  - Each object in the array below is ONE news item (“card”) on the timeline.
 *  - The timeline shows items IN THIS ORDER (top to bottom = first to last).
 *  - You can add, remove, or re-order items by editing this list.
 *
 * What you can customize on each item:
 *  - date   (required)  → Short text like "Sep 2, 2024" or "Q3 2024".
 *  - title  (optional)  → A short heading. If you don’t need it, delete the line.
 *  - body   (required)  → The main text for the card.
 *  - href   (optional)  → If set, clicking the card opens this link.
 *  - target (optional)  → Usually "_blank" to open link in a new tab.
 *  - ariaLabel (optional) → Screen reader label (accessibility). Helpful if href is set.
 *  - image  (optional)  → An object with:
 *        - src (required if image is used): the picture
 *        - alt (recommended): short description of the picture (accessibility)
 *
 * IMAGES — Add to src -> assets folder. Then image path / src is: "src/assets/ImageName.png" (or whatever extension the image is)
 *  External image URLs also work: image: { src: "https://site.com/pic.jpg", alt: "..." }
 *
 * LINKS:
 *  - If you add "href", the entire card becomes clickable.
 *  - Add `target: "_blank"` to open in a new tab (recommended).
 *
 * TIPS:
 *  - If you don’t need a field, delete that line (don’t leave it blank).
 *  - You can copy the TEMPLATE at the bottom and fill it in for new items.
 */

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * TEMPLATE — COPY THIS, PASTE BELOW, AND EDIT VALUES
 * (Delete any lines you don’t need; keep commas between items.)
 *
 * {
 *   date: "Month DD, YYYY",           // REQUIRED
 *   // title: "Short headline",       // OPTIONAL
 *   body: "Your news text here.",     // REQUIRED
 *   // href: "https://link-to-more",  // OPTIONAL (makes card clickable)
 *   // target: "_blank",              // OPTIONAL (opens link in new tab)
 *   // ariaLabel: "Open full story",  // OPTIONAL (screen reader label)
 *   // image: {                       // OPTIONAL
 *   //   src: someImportedImage,      // or "/from-public/folder.webp" or "https://..."
 *   //   alt: "Short description",    // recommended
 *   // },
 * },
 *
 * QUICK CHECKLIST:
 *  - [ ] Did you put a comma after the item if another item follows?
 *  - [ ] Are there quotes around text? (Yes: "like this")
 *  - [ ] If you added image, did you set both src and a helpful alt?
 *  - [ ] If you added a link (href), do you want it in a new tab (target: "_blank")?
 */
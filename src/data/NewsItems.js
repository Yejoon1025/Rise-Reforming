export const newsTimelineItems = [
  {
    date: "April 2024",
    title: "The Idea",
    body: "Three undergrads teamed up as Rise Reforming to take first place at the DOE's EnergyTech national business plan competition.",
    href: "https://www.energy.gov/technologytransitions/articles/energytech-university-prize-2024-student-winners-announced",
    target: "_blank",
    ariaLabel: "Open article",
    image: { src: "/News1.jpg", alt: "NewsImage" },
  },
  {
    date: "June 2024",
    title: "Incorporation",
    body: "Rise Reforming becomes Rise Reforming, Inc.",
  },
  {
    date: "October 2024",
    title: "Proof-of-concept begins at UChicago",
    href: "https://college.uchicago.edu/news/student-stories/undergraduate-impact-new-startup-tackles-plastic-waste-disaster ",
    target: "_blank",
    ariaLabel: "Open article",
    image: { src: "/FirstStep.jpg", alt: "NewsImage" },
  },
  {
    date: "Jan 2025",
    title: "EAF Start-Up Award",
    body: "Rise Reforming selected as winners of the European Aerosols Federation 2025 Start-Up Award. Invited to present at Paris Packaging Week.",
    href: "https://worldaerosols.com/news/adf-innovation-award-winners-announced-in-paris/",
    target: "_blank",
    ariaLabel: "Open article",
  },
  {
    date: "May 2025",
    title: "Funding",
    body: "The team secures funding from UChicago accelerators, TCU's Values and Ventures competition, and VentureWell. CEO George Rose is named Climate Fellow by the 776 Foundation (led by Reddit Co-Founder Alexis Ohanian).",
    href: "https://www.linkedin.com/posts/alexisohanian_thrilled-to-announce-our-2025-776-foundation-activity-7345937006784356353-NbUe?utm_source=share&utm_medium=member_desktop&rcm=ACoAADbJL0UB7eIMrvaImGK2kLbMmseu0Fvupr8",
    target: "_blank",
    ariaLabel: "Open article",
    image: { src: "/News2.jpg", alt: "NewsImage" },
  },
  {
    date: "June 2025",
    title: "Expansion",
    body: "Rise moves into IIT's University Technology Park to continue R&D. Nina Kritikos joins the team as the first hire.",
    image: { src: "/News3.jpg", alt: "NewsImage" },
  },
  {
    date: "To Date",
    body: "8 LOIs, 1 pilot site/supply MOU, and 1 pilot purchase agreement signed. Robust board of advisors assembled.",
  },
  {
    title: "Future?",
    body: "Stay tuned for more!",
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
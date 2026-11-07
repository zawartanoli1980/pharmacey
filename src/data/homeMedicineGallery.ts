export const homeMedicinePictures = [
  {
    id: "tablets",
    name: "Tablets & blister packs",
    description: "A familiar part of every pharmacy shelf.",
    image: "/images/home-tablets.png",
    alt: "AI-generated illustration of an unbranded silver blister pack and white tablets on a mint background",
  },
  {
    id: "bottles",
    name: "Bottles & liquids",
    description: "From the counter to the stockroom, keep it connected.",
    image: "/images/home-bottles.png",
    alt: "AI-generated illustration of a plain amber medicine bottle and an empty measuring cup on a mint background",
  },
  {
    id: "care",
    name: "Everyday care essentials",
    description: "A clearer view of the essentials you manage.",
    image: "/images/home-care.png",
    alt: "AI-generated illustration of unbranded gauze, tape and dressing packets on a mint background",
  },
] as const;
export type HomeMedicinePicture = (typeof homeMedicinePictures)[number];

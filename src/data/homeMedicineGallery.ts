import { selectedHomePhotography } from "./homeSelectedPhotography";

export interface HomeMedicinePicture {
  id: string;
  name: string;
  description: string;
  image: string;
  alt: string;
  label: string;
  note: string;
}

const illustrationNote =
  "AI-generated, unbranded illustration for the SmartMed POS website. This is not a product listing or a medicine recommendation.";
const illustrations = [
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

export const homeMedicinePictures: HomeMedicinePicture[] =
  selectedHomePhotography?.photos.map((photo) => ({
    ...photo,
    description: "A selected image from the world of healthcare.",
    label: "Selected image",
    note: "Selected website image. No live stock or medicine prices are implied.",
  })) ||
  illustrations.map((picture) => ({
    ...picture,
    label: "AI-generated illustration",
    note: illustrationNote,
  }));

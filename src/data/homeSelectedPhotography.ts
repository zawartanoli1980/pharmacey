/// <reference types="vite/client" />

export const selectedHomeSources = {
  background: "https://pin.it/6mKRanGBn",
  firstPhoto: "https://pin.it/7uHbJG7G6",
  secondPhoto: "https://pin.it/5jsHYVtK2",
  thirdPhoto: "https://pin.it/6BJsHFZqF",
} as const;

export interface SelectedHomePhoto {
  id: string;
  image: string;
  name: string;
  alt: string;
  source: string;
}

export interface SelectedHomePhotography {
  background: string;
  photos: [SelectedHomePhoto, SelectedHomePhoto, SelectedHomePhoto];
}

// Activate only when all four exact, downloaded assets are present. Short
// Pinterest links serve HTML and must never be used directly as image URLs.
const assets = import.meta.glob<string>(
  "../assets/home-selected/*.{jpg,jpeg,png,webp}",
  { eager: true, query: "?url", import: "default" },
);
const asset = (name: string) =>
  Object.entries(assets).find(([path]) =>
    new RegExp(`/${name}\\.(jpg|jpeg|png|webp)$`).test(path),
  )?.[1];
const background = asset("background");
const firstPhoto = asset("photo-one");
const secondPhoto = asset("photo-two");
const thirdPhoto = asset("photo-three");

export const selectedHomePhotography: SelectedHomePhotography | null =
  background && firstPhoto && secondPhoto && thirdPhoto
    ? {
        background,
        photos: [
          {
            id: "selected-one",
            image: firstPhoto,
            name: "Connected care",
            alt: "Doctor holding a glowing healthcare interface with medical icons",
            source: selectedHomeSources.firstPhoto,
          },
          {
            id: "selected-two",
            image: secondPhoto,
            name: "Digital pharmacy",
            alt: "Blue illustration of a medicine bottle and floating capsules above a digital hand",
            source: selectedHomeSources.secondPhoto,
          },
          {
            id: "selected-three",
            image: thirdPhoto,
            name: "Medicine science",
            alt: "Scientific illustration of cells, molecules, capsules and a DNA strand",
            source: selectedHomeSources.thirdPhoto,
          },
        ],
      }
    : null;

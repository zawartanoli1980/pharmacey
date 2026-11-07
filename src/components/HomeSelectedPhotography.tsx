import { useRef, useState } from "react";
import { ImageOff, ZoomIn } from "lucide-react";
import Modal from "./Modal";
import type {
  SelectedHomePhoto,
  SelectedHomePhotography,
} from "../data/homeSelectedPhotography";
import "./HomeSelectedPhotography.css";

function SelectedPhoto({ photo }: { photo: SelectedHomePhoto }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="home-selected-fallback">
      <ImageOff size={28} aria-hidden="true" />
      Picture unavailable
    </span>
  ) : (
    <img
      src={photo.image}
      alt={photo.alt}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function HomeSelectedBackground({ image }: { image: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="home-selected-background" aria-hidden="true">
      <img src={image} alt="" onError={() => setFailed(true)} />
    </div>
  );
}

export function HomeSelectedPhotoCards({
  photos,
}: {
  photos: SelectedHomePhotography["photos"];
}) {
  const [preview, setPreview] = useState<SelectedHomePhoto | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <section
        className="home-selected-photos"
        aria-label="Selected healthcare pictures"
      >
        {photos.map((photo, index) => (
          <figure className="home-selected-frame" key={photo.id}>
            <span className="home-selected-number" aria-hidden="true">
              0{index + 1}
            </span>
            <button
              className="home-selected-photo-button"
              aria-label={`Enlarge ${photo.name} image`}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setPreview(photo);
              }}
            >
              <SelectedPhoto photo={photo} />
              <span className="home-selected-enlarge">
                <ZoomIn size={14} aria-hidden="true" /> Enlarge
              </span>
            </button>
            <figcaption>{photo.name}</figcaption>
          </figure>
        ))}
      </section>
      {preview && (
        <Modal
          title={`${preview.name} · selected image`}
          close={() => setPreview(null)}
          returnFocusTo={trigger.current}
        >
          <div className="image-preview home-selected-preview">
            <SelectedPhoto photo={preview} />
          </div>
          <p>Selected website image. No live stock or prices are implied.</p>
        </Modal>
      )}
    </>
  );
}

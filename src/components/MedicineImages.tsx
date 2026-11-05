import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Pill,
  Upload,
  Trash2,
  ZoomIn,
  ShieldCheck,
} from "lucide-react";
import Modal from "./Modal";
export type Medicine = {
  id: number;
  name: string;
  strength?: string;
  image_version?: string | null;
};
type Preferences = {
  visible: boolean;
  setVisible: (v: boolean) => void;
  preview: (p: Medicine) => void;
  previewOpen: boolean;
};
const Context = createContext<Preferences | null>(null);
export const picturePreferenceKey = (pharmacy: number, user: number) =>
  `smartmed:pictures:v1:${pharmacy}:${user}`;
export function ImagePreferencesProvider({
  pharmacyId,
  userId,
  children,
}: {
  pharmacyId: number;
  userId: number;
  children: React.ReactNode;
}) {
  const key = picturePreferenceKey(pharmacyId, userId);
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(key) !== "hidden";
    } catch {
      return true;
    }
  });
  const [preview, setPreview] = useState<Medicine | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(key, visible ? "visible" : "hidden");
    } catch {
      /* Preference remains usable when browser storage is unavailable. */
    }
  }, [key, visible]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key) setVisible(event.newValue !== "hidden");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  return (
    <Context.Provider
      value={{
        visible,
        setVisible,
        preview: setPreview,
        previewOpen: !!preview,
      }}
    >
      {children}
      {preview && (
        <Modal
          title={`${preview.name} ${preview.strength || ""} · verified image`}
          close={() => setPreview(null)}
        >
          <div className="image-preview">
            <SafeImage medicine={preview} />
          </div>
          <p>
            Product image supplied and confirmed by pharmacy staff. Check the
            medicine name, strength and dosage form before selection.
          </p>
        </Modal>
      )}
    </Context.Provider>
  );
}
export function useImagePreferences() {
  const ctx = useContext(Context);
  if (!ctx) throw Error("Image preferences require an authenticated pharmacy");
  return ctx;
}
export function ImageVisibilityToggle() {
  const { visible, setVisible } = useImagePreferences();
  const id = useId();
  return (
    <label className="image-toggle" htmlFor={id}>
      {visible ? <Eye size={16} /> : <EyeOff size={16} />}
      <span>Show medicine pictures</span>
      <input
        id={id}
        type="checkbox"
        checked={visible}
        onChange={(e) => setVisible(e.target.checked)}
      />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}
export function SafeImage({ medicine }: { medicine: Medicine }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [medicine.id, medicine.image_version]);
  if (!medicine.image_version || failed)
    return (
      <span className="image-fallback">
        <Pill size={27} aria-hidden="true" />
        <span>{failed ? "Image unavailable" : "No verified image"}</span>
      </span>
    );
  return (
    <img
      src={`/api/products/${medicine.id}/image?v=${encodeURIComponent(medicine.image_version)}`}
      alt={`${medicine.name} ${medicine.strength || ""} — staff-verified product image`}
      loading="lazy"
      decoding="async"
      width="320"
      height="240"
      onError={() => setFailed(true)}
    />
  );
}
export function MedicineImage({
  medicine,
  compact = false,
}: {
  medicine: Medicine;
  compact?: boolean;
}) {
  const { visible, preview } = useImagePreferences();
  if (!visible) return null;
  return medicine.image_version ? (
    <button
      type="button"
      className={`medicine-picture ${compact ? "thumbnail" : ""}`}
      aria-label={`Preview picture of ${medicine.name} ${medicine.strength || ""}`}
      title={`Preview ${medicine.name} picture`}
      onClick={() => preview(medicine)}
    >
      <SafeImage medicine={medicine} />
      <ZoomIn size={15} className="picture-zoom" aria-hidden="true" />
    </button>
  ) : (
    <div
      className={`medicine-picture placeholder ${compact ? "thumbnail" : ""}`}
    >
      <SafeImage medicine={medicine} />
    </div>
  );
}
export function MedicineImageManager({
  medicine,
  close,
  onSaved,
}: {
  medicine: Medicine;
  close: () => void;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !verified) return;
    setBusy(true);
    setError("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw Error("Choose a JPEG, PNG or WebP file.");
      if (file.size > 2 * 1024 * 1024)
        throw Error("The image must be 2 MB or smaller.");
      const r = await fetch(`/api/products/${medicine.id}/image`, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-Image-Verified": "true" },
        body: file,
        signal: AbortSignal.timeout(20000),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Image upload failed");
      onSaved();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Medicine picture · ${medicine.name}`}
      close={() => {
        if (!busy) close();
      }}
    >
      <div className="info-banner">
        <ShieldCheck size={20} />
        <span>
          Only upload an approved product photo matching {medicine.name}{" "}
          {medicine.strength}. Never upload a prescription or patient
          information.
        </span>
      </div>
      <form onSubmit={upload}>
        <div className="image-preview upload-preview">
          {url ? (
            <img
              src={url}
              alt="Selected product image preview"
              width="320"
              height="240"
              onError={() => {
                setError("This file cannot be displayed as an image.");
                setFile(null);
              }}
            />
          ) : (
            <SafeImage medicine={medicine} />
          )}
        </div>
        <label className="upload-field">
          Choose medicine picture
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              setError("");
              setVerified(false);
              setFile(e.target.files?.[0] || null);
            }}
          />
        </label>
        <p className="muted">
          JPEG, PNG or WebP · up to 2 MB · 32–4096 pixels per side. Images are
          re-encoded and resized to at most 1600 pixels; metadata is removed.
        </p>
        <label className="confirmation">
          <input
            type="checkbox"
            checked={verified}
            disabled={busy}
            onChange={(e) => setVerified(e.target.checked)}
          />
          <span>
            I verified this picture matches the medicine and strength and is
            approved for use.
          </span>
        </label>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="image-manager-actions">
          <button className="primary" disabled={!file || !verified || busy}>
            <Upload size={16} />
            {busy ? "Saving…" : "Save verified picture"}
          </button>
          {medicine.image_version && (
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const r = await fetch(`/api/products/${medicine.id}/image`, {
                    method: "DELETE",
                    signal: AbortSignal.timeout(15000),
                  });
                  if (!r.ok)
                    throw Error((await r.json()).error || "Removal failed");
                  onSaved();
                  close();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 size={15} />
              Remove picture
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
export function ImageManageButton({
  medicine,
  onClick,
}: {
  medicine: Medicine;
  onClick: () => void;
}) {
  return (
    <button
      className="image-manage-button"
      onClick={onClick}
      aria-label={`Manage picture for ${medicine.name}`}
      title="Manage verified medicine picture"
    >
      <ImagePlus size={15} />
      <span>{medicine.image_version ? "Edit picture" : "Add picture"}</span>
    </button>
  );
}

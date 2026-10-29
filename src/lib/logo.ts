import { readPickedFile, type DialogFilter } from "./browser-files";
export const LOGO_EXTENSIONS = ["png", "jpg", "jpeg"];
export const LOGO_FILTERS: DialogFilter[] = [{ name: "Image", extensions: LOGO_EXTENSIONS }];

export async function importLogo(source: string): Promise<string> {
  const file = readPickedFile(source);
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 512 * 1024) {
    throw new Error("Choose a PNG or JPEG logo up to 512 KB.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Cannot read image."); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
export async function readLogoDataUrl(path: string): Promise<string | null> {
  return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(path) ? path : null;
}
export async function removeLogo(): Promise<void> { /* Removed on settings save. */ }


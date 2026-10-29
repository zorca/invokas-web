import { Font } from "@react-pdf/renderer";
import interRegular from "@/assets/fonts/Inter-Regular.ttf?url";
import interMedium from "@/assets/fonts/Inter-Medium.ttf?url";
import interSemiBold from "@/assets/fonts/Inter-SemiBold.ttf?url";
import interBold from "@/assets/fonts/Inter-Bold.ttf?url";

let registered = false;

/**
 * Registers the local Inter TTFs (with latin-ext + cyrillic coverage) for PDF
 * rendering. Called once per JS context — including inside the Comlink worker,
 * which is a separate context with its own copy of these modules.
 */
export function registerPdfFonts(): void {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: interRegular, fontWeight: 400 },
      { src: interMedium, fontWeight: 500 },
      { src: interSemiBold, fontWeight: 600 },
      { src: interBold, fontWeight: 700 },
    ],
  });
  registered = true;
}

import ReactPixel from "react-facebook-pixel";

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let pixelInitialized = false;

export function initMetaPixel(): void {
  if (!PIXEL_ID || pixelInitialized) return;
  ReactPixel.init(PIXEL_ID, undefined, {
    autoConfig: true,
    debug: false,
  });
  pixelInitialized = true;
}

export function trackMetaPageView(): void {
  if (!PIXEL_ID || !pixelInitialized) return;
  ReactPixel.pageView();
}

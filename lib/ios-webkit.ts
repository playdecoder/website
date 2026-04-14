/** `HTMLMediaElement.volume` is a no-op on iPhone/iPad WebKit; iPadOS desktop UA is detected via maxTouchPoints. */
export function isIosLikeWebKitNoProgrammaticVolume(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iP(ad|hone|od)/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

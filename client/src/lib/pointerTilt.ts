export function calculatePointerTilt(clientX: number, clientY: number, rect: Pick<DOMRect, "left" | "top" | "width" | "height">, maxDegrees = 3) {
  const horizontal = (clientX - rect.left) / rect.width - 0.5;
  const vertical = (clientY - rect.top) / rect.height - 0.5;
  return {
    rotateX: Number((-vertical * maxDegrees * 2).toFixed(2)),
    rotateY: Number((horizontal * maxDegrees * 2).toFixed(2)),
  };
}

export function applyPointerTilt(element: HTMLElement, clientX: number, clientY: number) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const tilt = calculatePointerTilt(clientX, clientY, element.getBoundingClientRect());
  element.style.setProperty("--tilt-x", `${tilt.rotateX}deg`);
  element.style.setProperty("--tilt-y", `${tilt.rotateY}deg`);
}

export function resetPointerTilt(element: HTMLElement) {
  element.style.setProperty("--tilt-x", "0deg");
  element.style.setProperty("--tilt-y", "0deg");
}

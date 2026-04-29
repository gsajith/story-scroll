export function attachGyroscope(
  onOrientation: (e: DeviceOrientationEvent) => void,
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqPerm = (DeviceOrientationEvent as any).requestPermission;
  if (typeof reqPerm === "function") {
    reqPerm()
      .then((state: string) => {
        if (state === "granted")
          window.addEventListener("deviceorientation", onOrientation);
      })
      .catch(() => {});
  } else {
    window.addEventListener("deviceorientation", onOrientation);
  }
  return () => window.removeEventListener("deviceorientation", onOrientation);
}

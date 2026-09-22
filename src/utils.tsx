function isIPv4(str : string) {
  const parts = str.split(".");
  return parts.length === 4 &&
    parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

export { isIPv4 }
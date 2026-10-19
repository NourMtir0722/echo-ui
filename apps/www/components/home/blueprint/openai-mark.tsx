/**
 * OpenAI's mark, for the key that adds Echo in ChatGPT: one petal, drawn six
 * times round its centre, in currentColor. Copied from Wikimedia Commons,
 * File:ChatGPT_logo.svg (paths unedited). It is OpenAI's trademark, shown to
 * say the key opens Echo's listing in ChatGPT.
 */
export const PETAL =
  "M1107.3 299.1c-197.999 0-373.9 127.3-435.2 315.3L650 743.5v427.9c0 21.4 11 40.4 29.4 51.4l344.5 198.515V833.3h.1v-27.9L1372.7 604c33.715-19.52 70.44-32.857 108.47-39.828L1447.6 450.3C1361 353.5 1237.1 298.5 1107.3 299.1zm0 117.5-.6.6c79.699 0 156.3 27.5 217.6 78.4-2.5 1.2-7.4 4.3-11 6.1L952.8 709.3c-18.4 10.4-29.4 30-29.4 51.4V1248l-155.1-89.4V755.8c-.1-187.099 151.601-338.9 339-339.2z";

export function OpenAIMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="250 250 1906 1906" aria-hidden="true" fill="currentColor">
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <path key={r} d={PETAL} transform={`rotate(${r} 1203 1203)`} />
      ))}
    </svg>
  );
}

import { initials, avatarColor } from "@/lib/display";

export const AVATAR_EMOJIS = [
  "🦊", "🐼", "🐨", "🦁", "🐯", "🐸", "🐵", "🐱", "🐶", "🦉",
  "🐙", "🦄", "🐝", "🐬", "🦖", "🌮", "🚀", "🌵", "🎸", "⚽",
] as const;

/**
 * Renders a user's avatar: an uploaded image, a picked emoji preset
 * ("emoji:🦊"), or initials as a fallback.
 */
export function Avatar({
  url,
  name,
  size = 36,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const dim = { width: size, height: size };
  const fontSize = Math.round(size * 0.5);

  if (url && url.startsWith("emoji:")) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-full"
        style={{ ...dim, backgroundColor: avatarColor(name), fontSize }}
        aria-hidden
      >
        {url.slice("emoji:".length)}
      </span>
    );
  }

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={dim}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-medium text-white"
      style={{ ...dim, backgroundColor: avatarColor(name), fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

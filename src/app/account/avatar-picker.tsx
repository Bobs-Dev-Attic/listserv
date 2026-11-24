"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AVATAR_EMOJIS } from "@/components/avatar";
import { setAvatarAction } from "./actions";

export function AvatarPicker({
  userId,
  currentUrl,
  name,
}: {
  userId: string;
  currentUrl: string | null;
  name: string;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  function save(url: string | null) {
    setPreview(url);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("avatar_url", url ?? "");
      await setAvatarAction(fd);
      router.refresh();
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setUploading(false);
    save(data.publicUrl);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar url={preview} name={name} size={64} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-secondary px-3 py-1.5"
            disabled={uploading || pending}
          >
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => save(null)}
              className="btn-secondary px-3 py-1.5"
              disabled={pending}
            >
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div>
        <p className="mb-2 text-sm text-slate-400">Or pick one:</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_EMOJIS.map((e) => {
            const url = `emoji:${e}`;
            const active = preview === url;
            return (
              <button
                key={e}
                type="button"
                onClick={() => save(url)}
                disabled={pending}
                className={`grid h-10 w-10 place-items-center rounded-full text-lg transition ${
                  active
                    ? "ring-2 ring-[#4a90d2]"
                    : "ring-1 ring-white/10 hover:ring-white/30"
                } bg-white/5`}
                aria-label={`Use ${e} avatar`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

export function TrackOnMount({ name, entityId }: { name: string; entityId?: string }) {
  useEffect(() => {
    track(name, entityId);
  }, [name, entityId]);
  return null;
}

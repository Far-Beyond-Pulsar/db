import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BASE = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH) || "";

export function p(path: string): string {
  if (path.startsWith("http")) return path;
  return `${BASE}${path}`;
}

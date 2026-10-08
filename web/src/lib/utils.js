import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...a) => twMerge(clsx(a));
export const rp = n => "Rp" + Number(n).toLocaleString("id-ID");
export const safeUrl = u => /^(https?:\/\/|\/|\.\/)/i.test(u || "") ? u : "";
export const pad2 = n => String(n).padStart(2, "0");

export function storageGet(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } }
export function storageSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

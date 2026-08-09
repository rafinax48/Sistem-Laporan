import type { Band } from "@/lib/types";

const BAND_STYLE: Record<Band, string> = {
  "Sangat Bagus":
    "border-green bg-[#E6F4EC] text-[#1E7A46]",
  Lumayan:
    "border-amber bg-[#FBF3DE] text-[#B07D1B]",
  "Tidak Layak":
    "border-red bg-[#FBECEA] text-[#C0392B]",
};

export default function BandBadge({ band }: { band: Band }) {
  return (
    <span
      className={`inline-flex -rotate-1 items-center rounded-md border-2 px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(20,33,46,0.08)] ${BAND_STYLE[band]}`}
    >
      {band}
    </span>
  );
}

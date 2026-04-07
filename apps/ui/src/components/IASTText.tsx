import { useMemo } from "react";
import { barahaToIASTSegments } from "../lib/iastConverter";

interface Props {
  baraha: string;
  className?: string;
}

/**
 * Renders Baraha text as IAST with clear svara markings:
 * - Svarita: bold with a colored top border (amber/saffron accent line)
 * - Anudātta: subtle underline
 * - Udātta (plain): normal weight, no decoration
 */
export default function IASTText({ baraha, className = "" }: Props) {
  const segments = useMemo(() => barahaToIASTSegments(baraha), [baraha]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.svara === "svarita") {
          return (
            <span
              key={i}
              className="iast-svarita"
            >
              {seg.text}
            </span>
          );
        }
        if (seg.svara === "anudatta") {
          return (
            <span
              key={i}
              className="iast-anudatta"
            >
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}

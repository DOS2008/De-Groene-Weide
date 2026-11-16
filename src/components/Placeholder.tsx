/**
 * Renders content text and marks every "[…]" part as a placeholder that
 * Bert still has to fill in. Searching the repo for "[" finds them all.
 */
export function WithPlaceholders({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <span key={i} className="placeholder">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** A missing fact (null in the content files), shown as a placeholder. */
export function Missing({ what }: { what: string }) {
  return <span className="placeholder">[{what}]</span>;
}

/** Shows `value`, or a placeholder naming what is missing. */
export function Fact({ value, what }: { value: string | null; what: string }) {
  return value ? <>{value}</> : <Missing what={what} />;
}

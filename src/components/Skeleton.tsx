export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-shimmer rounded-lg ${className}`}
      style={style}
    />
  );
}

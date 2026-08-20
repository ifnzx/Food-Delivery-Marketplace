export function Icon({
  name,
  fill = false,
  className = "",
  size,
}: {
  name: string;
  fill?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
        fontSize: size,
      }}
    >
      {name}
    </span>
  );
}

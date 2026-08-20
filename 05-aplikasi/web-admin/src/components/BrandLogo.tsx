export function BrandLogo({
  size = 72,
  className,
  variant = "mark",
  light = false,
}: {
  size?: number;
  className?: string;
  variant?: "mark" | "full";
  light?: boolean;
}) {
  if (variant === "full") {
    return (
      <img
        src="/logo-antarq-black.png"
        alt="ANTARQ"
        height={size}
        className={className}
        style={{
          height: size,
          width: "auto",
          filter: light ? "brightness(0) invert(1)" : "none",
        }}
      />
    );
  }
  return (
    <img
      src="/logo-antarq-mark.svg"
      alt="ANTARQ"
      width={size}
      height={size}
      className={className}
      style={light ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}

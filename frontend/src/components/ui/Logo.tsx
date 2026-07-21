export function Logo({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/pile.png"
      alt=""
      width={size}
      height={size}
      className="rounded-md object-cover"
      style={{ width: size, height: size }}
    />
  );
}

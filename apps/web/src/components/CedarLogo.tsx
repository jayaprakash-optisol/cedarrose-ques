export function CedarLogo({ withText = true, size = 48 }: { readonly withText?: boolean; readonly size?: number }) {
  const radius = size === 48 ? 10 : 8;
  const fontSize = size === 48 ? 18 : 14;
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center bg-[var(--color-cr-navy)] text-white font-bold"
        style={{ width: size, height: size, borderRadius: radius, fontSize }}
      >
        CR
      </div>
      {withText && (
        <span className="font-semibold text-[var(--color-cr-navy)] text-[18px] leading-none">
          Cedar Rose
        </span>
      )}
    </div>
  );
}

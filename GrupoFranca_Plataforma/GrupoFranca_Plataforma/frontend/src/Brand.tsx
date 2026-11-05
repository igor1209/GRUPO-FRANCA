type BrandProps = { className?: string };
export function Brand({ className = "" }: BrandProps) {
  return (
    <img
      className={`official-logo ${className}`}
      src="/assets/grupo-franca.svg?v=5"
      width="739"
      height="226"
      alt="Grupo França"
    />
  );
}

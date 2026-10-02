export function VatsimLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <img
      src="/vatsim.svg"
      alt="VATSIM Logo"
      className={className}
    />
  );
}

export function VatsimMark({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <img
      src="/vatsim.svg"
      alt="VATSIM"
      className={className}
    />
  );
}

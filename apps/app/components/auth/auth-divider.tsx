export function AuthDivider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-3 text-[11px] tracking-wide text-muted-foreground/70">
          or continue with email
        </span>
      </div>
    </div>
  );
}

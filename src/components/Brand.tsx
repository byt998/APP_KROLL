type BrandProps = {
  description?: string;
};

export function Brand({ description }: BrandProps) {
  return (
    <header className="brand">
      <span className="brand__mark">
        <span>K</span>
      </span>
      <div>
        <p className="brand__name">KROLL</p>
        {description && <p className="brand__description">{description}</p>}
      </div>
    </header>
  );
}

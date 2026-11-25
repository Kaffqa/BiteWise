interface BrandLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Shared BiteWise brand emblem referencing the canonical SVG logo in /public/logo.svg.
 */
export default function BrandLogo({
  className = 'w-9 h-9 object-contain',
  alt = 'BiteWise Logo',
}: BrandLogoProps) {
  return <img src="/logo.svg" alt={alt} className={className} />;
}

import { Link } from 'react-router-dom';

interface BrandLinkProps {
  brandClassName?: string;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
  label?: string;
}

export function BrandLink({
  brandClassName,
  className = 'flex items-center gap-3',
  iconClassName,
  imageClassName = 'h-6 w-6 rounded-xl',
  label = 'NeuralDocx',
}: BrandLinkProps) {
  return (
    <Link to="/" className={className}>
      <div className={iconClassName}>
        <img
          src="/compliance-icon.svg"
          alt={label}
          className={imageClassName}
        />
      </div>
      <span className={brandClassName}>{label}</span>
    </Link>
  );
}

import React from 'react';

const NextImage = ({
  src,
  alt,
  fill,
  priority,
  sizes,
  className,
  onError,
  ...rest
}: {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  onError?: () => void;
  [key: string]: unknown;
}) => {
  return (
    <img
      src={typeof src === 'string' ? src : ''}
      alt={alt}
      className={className}
      onError={onError}
      data-testid="next-image"
      {...(fill ? { 'data-fill': 'true' } : {})}
    />
  );
};

export default NextImage;

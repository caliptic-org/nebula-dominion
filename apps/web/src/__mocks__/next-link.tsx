import React from 'react';

const NextLink = ({
  href,
  children,
  className,
  style,
  onClick,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  [key: string]: unknown;
}) => {
  return (
    <a href={href} className={className} style={style} onClick={onClick} {...rest}>
      {children}
    </a>
  );
};

export default NextLink;

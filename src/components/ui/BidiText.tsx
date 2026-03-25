interface BidiTextProps {
  children: React.ReactNode;
  as?: 'span' | 'p' | 'div';
  className?: string;
}

export function BidiText({ children, as: Tag = 'span', className }: BidiTextProps) {
  return <Tag style={{ unicodeBidi: 'isolate' }} className={className}>{children}</Tag>;
}

import React from 'react';

export default function Skeleton({
  variant = 'text', // 'text' | 'rect' | 'circle' | 'card'
  width,
  height,
  className = '',
  style
}) {
  const classes = ['ui-skeleton', `ui-skeleton-${variant}`, className].filter(Boolean).join(' ');

  const computedStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style
  };

  return <div className={classes} style={computedStyle} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="ui-card p-5">
      <Skeleton variant="text" width="40%" height="16px" className="mb-3" />
      <Skeleton variant="text" width="70%" height="28px" className="mb-2" />
      <Skeleton variant="text" width="50%" height="14px" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="ui-table-row-skeleton">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="p-4">
              <Skeleton
                variant="text"
                width={cIdx === 0 ? '60%' : cIdx === 1 ? '40%' : '80%'}
                height="16px"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

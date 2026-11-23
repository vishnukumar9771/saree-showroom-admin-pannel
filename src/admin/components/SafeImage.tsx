import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F0E8] via-[#EEE7E3] to-[#D8C9B4] text-[#641E32] border border-[#D8C9B4] p-3 text-center ${className}`}
        role="img"
        aria-label={alt || fallbackTitle || 'Aaranya textile'}
      >
        <Sparkles className="w-5 h-5 text-[#C3A46C] mb-1.5" />
        <span className="font-serif text-xs font-medium text-[#3B1422] line-clamp-2">
          {fallbackTitle || alt || 'AARANYA Archive'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
};

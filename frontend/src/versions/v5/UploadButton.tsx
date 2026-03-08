import { useRef, useEffect, useState } from "react";
import { useUpload } from "../../hooks/useUpload";

interface UploadButtonProps {
  onSuccess?: () => void;
}

export function UploadButton({ onSuccess }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress, error } = useUpload(onSuccess);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleClick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  if (showError && error) {
    return <span className="text-xs text-red-400">{error}</span>;
  }

  if (uploading) {
    return (
      <span className="text-xs text-gray-500">
        uploading&hellip; {progress?.percent ?? 0}%
      </span>
    );
  }

  return (
    <>
      <span
        onClick={handleClick}
        className="text-lg text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer select-none leading-none"
      >
        +
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}

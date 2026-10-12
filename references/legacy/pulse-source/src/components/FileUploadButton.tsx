import React, { useRef, useState } from 'react';
import { Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadButtonProps {
  onUploadSuccess?: (data: any) => void;
  isLight?: boolean;
  className?: string;
}

export function FileUploadButton({ onUploadSuccess, isLight, className = "" }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      toast.success(`File "${file.name}" uploaded successfully`);
      if (onUploadSuccess) onUploadSuccess(data);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`p-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
          isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
        } ${
          isLight
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
        }`}
        title="Upload File to Azrail Memory"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

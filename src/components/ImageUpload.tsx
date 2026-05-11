import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import StorageService from '../services/StorageService';

interface ImageUploadProps {
  onImageSelect: (url: string) => void;
  currentImage?: string;
  label?: string;
  documentId?: string; // Used for storage path (e.g., menu item ID)
  onDelete?: (url: string) => Promise<void>;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  currentImage,
  label = 'Upload Image',
  documentId = 'temp',
  onDelete
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || '');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file
    const validationError = StorageService.validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    // Create local preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Firebase Storage
    setUploading(true);
    try {
      const downloadURL = await StorageService.uploadMenuImage(file, documentId);
      onImageSelect(downloadURL);
      toast.success('Image uploaded successfully');
      setError('');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload image';
      setError(errorMessage);
      toast.error(errorMessage);
      setPreview(currentImage || '');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      if (currentImage && onDelete) {
        await onDelete(currentImage);
      }
      setPreview('');
      onImageSelect('');
      toast.success('Image removed');
      setError('');
    } catch (err: any) {
      toast.error('Failed to remove image');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
        {label}
      </label>

      {/* Preview */}
      {preview ? (
        <div className="relative w-full h-48 sm:h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-3 bg-orange-600 hover:bg-orange-700 text-white rounded-full transition-all disabled:opacity-50"
              title="Replace image"
            >
              <Upload size={20} />
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={uploading}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all disabled:opacity-50"
              title="Remove image"
            >
              <X size={20} />
            </button>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-orange-500" />
              <span className="text-white text-sm font-semibold">Uploading...</span>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-48 sm:h-56 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex flex-col items-center justify-center gap-3 disabled:opacity-50 cursor-pointer group"
        >
          <div className="text-gray-400 group-hover:text-orange-500 transition-colors">
            <Upload size={32} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Click to upload image
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              or drag and drop
            </p>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-orange-500" />
            </div>
          )}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        aria-label="Upload image"
      />

      {/* Help Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Supported: JPEG, PNG, WebP • Max size: 5MB • Images are compressed automatically
      </p>
    </div>
  );
};

export default ImageUpload;

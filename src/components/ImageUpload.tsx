import React, { useRef } from 'react';
import { Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={() => inputRef.current?.click()}
      className="bg-transparent border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all rounded-md px-3"
    >
      <Image className="h-4 w-4" />
      <span className="sr-only">Upload image</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
    </Button>
  );
};

export default ImageUpload; 
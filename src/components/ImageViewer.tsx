
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const ImageViewer = ({ imageUrl, isOpen, onClose }: ImageViewerProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <AspectRatio ratio={16 / 9}>
          <img
            src={imageUrl}
            alt="Comprovante em alta resolução"
            className="w-full h-full object-contain"
          />
        </AspectRatio>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;

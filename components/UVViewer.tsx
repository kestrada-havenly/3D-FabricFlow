import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { UVMeshData } from '../types';

interface UVViewerProps {
  isOpen: boolean;
  onClose: () => void;
  textureUrl: string | null;
  uvData: UVMeshData[];
}

export const UVViewer: React.FC<UVViewerProps> = ({
  isOpen,
  onClose,
  textureUrl,
  uvData
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (white or texture)
    if (textureUrl) {
      const img = new Image();
      img.src = textureUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawUVs(ctx, canvas.width, canvas.height);
      };
    } else {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawUVs(ctx, canvas.width, canvas.height);
    }

  }, [isOpen, textureUrl, uvData]);

  const drawUVs = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    uvData.forEach(meshData => {
      const { uvs, index } = meshData;
      
      if (index) {
        // Indexed geometry
        for (let i = 0; i < index.length; i += 3) {
          const idx1 = index[i];
          const idx2 = index[i + 1];
          const idx3 = index[i + 2];

          const u1 = uvs[idx1 * 2] * width;
          const v1 = (1 - uvs[idx1 * 2 + 1]) * height;
          
          const u2 = uvs[idx2 * 2] * width;
          const v2 = (1 - uvs[idx2 * 2 + 1]) * height;
          
          const u3 = uvs[idx3 * 2] * width;
          const v3 = (1 - uvs[idx3 * 2 + 1]) * height;

          ctx.moveTo(u1, v1);
          ctx.lineTo(u2, v2);
          ctx.lineTo(u3, v3);
          ctx.lineTo(u1, v1);
        }
      } else {
        // Non-indexed geometry
        for (let i = 0; i < uvs.length / 2; i += 3) {
           const u1 = uvs[i * 2] * width;
           const v1 = (1 - uvs[i * 2 + 1]) * height;

           const u2 = uvs[(i + 1) * 2] * width;
           const v2 = (1 - uvs[(i + 1) * 2 + 1]) * height;

           const u3 = uvs[(i + 2) * 2] * width;
           const v3 = (1 - uvs[(i + 2) * 2 + 1]) * height;

           ctx.moveTo(u1, v1);
           ctx.lineTo(u2, v2);
           ctx.lineTo(u3, v3);
           ctx.lineTo(u1, v1);
        }
      }
    });

    ctx.stroke();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">UV Map Inspector</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 bg-gray-50 flex-1 overflow-auto flex items-center justify-center">
          <div className="relative shadow-lg border border-gray-200 bg-white">
            <canvas 
              ref={canvasRef} 
              width={1024} 
              height={1024} 
              className="w-full h-auto max-w-[600px] max-h-[600px] object-contain"
            />
          </div>
        </div>
        
        <div className="p-3 bg-white border-t border-gray-100 text-xs text-gray-500 flex justify-between">
           <span>Green lines represent the UV mesh layout.</span>
           <span>{uvData.length} Meshes Loaded</span>
        </div>
      </div>
    </div>
  );
};

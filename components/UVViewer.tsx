import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { UVMeshData } from '../types';

interface UVViewerProps {
  isOpen: boolean;
  onClose: () => void;
  textureUrl: string | null;
  uvData: UVMeshData[];
}

export const UVViewer: React.FC<UVViewerProps> = ({ isOpen, onClose, textureUrl, uvData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [imageAspect, setImageAspect] = useState(1);
  
  // Reset scale when opening
  useEffect(() => {
    if (isOpen) setScale(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const size = 600; // Base resolution
    const width = size;
    const height = size * (textureUrl ? (1/imageAspect) : 1); 
    
    // Set actual canvas size
    canvas.width = width * scale;
    canvas.height = height * scale;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Texture Background
    const drawContent = () => {
        // Draw UVs
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'; // Bright Green for visibility
        ctx.lineWidth = 1;
        ctx.beginPath();

        uvData.forEach(mesh => {
            const { uvs, index, count } = mesh;
            
            // Helper to get Coordinate
            const getCoord = (i: number) => {
                return {
                    x: uvs[i * 2] * canvas.width,
                    y: (1 - uvs[i * 2 + 1]) * canvas.height // Flip Y because canvas origin is top-left
                };
            };

            if (index) {
                // Indexed Geometry
                for (let i = 0; i < index.length; i += 3) {
                    const a = getCoord(index[i]);
                    const b = getCoord(index[i + 1]);
                    const c = getCoord(index[i + 2]);
                    
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.lineTo(c.x, c.y);
                    ctx.lineTo(a.x, a.y);
                }
            } else {
                // Non-indexed Geometry
                for (let i = 0; i < count; i += 3) {
                    const a = getCoord(i);
                    const b = getCoord(i + 1);
                    const c = getCoord(i + 2);

                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.lineTo(c.x, c.y);
                    ctx.lineTo(a.x, a.y);
                }
            }
        });
        ctx.stroke();
    };

    if (textureUrl) {
        const img = new Image();
        img.src = textureUrl;
        img.onload = () => {
            setImageAspect(img.width / img.height);
            // Re-calc height based on loaded aspect if it changed
            const correctHeight = width * (img.height / img.width);
            canvas.height = correctHeight * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Darken image slightly so green lines pop
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0,0, canvas.width, canvas.height);
            
            drawContent();
        };
    } else {
        // Draw a placeholder grid if no texture
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawContent();
    }

  }, [isOpen, textureUrl, uvData, scale, imageAspect]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] max-w-[90vw] w-auto overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Maximize size={20} className="text-indigo-600"/>
            <h3 className="font-bold text-gray-800">UV Map Inspector</h3>
            <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
               {uvData.length} Mesh{uvData.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex bg-white rounded-lg border border-gray-200 mr-4">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="p-1.5 hover:bg-gray-50 text-gray-600 border-r border-gray-200"><ZoomOut size={16}/></button>
                <button onClick={() => setScale(s => Math.min(3, s + 0.5))} className="p-1.5 hover:bg-gray-50 text-gray-600"><ZoomIn size={16}/></button>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
               <X size={20} />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto p-8 bg-neutral-100 flex items-center justify-center min-w-[500px] min-h-[400px]">
           <canvas ref={canvasRef} className="shadow-lg border border-gray-300 bg-white" />
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-center text-gray-500">
          Green lines represent the UV wireframe of your model mapped onto the 2D texture space (0,0 to 1,1).
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Move, RotateCw, Maximize, FileBox, Image as ImageIcon, Trash2, Camera, Ruler, ScanLine, ChevronsLeftRight, ChevronsUpDown, Lock, Unlock, Sun, Minus, Plus, Grid3x3, BoxSelect, Map, MousePointer2 } from 'lucide-react';
import { TextureTransform, Unit } from '../types';

interface ControlPanelProps {
  transform: TextureTransform;
  onTransformChange: (newTransform: TextureTransform) => void;
  onModelUpload: (file: File) => void;
  onTextureUpload: (file: File) => void;
  onResetCamera: () => void;
  onClearScene: () => void;
  showDimensions: boolean;
  onToggleDimensions: () => void;
  showWireframe: boolean;
  onToggleWireframe: () => void;
  showUVGrid: boolean;
  onToggleUVGrid: () => void;
  showUVViewer?: boolean;
  onToggleUVViewer?: () => void;
  modelName?: string;
  textureName?: string;
  unit: Unit;
  setUnit: (unit: Unit) => void;
  textureMeta: { width: number; height: number } | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  ambientIntensity: number;
  onAmbientIntensityChange: (value: number) => void;
  selectedMeshName?: string | null;
  onDeselectMesh?: () => void;
  useTriplanar: boolean;
  onToggleTriplanar: () => void;
  useSubmeshScale: boolean;
  setUseSubmeshScale: (val: boolean) => void;
  uvStandardSize: number;
  onUvStandardSizeChange: (val: number) => void;
  selectedMeshHeight?: number | null;
}

// -- Sub-component for Enhanced Number Inputs --
interface SmartNumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit: string;
  step?: number;
  min?: number;
  disabled?: boolean;
}

const SmartNumberInput: React.FC<SmartNumberInputProps> = ({ 
  label, 
  value, 
  onChange, 
  unit, 
  step = 0.1, 
  min = 0.1, 
  disabled 
}) => {
  // Local string state to allow for smooth typing (e.g. typing "1." without auto-format kicking in)
  const [localStr, setLocalStr] = useState(value.toFixed(2));
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startValRef = useRef(value);
  const startXRef = useRef(0);

  // Sync with parent value when not being actively edited by keyboard
  useEffect(() => {
    if (!isFocused && !isDragging) {
      setLocalStr(value.toFixed(2));
    }
  }, [value, isFocused, isDragging]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setLocalStr(str);
    const num = parseFloat(str);
    if (!isNaN(num) && num >= min) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // On blur, force format to clean up (e.g. "12." becomes "12.00")
    setLocalStr(value.toFixed(2));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const multiplier = e.shiftKey ? 10 : 1;
      onChange(value + (step * multiplier));
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const multiplier = e.shiftKey ? 10 : 1;
      onChange(Math.max(min, value - (step * multiplier)));
    }
  };

  // Scrubbing (Drag) Logic for Label
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    startValRef.current = value;
    startXRef.current = e.clientX;
    document.body.style.cursor = 'ew-resize';
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startXRef.current;
    // Sensitivity: 1 pixel = 1 step
    const change = deltaX * step; 
    const newVal = Math.max(min, startValRef.current + change);
    onChange(newVal);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex-1 min-w-[100px]">
      <div 
        className={`flex items-center justify-between mb-1 ${disabled ? 'opacity-50' : ''}`}
        title="Click and drag to adjust"
      >
        <label 
          onMouseDown={handleMouseDown}
          className={`text-[10px] uppercase font-bold tracking-wider block select-none transition-colors flex items-center gap-1 ${isDragging ? 'text-indigo-600 cursor-ew-resize' : 'text-gray-400 hover:text-indigo-500 cursor-ew-resize'}`}
        >
          {label} ({unit})
        </label>
      </div>
      
      <div className={`flex items-center bg-white border rounded-lg overflow-hidden transition-all ${isFocused ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}>
        <button 
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={disabled}
          className="px-2 py-2 hover:bg-gray-50 active:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors border-r border-gray-100"
        >
          <Minus size={12} />
        </button>
        
        <input
          type="text" // Using text to handle floating point typing better
          inputMode="decimal"
          value={localStr}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full py-1.5 text-center text-sm font-bold font-mono text-gray-900 bg-transparent focus:outline-none min-w-0 placeholder-gray-400"
        />

        <button 
          onClick={() => onChange(value + step)}
          disabled={disabled}
          className="px-2 py-2 hover:bg-gray-50 active:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors border-l border-gray-100"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  transform,
  onTransformChange,
  onModelUpload,
  onTextureUpload,
  onResetCamera,
  onClearScene,
  showDimensions,
  onToggleDimensions,
  showWireframe,
  onToggleWireframe,
  showUVGrid,
  onToggleUVGrid,
  showUVViewer,
  onToggleUVViewer,
  modelName,
  textureName,
  unit,
  setUnit,
  textureMeta,
  onMouseEnter,
  onMouseLeave,
  ambientIntensity,
  onAmbientIntensityChange,
  selectedMeshName,
  onDeselectMesh,
  useTriplanar,
  onToggleTriplanar,
  useSubmeshScale,
  setUseSubmeshScale,
  uvStandardSize,
  onUvStandardSizeChange,
  selectedMeshHeight
}) => {
  const [lockRatio, setLockRatio] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'model' | 'texture') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'model') onModelUpload(e.target.files[0]);
      else onTextureUpload(e.target.files[0]);
    }
  };

  const update = (key: keyof TextureTransform, value: number) => {
    onTransformChange({ ...transform, [key]: value });
  };

  // Convert internal inches to display unit
  const toDisplay = (val: number) => unit === 'mm' ? val * 25.4 : val;
  const toInternal = (val: number) => unit === 'mm' ? val / 25.4 : val;

  // New handler for SmartNumberInputs
  const updateDimension = (dimension: 'width' | 'height', newValDisplay: number) => {
    const newInches = toInternal(newValDisplay);
    const newTransform = { ...transform };

    if (dimension === 'width') {
      newTransform.textureWidth = Math.max(0.1, newInches);
      if (lockRatio && textureMeta) {
         const ratio = textureMeta.height / textureMeta.width;
         newTransform.textureHeight = newTransform.textureWidth * ratio;
      }
    } else {
      newTransform.textureHeight = Math.max(0.1, newInches);
      if (lockRatio && textureMeta) {
         const ratio = textureMeta.width / textureMeta.height;
         newTransform.textureWidth = newTransform.textureHeight * ratio;
      }
    }
    onTransformChange(newTransform);
  };

  // Helpers for Rotation (Radians <-> Degrees)
  const currentDegrees = Math.round((transform.rotation * 180) / Math.PI);
  
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    if (!isNaN(deg)) {
      update('rotation', (deg * Math.PI) / 180);
    }
  };

  return (
    <div 
      onMouseEnter={onMouseEnter} 
      onMouseLeave={onMouseLeave}
      className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto z-10 border border-gray-200 flex flex-col gap-6"
    >
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">FabricFlow 3D</h1>
          <p className="text-sm text-gray-500">Visualizer & Pattern Tool</p>
        </div>
      </div>

      {/* Global Settings */}
      <div className="flex flex-col gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Units</span>
            <div className="flex bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setUnit('in')}
                className={`px-3 py-1 text-xs font-bold transition-colors ${unit === 'in' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                IN
              </button>
              <button
                onClick={() => setUnit('mm')}
                className={`px-3 py-1 text-xs font-bold transition-colors ${unit === 'mm' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                MM
              </button>
            </div>
        </div>
        
        {/* Ambient Light Control */}
        <div className="space-y-1">
             <div className="flex items-center justify-between text-xs text-gray-500 uppercase font-semibold">
                <div className="flex items-center gap-1"><Sun size={12}/> Light Intensity</div>
                <span className="font-mono">{ambientIntensity.toFixed(2)}</span>
             </div>
             <input
                type="range"
                min="0"
                max="3"
                step="0.05"
                value={ambientIntensity}
                onChange={(e) => onAmbientIntensityChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
        </div>
      </div>

      {/* File Uploads */}
      <div className="space-y-3">
        <div className="group relative">
          <label className="flex items-center justify-between w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer transition-colors border border-indigo-100">
            <div className="flex items-center gap-3">
              <FileBox size={20} />
              <span className="font-medium text-sm truncate max-w-[140px]">
                {modelName || 'Upload Model (FBX/OBJ)'}
              </span>
            </div>
            <Upload size={16} />
            <input
              type="file"
              accept=".fbx,.obj"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'model')}
            />
          </label>
        </div>

        <div className="group relative">
          <label className="flex items-center justify-between w-full px-4 py-3 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg cursor-pointer transition-colors border border-pink-100">
            <div className="flex items-center gap-3">
              <ImageIcon size={20} />
              <span className="font-medium text-sm truncate max-w-[140px]">
                {textureName || 'Upload Fabric (Img)'}
              </span>
            </div>
            <Upload size={16} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'texture')}
            />
          </label>
        </div>

        {/* Physical Size (Anchor) Input - Global Scaling */}
        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
           <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-700 uppercase">Reference Size (Anchor)</span>
              <span className="text-[10px] text-indigo-500">1 UV Unit = ?</span>
           </div>
           <SmartNumberInput
              label="Physical Size"
              value={toDisplay(uvStandardSize)}
              onChange={(val) => {
                onUvStandardSizeChange(toInternal(val));
                if (!useSubmeshScale) setUseSubmeshScale(true);
              }}
              unit={unit}
              step={1}
           />
           {selectedMeshHeight !== undefined && selectedMeshHeight !== null && (
             <button
               onClick={() => {
                 onUvStandardSizeChange(selectedMeshHeight);
                 if (!useSubmeshScale) setUseSubmeshScale(true);
               }}
               className="w-full mt-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm transition-colors flex items-center justify-center gap-2"
               title="Set the Standard UV Scale to match the height of the currently selected submesh"
             >
               <Ruler size={12} />
               Set Anchor from Selection ({toDisplay(selectedMeshHeight).toFixed(1)} {unit})
             </button>
           )}
           {!useSubmeshScale && (
             <div className="mt-2 text-[10px] text-indigo-600 italic">
               * Changing this will enable Auto-Scaling mode.
             </div>
           )}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Controls */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fabric Adjustments</h3>
             {selectedMeshName ? (
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 truncate max-w-[120px]" title={selectedMeshName}>
                     {selectedMeshName}
                   </span>
                   {onDeselectMesh && (
                     <button onClick={onDeselectMesh} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                       Reset
                     </button>
                   )}
                </div>
             ) : (
                <span className="text-[10px] text-gray-400 italic mt-0.5">Global (All Parts)</span>
             )}
           </div>
           
           <div className="flex gap-1">
             <button 
               onClick={onToggleTriplanar}
               className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${useTriplanar ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               title="Toggle Triplanar Mapping (Physical Size)"
             >
               <span className="text-[10px] font-bold">TP</span>
             </button>
             <button 
               onClick={() => setUseSubmeshScale(!useSubmeshScale)}
               className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${useSubmeshScale ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               title="Toggle Submesh Auto-Scaling (Physical Size)"
             >
               <span className="text-[10px] font-bold">SM</span>
             </button>
             <button 
               onClick={onToggleWireframe}
               className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${showWireframe ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               title="Toggle Wireframe Overlay"
             >
               <BoxSelect size={14} />
             </button>
             <button 
               onClick={onToggleUVGrid}
               className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${showUVGrid ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               title="Toggle UV Test Grid (3D)"
             >
               <Grid3x3 size={14} />
             </button>
             <button 
               onClick={onToggleUVViewer}
               className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${showUVViewer ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               title="Open UV Map Inspector (2D)"
             >
               <Map size={14} />
             </button>
             <button 
               onClick={onToggleDimensions}
               className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${showDimensions ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               title="Toggle Measurements"
             >
               <Ruler size={14} />
             </button>
           </div>
        </div>

        {/* Texture Physical Size & Info */}
        <div className={`space-y-3 p-3 rounded-lg border transition-colors ${selectedMeshName ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <ScanLine size={16} />
              <span className="font-medium">Physical Size</span>
            </div>
            {selectedMeshName && <MousePointer2 size={12} className="text-indigo-400" />}
          </div>

          {/* Pixel Dimensions Display (Informational Only) */}
          {textureMeta ? (
             <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border border-gray-200 flex flex-col">
                  <span className="text-gray-400 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                    <ChevronsLeftRight size={10} /> PX Width
                  </span>
                  <span className="font-mono font-medium text-gray-700">{textureMeta.width}px</span>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200 flex flex-col">
                  <span className="text-gray-400 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                    <ChevronsUpDown size={10} /> PX Height
                  </span>
                  <span className="font-mono font-medium text-gray-700">{textureMeta.height}px</span>
                </div>
             </div>
          ) : (
            <div className="text-center py-2 text-xs text-gray-400 italic bg-white/50 rounded border border-dashed border-gray-200">
              No texture loaded
            </div>
          )}
          
          {/* Smart Inputs for Width / Height */}
          <div className="flex items-end gap-2 mt-2">
            <SmartNumberInput
              label="Width"
              unit={unit}
              value={toDisplay(transform.textureWidth)}
              onChange={(val) => updateDimension('width', val)}
            />

            <button
              onClick={() => setLockRatio(!lockRatio)}
              className={`mb-2 p-1.5 rounded-md transition-colors ${lockRatio ? 'text-indigo-600 bg-indigo-50 border border-indigo-200' : 'text-gray-400 hover:bg-gray-100 border border-transparent'}`}
              title={lockRatio ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
            >
              {lockRatio ? <Lock size={16} /> : <Unlock size={16} />}
            </button>

            <SmartNumberInput
              label="Height"
              unit={unit}
              value={toDisplay(transform.textureHeight)}
              onChange={(val) => updateDimension('height', val)}
            />
          </div>
        </div>

        {/* Scale Modifier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Maximize size={16} />
              <span>Scale Modifier</span>
            </div>
            <span className="font-mono">{transform.scale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={transform.scale}
            onChange={(e) => update('scale', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <RotateCw size={16} />
              <span>Rotation (deg)</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={currentDegrees}
              onChange={handleRotationChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <input
              type="number"
              min="0"
              max="360"
              value={currentDegrees}
              onChange={handleRotationChange}
              className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
            />
          </div>
        </div>

        {/* Position X */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Move size={16} className="rotate-90" />
              <span>Horizontal Shift</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={transform.offsetX}
            onChange={(e) => update('offsetX', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Position Y */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Move size={16} />
              <span>Vertical Shift</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={transform.offsetY}
            onChange={(e) => update('offsetY', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
      </div>
      
      {/* Scene Actions */}
      <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-3">
        <button 
          onClick={onResetCamera}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          title="Center Model"
        >
          <Camera size={16} />
          Reset View
        </button>
        <button 
          onClick={onClearScene}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
          title="Remove Model & Texture"
        >
          <Trash2 size={16} />
          Clear
        </button>
      </div>

      <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md">
        <strong>Tip:</strong> Drag inside the viewer background to rotate the model like a pottery wheel.
      </div>
    </div>
  );
}
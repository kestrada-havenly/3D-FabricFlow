import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { TextureLoader, RepeatWrapping, Mesh, Texture, MeshStandardMaterial, DoubleSide, Box3, Vector3, SRGBColorSpace, CanvasTexture, NearestFilter, WireframeGeometry, LineSegments, LineBasicMaterial, Group, Color } from 'three';
import { Html, Line } from '@react-three/drei';
import { ModelProps, Unit, UVMeshData } from '../types';

// Helper component for dimension labels and lines
const DimensionLabels = ({ box, unit }: { box: Box3, unit: Unit }) => {
  const { size, center, min, max } = useMemo(() => {
    const s = new Vector3();
    box.getSize(s);
    const c = new Vector3();
    box.getCenter(c);
    return { size: s, center: c, min: box.min, max: box.max };
  }, [box]);

  const Label = ({ position, text }: { position: [number, number, number], text: string }) => (
    <Html position={position} center zIndexRange={[100, 0]}>
      <div className="px-2 py-1 bg-black text-white text-xs font-bold font-mono rounded-md shadow-sm border border-gray-600 whitespace-nowrap opacity-90">
        {text}
      </div>
    </Html>
  );

  // Define line points corresponding to the labels
  // Width: Along the bottom front edge
  const widthPoints = useMemo(() => [
    [min.x, min.y, max.z],
    [max.x, min.y, max.z]
  ] as [number, number, number][], [min, max]);

  // Height: Along the right front edge
  const heightPoints = useMemo(() => [
    [max.x, min.y, max.z],
    [max.x, max.y, max.z]
  ] as [number, number, number][], [min, max]);

  // Depth: Along the right bottom edge
  const depthPoints = useMemo(() => [
    [max.x, min.y, min.z],
    [max.x, min.y, max.z]
  ] as [number, number, number][], [min, max]);

  const lineColor = "#000000"; // Black
  const lineWidth = 1.5;

  // Format values based on Unit (1 inch = 25.4 mm)
  const formatVal = (val: number) => {
    if (unit === 'mm') {
      return `${(val * 25.4).toFixed(0)} mm`;
    }
    return `${val.toFixed(1)} in`;
  };

  return (
    <group>
      {/* Visual Lines with depthTest={false} so they are always visible */}
      <Line points={widthPoints} color={lineColor} lineWidth={lineWidth} depthTest={false} opacity={0.5} transparent />
      <Line points={heightPoints} color={lineColor} lineWidth={lineWidth} depthTest={false} opacity={0.5} transparent />
      <Line points={depthPoints} color={lineColor} lineWidth={lineWidth} depthTest={false} opacity={0.5} transparent />

      {/* Width (X) - Bottom Center */}
      <Label 
        position={[center.x, min.y, max.z]} 
        text={`W: ${formatVal(size.x)}`} 
      />
      {/* Height (Y) - Right Center */}
      <Label 
        position={[max.x, center.y, max.z]} 
        text={`H: ${formatVal(size.y)}`} 
      />
      {/* Depth (Z) - Right Bottom */}
      <Label 
        position={[max.x, min.y, center.z]} 
        text={`D: ${formatVal(size.z)}`} 
      />
    </group>
  );
};

// Generate a procedural checkerboard UV Grid texture
const createUVGridTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    const tileSize = 64;
    
    // Draw checkerboard
    for (let y = 0; y < size / tileSize; y++) {
      for (let x = 0; x < size / tileSize; x++) {
        const isWhite = (x + y) % 2 === 0;
        ctx.fillStyle = isWhite ? '#e0e0e0' : '#404040';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        // Add coordinates
        ctx.font = '10px monospace';
        ctx.fillStyle = isWhite ? '#000000' : '#ffffff';
        ctx.fillText(`${x},${y}`, x * tileSize + 4, y * tileSize + 14);
      }
    }
    
    // Draw borders
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, size, size);
    
    // Draw diagonal
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(size, size);
    ctx.strokeStyle = 'rgba(0,0,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  return tex;
};

export const SceneModel: React.FC<ModelProps> = ({ 
  fbxUrl, 
  textureUrl, 
  transform, 
  submeshTransforms,
  selectedMeshId,
  onMeshSelect,
  showDimensions = true, 
  showWireframe = false,
  showUVGrid = false,
  unit,
  onUVsLoaded
}) => {
  const { gl } = useThree();
  const groupRef = useRef<Group>(null);
  
  // Load the FBX if URL exists
  const fbx = useLoader(FBXLoader, fbxUrl || '');

  // Keep track of all meshes for iteration
  const meshRefs = useRef<Mesh[]>([]);

  // 1. Initial Processing of FBX
  useEffect(() => {
    if (fbx) {
      meshRefs.current = [];
      const data: UVMeshData[] = [];

      fbx.traverse((child) => {
        if ((child as Mesh).isMesh) {
          const m = child as Mesh;
          
          // IMPORTANT: Clone material so each mesh can have independent texture transforms
          // If the model shares materials, we need to break that link for our editor
          if (!Array.isArray(m.material)) {
             m.material = m.material.clone();
          }

          // Generate UUID if missing (standard Three.js objects have them)
          meshRefs.current.push(m);

          // Collect UV Data for Viewer
          if (m.geometry.attributes.uv) {
            data.push({
              uvs: m.geometry.attributes.uv.array as Float32Array,
              index: m.geometry.index ? (m.geometry.index.array as Uint16Array | Uint32Array) : null,
              count: m.geometry.attributes.position.count
            });
          }
        }
      });
      
      if (onUVsLoaded) onUVsLoaded(data);
    }
  }, [fbx, onUVsLoaded]);

  // Calculate bounding box for dimensions based on Meshes only
  const boundingBox = useMemo(() => {
    if (!fbx) return null;
    fbx.updateMatrixWorld(true);
    const box = new Box3();
    let hasMesh = false;
    fbx.traverse((child) => {
      if ((child as Mesh).isMesh) {
        box.expandByObject(child);
        hasMesh = true;
      }
    });
    if (!hasMesh) box.setFromObject(fbx);
    if (box.isEmpty()) {
       box.min.set(-0.5, -0.5, -0.5);
       box.max.set(0.5, 0.5, 0.5);
    }
    return box;
  }, [fbx]);

  // Load the User Texture (Base)
  const userTextureBase = useMemo(() => {
    if (!textureUrl) return null;
    const tex = new TextureLoader().load(textureUrl);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return tex;
  }, [textureUrl, gl]);

  const uvGridTextureBase = useMemo(() => createUVGridTexture(), []);
  
  const baseTexture = showUVGrid ? uvGridTextureBase : userTextureBase;

  // 2. Texture Assignment Logic
  // We need to assign a CLONE of the texture to each mesh so we can offset UVs independently
  useEffect(() => {
    meshRefs.current.forEach(mesh => {
       // Reset material to standard if needed
       if (!(mesh.material instanceof MeshStandardMaterial)) {
          mesh.material = new MeshStandardMaterial({ color: '#f0f0f0', roughness: 0.8 });
       }
       const mat = mesh.material as MeshStandardMaterial;

       if (baseTexture) {
          // Clone the texture structure (shares the image data, lightweight)
          const texClone = baseTexture.clone();
          texClone.colorSpace = baseTexture.colorSpace; // Important to copy encoding
          texClone.wrapS = RepeatWrapping;
          texClone.wrapT = RepeatWrapping;
          
          mat.map = texClone;
          mat.roughness = 1.0;
          mat.metalness = 0.0;
          mat.transparent = true;
          mat.needsUpdate = true;
       } else {
          mat.map = null;
          mat.color.set('#f0f0f0');
          mat.needsUpdate = true;
       }
    });
  }, [baseTexture]);


  // 3. Render Loop: Apply Transforms & Highlights
  useFrame((state) => {
    if (!boundingBox) return;
    const modelSize = new Vector3();
    boundingBox.getSize(modelSize);
    const time = state.clock.getElapsedTime();

    meshRefs.current.forEach(mesh => {
      const mat = mesh.material as MeshStandardMaterial;
      const isSelected = mesh.uuid === selectedMeshId;

      // --- A. Selection Highlight ---
      if (isSelected) {
         // Pulse emissive color
         const pulse = (Math.sin(time * 4) + 1) * 0.15 + 0.1; 
         mat.emissive.setRGB(0.2, 0.4, 1.0); // Blueish tint
         mat.emissiveIntensity = pulse;
      } else {
         mat.emissive.setRGB(0, 0, 0);
         mat.emissiveIntensity = 0;
      }

      // --- B. Texture Transforms ---
      if (mat.map) {
        // Determine which transform to use
        // If mesh has specific transform, use it. Else use global (transform prop)
        const t = (submeshTransforms && submeshTransforms[mesh.uuid]) ? submeshTransforms[mesh.uuid] : transform;
        
        const tex = mat.map;
        const texWidth = Math.max(0.1, t.textureWidth);
        const texHeight = Math.max(0.1, t.textureHeight);

        // Calculate repeat based on model physical size vs texture physical size
        // Note: UV mapping depends on how the mesh was unwrapped. 
        // Assuming reasonably standard UVs (0-1), we try to project the physical size.
        // However, individual meshes might be small parts. 
        // Often tiling is relative to the UV scale. 
        // If we want "Real World Scale", we usually need to know the physical size covered by UV 0-1.
        // For this viewer, we treat the 'scale' slider as the primary driver, adjusted by aspect ratio.

        let repeatX = 1;
        let repeatY = 1;

        // Use the global bounding box size as a reference for "1 scale" to keep things consistent across meshes?
        // Or use the mesh's own bounding box?
        // Using global model size ensures pattern continuity if UVs are laid out together.
        repeatX = (modelSize.x / texWidth) * t.scale;
        repeatY = (modelSize.y / texHeight) * t.scale;

        tex.repeat.set(repeatX, repeatY);
        tex.offset.set(t.offsetX, t.offsetY);
        tex.rotation = t.rotation;
        tex.center.set(0.5, 0.5);
      }
    });
  });

  // 4. Wireframe Logic
  useEffect(() => {
    meshRefs.current.forEach(mesh => {
      let wireframeChild = mesh.children.find(c => c.name === '__wireframe__');
      if (showWireframe) {
        if (!wireframeChild) {
          const wireframeGeo = new WireframeGeometry(mesh.geometry);
          const wireframeMat = new LineBasicMaterial({ 
            color: 0x000000, 
            opacity: 0.2, 
            transparent: true,
            depthTest: false 
          });
          const lines = new LineSegments(wireframeGeo, wireframeMat);
          lines.name = '__wireframe__';
          mesh.add(lines);
        } else {
          wireframeChild.visible = true;
        }
      } else {
        if (wireframeChild) wireframeChild.visible = false;
      }
    });
  }, [showWireframe, fbx]);

  const handlePointerDown = (e: any) => {
    // Stop propagation so we don't click "through" to other meshes easily if overlapping
    e.stopPropagation();
    
    // Check if we clicked a mesh
    if (e.object && (e.object as Mesh).isMesh) {
       // Toggle selection: if clicking same mesh, deselect? Or keep selected? 
       // Usually keep selected. Clicking background (handled by OrbitControls/Canvas) handles deselect? 
       // We need a background click handler for that.
       // For now, just select.
       const mesh = e.object as Mesh;
       if (onMeshSelect) {
         onMeshSelect(mesh.uuid, mesh.name || "Untitled Part");
       }
    }
  };

  const handleMissed = () => {
    if (onMeshSelect) onMeshSelect(null, null);
  };

  return (
    <group 
      ref={groupRef} 
      onPointerDown={handlePointerDown}
      onPointerMissed={handleMissed}
    >
      <primitive object={fbx} dispose={null} />
      {showDimensions && boundingBox && <DimensionLabels box={boundingBox} unit={unit} />}
    </group>
  );
};
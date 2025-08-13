import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Canvas as FabricCanvas } from "fabric";

interface MiniMapProps {
  fabricCanvas: FabricCanvas | null;
  zoom: number;
  panX: number;
  panY: number;
  onViewportChange: (x: number, y: number) => void;
}

export const MiniMap = ({ fabricCanvas, zoom, panX, panY, onViewportChange }: MiniMapProps) => {
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const miniCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!miniCanvasRef.current) return;
    miniCtxRef.current = miniCanvasRef.current.getContext("2d");
  }, []);

  useEffect(() => {
    if (!fabricCanvas || !miniCtxRef.current || !miniCanvasRef.current) return;

    const renderMiniMap = () => {
      const ctx = miniCtxRef.current!;
      const canvas = miniCanvasRef.current!;
      
      // Clear minimap
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Scale down the main canvas content
      const scale = 0.1;
      ctx.save();
      ctx.scale(scale, scale);
      
      // Draw a simplified version of the canvas
      const objects = fabricCanvas.getObjects();
      objects.forEach((obj) => {
        if (!obj.visible) return;
        
        ctx.fillStyle = obj.fill as string || "#000000";
        ctx.fillRect(
          obj.left || 0,
          obj.top || 0,
          (obj.width || 0) * (obj.scaleX || 1),
          (obj.height || 0) * (obj.scaleY || 1)
        );
      });
      
      ctx.restore();
      
      // Draw viewport indicator
      const viewportWidth = (fabricCanvas.width || 800) * scale / zoom;
      const viewportHeight = (fabricCanvas.height || 600) * scale / zoom;
      const viewportX = -panX * scale / zoom;
      const viewportY = -panY * scale / zoom;
      
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    };

    renderMiniMap();
    
    // Re-render when canvas changes
    const handleCanvasChange = () => {
      requestAnimationFrame(renderMiniMap);
    };

    fabricCanvas.on("after:render", handleCanvasChange);
    
    return () => {
      fabricCanvas.off("after:render", handleCanvasChange);
    };
  }, [fabricCanvas, zoom, panX, panY]);

  const handleMiniMapClick = (e: React.MouseEvent) => {
    if (!miniCanvasRef.current || !fabricCanvas) return;
    
    const rect = miniCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert minimap coordinates to canvas coordinates
    const scale = 0.1;
    const canvasX = -(x / scale * zoom - (fabricCanvas.width || 800) / 2);
    const canvasY = -(y / scale * zoom - (fabricCanvas.height || 600) / 2);
    
    onViewportChange(canvasX, canvasY);
  };

  return (
    <Card className="p-2 w-32 h-24">
      <canvas
        ref={miniCanvasRef}
        width={120}
        height={80}
        className="w-full h-full cursor-pointer border rounded"
        onClick={handleMiniMapClick}
      />
    </Card>
  );
};
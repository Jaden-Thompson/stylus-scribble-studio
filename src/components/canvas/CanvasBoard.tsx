import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Path as FabricPath, ActiveSelection } from "fabric";
import getStroke from "perfect-freehand";
import { toast } from "sonner";
import { CanvasToolbar } from "./CanvasToolbar";
import { LayerPanel, Layer } from "./LayerPanel";
import { ZoomPanControls } from "./ZoomPanControls";
import { MiniMap } from "./MiniMap";

export type Tool = "select" | "draw" | "rectangle" | "circle" | "lasso";

type Pt = { x: number; y: number; pressure: number; t: number };

function getSvgPathFromStroke(points: number[][]) {
  if (!points.length) return "";
  const d = points.reduce<string>((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc += `${i === 0 ? "M" : "L"}${x0.toFixed(2)} ${y0.toFixed(2)} `;
    if (i === arr.length - 1) acc += `L${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    return acc;
  }, "");
  return d;
}

export const CanvasBoard = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const fabricElRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState<string>("#3b82f6");
  const [width, setWidth] = useState<number>(6);
  const [smoothing, setSmoothing] = useState<number>(0.6);
  
  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  
  // Layer state
  const [layers, setLayers] = useState<Layer[]>([
    { id: "layer-1", name: "Layer 1", visible: true, locked: false, objects: [] }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");

  const pointsRef = useRef<Pt[]>([]);
  const drawingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Initialize Fabric and overlay
  useEffect(() => {
    if (!fabricElRef.current || !overlayRef.current) return;

    const root = getComputedStyle(document.documentElement);
    const cardHsl = root.getPropertyValue("--card").trim();
    const bgColor = `hsl(${cardHsl})`;

    const fabric = new FabricCanvas(fabricElRef.current, {
      width: 1024,
      height: 640,
      backgroundColor: bgColor,
      selection: true,
    });

    fabricCanvasRef.current = fabric;

    const ctx = overlayRef.current.getContext("2d");
    overlayCtxRef.current = ctx;

    toast.success("Canvas ready! Low-latency pen enabled.");

    return () => {
      fabric.dispose();
      fabricCanvasRef.current = null;
      overlayCtxRef.current = null;
    };
  }, []);

  // Resize canvases to container with HiDPI support
  useEffect(() => {
    const fabric = fabricCanvasRef.current;
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!fabric || !container || !overlay) return;

    let resizeTimeout: NodeJS.Timeout;
    const resize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const w = rect.width;
        const h = Math.max(420, rect.width * 0.625);

        fabric.setDimensions({ width: w, height: h });

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        overlay.width = Math.floor(w * ratio);
        overlay.height = Math.floor(h * ratio);
        overlay.style.width = `${w}px`;
        overlay.style.height = `${h}px`;

        const ctx = overlayCtxRef.current;
        if (ctx) {
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          ctx.clearRect(0, 0, w, h);
        }
        fabric.renderAll();
      }, 100);
    };

    resize();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          resize();
          break;
        }
      }
    });
    ro.observe(container);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Update Fabric interactivity based on tool
  useEffect(() => {
    const fabric = fabricCanvasRef.current;
    if (!fabric) return;
    const drawing = tool === "draw";
    const selecting = tool === "lasso";
    fabric.selection = !drawing && !selecting;
    fabric.skipTargetFind = drawing || selecting;
    fabric.defaultCursor = drawing ? "crosshair" : selecting ? "crosshair" : "default";
    if (selecting) {
      fabric.selectionColor = 'rgba(59, 130, 246, 0.1)';
      fabric.selectionBorderColor = '#3b82f6';
    }
    fabric.renderAll();
  }, [tool]);

  // Zoom & Pan functionality with throttling
  useEffect(() => {
    const fabric = fabricCanvasRef.current;
    if (!fabric) return;

    let transformTimeout: NodeJS.Timeout;
    const updateTransform = () => {
      clearTimeout(transformTimeout);
      transformTimeout = setTimeout(() => {
        fabric.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
        fabric.renderAll();
      }, 16); // ~60fps
    };

    updateTransform();
    return () => clearTimeout(transformTimeout);
  }, [zoom, panX, panY]);

  // Keyboard controls for pan and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isPanning && !drawingRef.current) {
        e.preventDefault();
        setIsPanning(true);
        const fabric = fabricCanvasRef.current;
        if (fabric) {
          fabric.defaultCursor = "grab";
          fabric.skipTargetFind = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isPanning) {
        e.preventDefault();
        setIsPanning(false);
        const fabric = fabricCanvasRef.current;
        if (fabric) {
          fabric.defaultCursor = tool === "draw" ? "crosshair" : "default";
          fabric.skipTargetFind = tool === "draw" || tool === "lasso";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanning, tool]);

  // Mouse wheel zoom with throttling
  useEffect(() => {
    const fabric = fabricCanvasRef.current;
    if (!fabric) return;

    let wheelTimeout: NodeJS.Timeout;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        const delta = e.deltaY;
        const zoomStep = 0.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom + (delta > 0 ? -zoomStep : zoomStep)));
        setZoom(newZoom);
      }, 16);
    };

    const canvas = fabric.upperCanvasEl;
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, [zoom]);

  // Pointer drawing with low-latency RAF and smoothing
  useEffect(() => {
    const overlay = overlayRef.current;
    const ctx = overlayCtxRef.current;
    const fabric = fabricCanvasRef.current;
    if (!overlay || !ctx || !fabric) return;

    const getPos = (e: PointerEvent) => {
      const rect = overlay.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const drawPreview = () => {
      const pts = pointsRef.current;
      if (!pts.length || !drawingRef.current) return;
      
      const canvas = overlayRef.current;
      const rect = canvas?.getBoundingClientRect();
      if (!canvas || !rect) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Only calculate stroke if we have enough points
      if (pts.length < 2) return;
      
      const stroke = getStroke(
        pts.map((p) => [p.x, p.y, p.pressure] as [number, number, number]),
        {
          size: width,
          smoothing,
          thinning: 0.6,
          streamline: 0.4,
          easing: (t) => t,
          simulatePressure: false,
        }
      );
      
      if (!stroke.length) return;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.closePath();
      ctx.fill();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isPanning) {
        overlay.setPointerCapture?.(e.pointerId);
        drawingRef.current = true;
        const { x, y } = getPos(e);
        pointsRef.current = [{ x, y, pressure: 0.5, t: e.timeStamp }];
        e.preventDefault();
      } else if (tool === "draw") {
        overlay.setPointerCapture?.(e.pointerId);
        drawingRef.current = true;
        pointsRef.current = [];
        const { x, y } = getPos(e);
        pointsRef.current.push({ x, y, pressure: e.pressure || 0.5, t: e.timeStamp });
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        drawPreview();
        e.preventDefault();
      } else if (tool === "lasso") {
        overlay.setPointerCapture?.(e.pointerId);
        drawingRef.current = true;
        pointsRef.current = [];
        const { x, y } = getPos(e);
        pointsRef.current.push({ x, y, pressure: 0.5, t: e.timeStamp });
        e.preventDefault();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const { x, y } = getPos(e);
      if (isPanning) {
        const lastPoint = pointsRef.current[pointsRef.current.length - 1];
        if (lastPoint) {
          const deltaX = x - lastPoint.x;
          const deltaY = y - lastPoint.y;
          setPanX(prev => prev + deltaX);
          setPanY(prev => prev + deltaY);
        }
        pointsRef.current = [{ x, y, pressure: 0.5, t: e.timeStamp }];
      } else if (tool === "draw") {
        pointsRef.current.push({ x, y, pressure: e.pressure || 0.5, t: e.timeStamp });
        // Throttle preview updates for better performance
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(drawPreview);
      } else if (tool === "lasso") {
        pointsRef.current.push({ x, y, pressure: 0.5, t: e.timeStamp });
        // Draw lasso preview
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        if (pointsRef.current.length > 1) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y);
          for (let i = 1; i < pointsRef.current.length; i++) {
            ctx.lineTo(pointsRef.current[i].x, pointsRef.current[i].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };

    const finalizeStroke = () => {
      const pts = pointsRef.current;
      drawingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      if (pts.length < 2) return;

      const stroke = getStroke(
        pts.map((p) => [p.x, p.y, p.pressure] as [number, number, number]),
        {
          size: width,
          smoothing,
          thinning: 0.6,
          streamline: 0.4,
          easing: (t) => t,
          simulatePressure: false,
        }
      );
      if (!stroke.length) return;
      const pathData = getSvgPathFromStroke(stroke);
      const path = new FabricPath(pathData, {
        fill: color,
        selectable: true,
        objectCaching: true,
      });
      fabric.add(path);
      fabric.renderAll();
    };

    const finalizeLasso = () => {
      const pts = pointsRef.current;
      drawingRef.current = false;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      if (pts.length < 3) return;

      // Create polygon from lasso points for selection
      const objects = fabric.getObjects();
      const selectedObjects: any[] = [];

      objects.forEach((obj) => {
        const objCenter = obj.getCenterPoint();
        if (isPointInPolygon(objCenter, pts)) {
          selectedObjects.push(obj);
        }
      });

      if (selectedObjects.length > 0) {
        fabric.discardActiveObject();
        if (selectedObjects.length === 1) {
          fabric.setActiveObject(selectedObjects[0]);
        } else {
          const selection = new ActiveSelection(selectedObjects, {
            canvas: fabric,
          });
          fabric.setActiveObject(selection);
        }
        fabric.renderAll();
      }
    };

    const isPointInPolygon = (point: { x: number; y: number }, polygon: Pt[]) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
            (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
          inside = !inside;
        }
      }
      return inside;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isPanning) {
        drawingRef.current = false;
        overlay.releasePointerCapture?.(e.pointerId);
      } else if (tool === "draw") {
        finalizeStroke();
        overlay.releasePointerCapture?.(e.pointerId);
      } else if (tool === "lasso") {
        finalizeLasso();
        overlay.releasePointerCapture?.(e.pointerId);
      }
    };

    overlay.addEventListener("pointerdown", onPointerDown);
    overlay.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      overlay.removeEventListener("pointerdown", onPointerDown);
      overlay.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tool, color, width, smoothing, isPanning]);

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(5, prev + 0.2)), []);
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(0.1, prev - 0.2)), []);
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);
  const handleFitToCanvas = useCallback(() => {
    const fabric = fabricCanvasRef.current;
    if (!fabric) return;
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  const handleViewportChange = useCallback((x: number, y: number) => {
    setPanX(x);
    setPanY(y);
  }, []);

  // Layer management
  const handleLayerSelect = useCallback((id: string) => {
    setActiveLayerId(id);
  }, []);

  const handleLayerAdd = useCallback(() => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      objects: []
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [layers.length]);

  const handleLayerDelete = useCallback((id: string) => {
    if (layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(layers.find(l => l.id !== id)?.id || layers[0].id);
    }
  }, [layers, activeLayerId]);

  const handleLayerToggleVisible = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }, []);

  const handleLayerToggleLock = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  }, []);

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      return newLayers;
    });
  }, []);

  const addRect = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const rect = new Rect({ left: 120, top: 120, fill: color, width: 160, height: 100, rx: 8, ry: 8 });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const addCircle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const circle = new Circle({ left: 160, top: 160, fill: color, radius: 60 });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length === 0) return;
    const last = objects[objects.length - 1];
    canvas.remove(last);
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const clearAll = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !overlayRef.current || !overlayCtxRef.current) return;
    canvas.clear();
    const root = getComputedStyle(document.documentElement);
    const cardHsl = root.getPropertyValue("--card").trim();
    canvas.backgroundColor = `hsl(${cardHsl})`;
    overlayCtxRef.current.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    canvas.renderAll();
    toast("Canvas cleared");
  };

  const exportPNG = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL({ format: "png", multiplier: 2 });
    const a = document.createElement("a");
    a.href = data;
    a.download = `stylus-note-${Date.now()}.png`;
    a.click();
  };

  return (
    <section className="w-full">
      <CanvasToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        width={width}
        setWidth={setWidth}
        smoothing={smoothing}
        setSmoothing={setSmoothing}
        onAddRect={addRect}
        onAddCircle={addCircle}
        onUndo={undo}
        onClearAll={clearAll}
        onExport={exportPNG}
      />

      <div className="flex gap-4">
        <div className="flex-1">
          <div ref={containerRef} className="relative w-full rounded-lg border bg-card shadow-elegant overflow-hidden">
            <canvas ref={fabricElRef} className="block w-full h-auto" />
            <canvas ref={overlayRef} className="absolute inset-0 block" />
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <ZoomPanControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              onFitToCanvas={handleFitToCanvas}
            />
            
            {showMiniMap && (
              <MiniMap
                fabricCanvas={fabricCanvasRef.current}
                zoom={zoom}
                panX={panX}
                panY={panY}
                onViewportChange={handleViewportChange}
              />
            )}
          </div>
          
          <div className="mt-2 text-sm text-muted-foreground">
            Hold <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd> + drag to pan
          </div>
        </div>

        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onLayerSelect={handleLayerSelect}
          onLayerAdd={handleLayerAdd}
          onLayerDelete={handleLayerDelete}
          onLayerToggleVisible={handleLayerToggleVisible}
          onLayerToggleLock={handleLayerToggleLock}
          onLayerReorder={handleLayerReorder}
          fabricCanvas={fabricCanvasRef.current}
        />
      </div>
    </section>
  );
};

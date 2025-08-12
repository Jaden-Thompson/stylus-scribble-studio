import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Path as FabricPath } from "fabric";
import getStroke from "perfect-freehand";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PenLine, MousePointer, Square, Circle as CircleIcon, Undo2, Download, Trash2 } from "lucide-react";

export type Tool = "select" | "draw" | "rectangle" | "circle";

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

    const resize = () => {
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
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Update Fabric interactivity based on tool
  useEffect(() => {
    const fabric = fabricCanvasRef.current;
    if (!fabric) return;
    const drawing = tool === "draw";
    fabric.selection = !drawing;
    fabric.skipTargetFind = drawing;
    fabric.defaultCursor = drawing ? "crosshair" : "default";
    fabric.renderAll();
  }, [tool]);

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
      if (!pts.length) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
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
      rafRef.current = requestAnimationFrame(drawPreview);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (tool !== "draw") return;
      overlay.setPointerCapture?.(e.pointerId);
      drawingRef.current = true;
      pointsRef.current = [];
      const { x, y } = getPos(e);
      pointsRef.current.push({ x, y, pressure: e.pressure || 0.5, t: e.timeStamp });
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawPreview);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingRef.current || tool !== "draw") return;
      const { x, y } = getPos(e);
      pointsRef.current.push({ x, y, pressure: e.pressure || 0.5, t: e.timeStamp });
    };

    const finalizeStroke = () => {
      const pts = pointsRef.current;
      drawingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
      fabric.setActiveObject(path);
      fabric.renderAll();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (tool !== "draw") return;
      finalizeStroke();
      overlay.releasePointerCapture?.(e.pointerId);
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
  }, [tool, color, width, smoothing]);

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
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant={tool === "draw" ? "hero" : "secondary"} onClick={() => setTool("draw")} aria-label="Pen tool">
            <PenLine /> Pen
          </Button>
          <Button variant={tool === "select" ? "default" : "secondary"} onClick={() => setTool("select")} aria-label="Select tool">
            <MousePointer /> Select
          </Button>
          <Button variant="secondary" onClick={addRect} aria-label="Add rectangle">
            <Square />
          </Button>
          <Button variant="secondary" onClick={addCircle} aria-label="Add circle">
            <CircleIcon />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="color" className="text-sm text-muted-foreground">Ink</label>
            <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 p-1" aria-label="Choose color" />
          </div>
          <div className="flex items-center gap-2 w-40">
            <label className="text-sm text-muted-foreground">Width</label>
            <Slider aria-label="Brush width" value={[width]} min={1} max={36} step={1} onValueChange={(v) => setWidth(v[0] ?? width)} />
          </div>
          <div className="flex items-center gap-2 w-48">
            <label className="text-sm text-muted-foreground">Smooth</label>
            <Slider aria-label="Smoothing" value={[smoothing]} min={0} max={1} step={0.05} onValueChange={(v) => setSmoothing(v[0] ?? smoothing)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={undo} aria-label="Undo">
              <Undo2 />
            </Button>
            <Button variant="ghost" onClick={clearAll} aria-label="Clear">
              <Trash2 />
            </Button>
            <Button variant="hero" onClick={exportPNG} aria-label="Export as PNG">
              <Download /> Export
            </Button>
          </div>
        </div>
      </header>

      <div ref={containerRef} className="relative w-full rounded-lg border bg-card shadow-elegant overflow-hidden">
        <canvas ref={fabricElRef} className="block w-full h-auto" />
        <canvas ref={overlayRef} className="absolute inset-0 block" />
      </div>
    </section>
  );
};

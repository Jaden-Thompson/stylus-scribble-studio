import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PenLine, MousePointer, Square, Circle as CircleIcon, Undo2, Download, Trash2 } from "lucide-react";

export type Tool = "select" | "draw" | "rectangle" | "circle";

export const CanvasBoard = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);

  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState<string>("#3b82f6");
  const [width, setWidth] = useState<number>(3);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const root = getComputedStyle(document.documentElement);
    const cardHsl = root.getPropertyValue("--card").trim();
    const bgColor = `hsl(${cardHsl})`;

    const fabric = new FabricCanvas(canvasRef.current, {
      width: 1024,
      height: 640,
      backgroundColor: bgColor,
    });

    fabric.freeDrawingBrush.color = color;
    fabric.freeDrawingBrush.width = width;

    setCanvas(fabric);
    toast.success("Canvas ready! Use your stylus or mouse to write.");

    return () => {
      fabric.dispose();
    };
  }, []);

  // Resize to container
  useEffect(() => {
    if (!canvas || !containerRef.current) return;
    const el = containerRef.current;

    const resize = () => {
      const rect = el.getBoundingClientRect();
      canvas.setDimensions({ width: rect.width, height: Math.max(420, rect.width * 0.625) });
      canvas.renderAll();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [canvas]);

  // Apply tool and brush
  useEffect(() => {
    if (!canvas) return;
    canvas.isDrawingMode = tool === "draw";
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = width;
    }
  }, [canvas, tool, color, width]);

  const addRect = () => {
    if (!canvas) return;
    const rect = new Rect({ left: 120, top: 120, fill: color, width: 160, height: 100, rx: 8, ry: 8 });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new Circle({ left: 160, top: 160, fill: color, radius: 60 });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  const undo = () => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length === 0) return;
    const last = objects[objects.length - 1];
    canvas.remove(last);
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const clearAll = () => {
    if (!canvas) return;
    canvas.clear();
    const root = getComputedStyle(document.documentElement);
    const cardHsl = root.getPropertyValue("--card").trim();
    canvas.backgroundColor = `hsl(${cardHsl})`;
    canvas.renderAll();
    toast("Canvas cleared");
  };

  const exportPNG = () => {
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
          <div className="flex items-center gap-2 w-44">
            <label className="text-sm text-muted-foreground">Width</label>
            <Slider aria-label="Brush width" value={[width]} min={1} max={24} step={1} onValueChange={(v) => setWidth(v[0] ?? width)} />
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
        <canvas ref={canvasRef} className="block w-full h-auto" />
      </div>
    </section>
  );
};

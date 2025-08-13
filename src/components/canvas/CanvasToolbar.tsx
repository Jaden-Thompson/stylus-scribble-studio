import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { PenLine, MousePointer, Square, Circle as CircleIcon, Undo2, Download, Trash2, Lasso } from "lucide-react";
import { Tool } from "./CanvasBoard";

interface CanvasToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  color: string;
  setColor: (color: string) => void;
  width: number;
  setWidth: (width: number) => void;
  smoothing: number;
  setSmoothing: (smoothing: number) => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onUndo: () => void;
  onClearAll: () => void;
  onExport: () => void;
}

export const CanvasToolbar = ({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  smoothing,
  setSmoothing,
  onAddRect,
  onAddCircle,
  onUndo,
  onClearAll,
  onExport,
}: CanvasToolbarProps) => {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant={tool === "draw" ? "hero" : "secondary"} onClick={() => setTool("draw")} aria-label="Pen tool">
          <PenLine /> Pen
        </Button>
        <Button variant={tool === "select" ? "default" : "secondary"} onClick={() => setTool("select")} aria-label="Select tool">
          <MousePointer /> Select
        </Button>
        <Button variant={tool === "lasso" ? "default" : "secondary"} onClick={() => setTool("lasso")} aria-label="Lasso tool">
          <Lasso /> Lasso
        </Button>
        <Button variant="secondary" onClick={onAddRect} aria-label="Add rectangle">
          <Square />
        </Button>
        <Button variant="secondary" onClick={onAddCircle} aria-label="Add circle">
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
          <Button variant="ghost" onClick={onUndo} aria-label="Undo">
            <Undo2 />
          </Button>
          <Button variant="ghost" onClick={onClearAll} aria-label="Clear">
            <Trash2 />
          </Button>
          <Button variant="hero" onClick={onExport} aria-label="Export as PNG">
            <Download /> Export
          </Button>
        </div>
      </div>
    </header>
  );
};
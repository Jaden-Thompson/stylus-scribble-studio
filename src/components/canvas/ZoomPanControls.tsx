import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";

interface ZoomPanControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitToCanvas: () => void;
}

export const ZoomPanControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToCanvas,
}: ZoomPanControlsProps) => {
  return (
    <Card className="p-2 flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="ghost" size="sm" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="sm" onClick={onResetView} title="Reset view">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onFitToCanvas} title="Fit to canvas">
        <Maximize className="h-4 w-4" />
      </Button>
    </Card>
  );
};
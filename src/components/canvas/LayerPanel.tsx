import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Canvas as FabricCanvas } from "fabric";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: any[];
}

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onLayerSelect: (id: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (id: string) => void;
  onLayerToggleVisible: (id: string) => void;
  onLayerToggleLock: (id: string) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
  fabricCanvas: FabricCanvas | null;
}

export const LayerPanel = ({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerToggleVisible,
  onLayerToggleLock,
  onLayerReorder,
}: LayerPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onLayerReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < layers.length - 1) {
      onLayerReorder(index, index + 1);
    }
  };

  if (!isExpanded) {
    return (
      <Card className="p-2 w-48">
        <Button variant="ghost" onClick={() => setIsExpanded(true)} className="w-full justify-start">
          Layers ({layers.length})
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Layers</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onLayerAdd}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`p-2 rounded border cursor-pointer transition-colors ${
              layer.id === activeLayerId ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/50'
            }`}
            onClick={() => onLayerSelect(layer.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate flex-1">{layer.name}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveUp(index);
                  }}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveDown(index);
                  }}
                  disabled={index === layers.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-1 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerToggleVisible(layer.id);
                }}
                className="h-6 w-6 p-0"
              >
                {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerToggleLock(layer.id);
                }}
                className="h-6 w-6 p-0"
              >
                {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerDelete(layer.id);
                }}
                disabled={layers.length <= 1}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
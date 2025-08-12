import { useEffect } from "react";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";
import { Button } from "@/components/ui/button";

const Index = () => {
  useEffect(() => {
    document.title = "Stylus Notes App — Write & Sketch";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Take handwritten notes with your stylus. Fast, fluid canvas with pen, shapes, export.");
    const canonical = document.querySelector('link[rel="canonical"]') ?? document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="container py-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-hero-gradient bg-clip-text text-transparent">Stylus Notes</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">A beautiful, minimal canvas to handwrite notes with your stylus or mouse. Draw, add shapes, undo, and export as PNG.</p>
        <div className="mt-6">
          <Button variant="hero">New Canvas</Button>
        </div>
      </header>
      <main className="container pb-16">
        <CanvasBoard />
      </main>
    </div>
  );
};

export default Index;


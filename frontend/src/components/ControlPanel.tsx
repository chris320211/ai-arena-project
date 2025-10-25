import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";
import { useState } from "react";

export const ControlPanel = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Match Controls</h3>
          <p className="text-sm text-muted-foreground">
            Start the AI battle or adjust settings
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="neon"
            size="lg"
            className="flex-1"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Pause className="h-5 w-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Start Match
              </>
            )}
          </Button>
          
          <Button variant="outline" size="lg">
            <RotateCcw className="h-5 w-5" />
            Reset
          </Button>
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Match Status</span>
            <span className="text-sm font-medium text-foreground">
              {isPlaying ? "In Progress" : "Ready"}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Moves Played</span>
            <span className="text-sm font-medium text-foreground">0</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Turn</span>
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              <Zap className="h-3 w-3" />
              AI Player 1
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

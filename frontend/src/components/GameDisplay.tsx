import { Card } from "@/components/ui/card";

interface GameDisplayProps {
  game: string;
}

export const GameDisplay = ({ game }: GameDisplayProps) => {
  const getGameContent = () => {
    switch (game) {
      case "chess":
        return (
          <div className="aspect-square bg-gradient-to-br from-muted to-background rounded-lg border border-border p-8">
            <div className="grid grid-cols-8 gap-1 h-full">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded ${
                    (Math.floor(i / 8) + i) % 2 === 0
                      ? "bg-secondary"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        );
      
      case "go":
        return (
          <div className="aspect-square bg-gradient-to-br from-muted to-background rounded-lg border border-border p-8">
            <div className="grid grid-cols-9 gap-2 h-full">
              {Array.from({ length: 81 }).map((_, i) => (
                <div key={i} className="rounded-full border border-border/30" />
              ))}
            </div>
          </div>
        );
      
      case "tictactoe":
        return (
          <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-muted to-background rounded-lg border border-border p-8">
            <div className="grid grid-cols-3 gap-4 h-full">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border-2 border-primary/30 rounded-lg" />
              ))}
            </div>
          </div>
        );
      
      case "stocks":
        return (
          <div className="bg-gradient-to-br from-muted to-background rounded-lg border border-border p-8">
            <div className="space-y-4">
              <div className="h-64 border border-border/30 rounded flex items-end gap-2 p-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-primary/50 to-accent-cyan/50 rounded-t"
                    style={{ height: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-border/30 rounded">
                  <div className="text-sm text-muted-foreground">Portfolio Value</div>
                  <div className="text-2xl font-bold text-foreground">$0.00</div>
                </div>
                <div className="p-4 border border-border/30 rounded">
                  <div className="text-sm text-muted-foreground">Daily Change</div>
                  <div className="text-2xl font-bold text-accent-cyan">+0.00%</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="aspect-square bg-gradient-to-br from-muted to-background rounded-lg border border-border flex items-center justify-center">
            <p className="text-muted-foreground">Select a game to begin</p>
          </div>
        );
    }
  };

  return (
    <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground capitalize">
          {game || "Game Arena"}
        </h2>
        <p className="text-sm text-muted-foreground">
          AI models will compete here
        </p>
      </div>
      {getGameContent()}
    </Card>
  );
};

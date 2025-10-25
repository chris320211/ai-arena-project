import { Gamepad2, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  selectedGame: string;
  onGameChange: (game: string) => void;
}

const games = [
  { id: "chess", name: "Chess", icon: "♟" },
  { id: "go", name: "Go", icon: "⚫" },
  { id: "tictactoe", name: "Tic-Tac-Toe", icon: "⨯" },
  { id: "stocks", name: "Stock Trading", icon: "📈" },
];

export const Header = ({ selectedGame, onGameChange }: HeaderProps) => {
  const currentGame = games.find(g => g.id === selectedGame);
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI Arena
            </h1>
            
            <nav className="hidden md:flex items-center gap-6">
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-primary/50 bg-background/50 backdrop-blur-sm text-foreground hover:border-primary hover:bg-primary/10 transition-smooth">
                  <Gamepad2 className="h-4 w-4" />
                  <span className="font-medium">Game</span>
                  <span className="text-xs text-muted-foreground ml-1">({currentGame?.name})</span>
                </button>
                
                <div className="absolute top-full left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out">
                  <div className="bg-popover border border-border rounded-lg shadow-neon overflow-hidden backdrop-blur-sm">
                    <div className="p-2 space-y-1">
                      {games.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => onGameChange(game.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-smooth ${
                            selectedGame === game.id
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "text-foreground hover:bg-primary/10 hover:text-primary border border-transparent"
                          }`}
                        >
                          <span className="text-2xl">{game.icon}</span>
                          <span className="font-medium">{game.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/stats">
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Stats
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

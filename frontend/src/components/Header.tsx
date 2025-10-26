import { useState, useCallback } from "react";
import { Gamepad2, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  selectedGame: string;
  onGameChange: (game: string) => void;
}

const games = [
  { id: "chess", name: "Chess" },
  { id: "go", name: "Go" },
  { id: "stocks", name: "Stocks" },
];

export const Header = ({ selectedGame, onGameChange }: HeaderProps) => {
  const currentGame = games.find(g => g.id === selectedGame);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleGameChange = useCallback(
    (gameId: string) => {
      onGameChange(gameId);
      setIsMenuOpen(false);
    },
    [onGameChange]
  );

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI Arena
            </h1>
            
            <nav className="hidden md:flex items-center gap-6">
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-foreground hover:border-primary/40 hover:from-primary/15 hover:to-primary/10 transition-all duration-300 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <Gamepad2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{currentGame?.name}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isMenuOpen ? "text-foreground translate-y-0.5" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  sideOffset={12}
                  className="z-[200] w-48 rounded-xl border border-border/60 bg-background/95 text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80 p-0"
                >
                  <div className="p-1.5">
                    {games.map((game, index) => (
                      <DropdownMenuItem
                        key={game.id}
                        onSelect={(event) => {
                          event.preventDefault();
                          handleGameChange(game.id);
                        }}
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:bg-accent/60 focus:text-foreground ${
                          selectedGame === game.id
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-sm focus:text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        <span>{game.name}</span>
                        {selectedGame === game.id && (
                          <svg
                            className="w-4 h-4 text-primary animate-in zoom-in duration-200"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <div className="border-t border-border/50 px-3 py-2 bg-muted/30">
                    <p className="text-xs text-muted-foreground">More games coming soon</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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

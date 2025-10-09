import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy } from "lucide-react";
import { eloService } from "@/services/eloService";
import { useEffect, useState } from "react";

interface RecentMatch {
  id: string;
  white: string;
  black: string;
  winner: "white" | "black" | "draw";
  ratingChange: number;
  time: string;
}

export const RecentMatches = () => {
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);

  useEffect(() => {
    const updateMatches = () => {
      const games = eloService.getRecentGames(10);
      // Filter to only show games with GPT-4o and Claude Haiku
      const allowedModels = ['gpt-4o', 'claude-3-haiku-20240307'];
      const filteredGames = games.filter(game =>
        allowedModels.includes(game.whiteModelId) && allowedModels.includes(game.blackModelId)
      );

      const matches = filteredGames.map(game => ({
        id: game.id,
        white: eloService.getModelName(game.whiteModelId),
        black: eloService.getModelName(game.blackModelId),
        winner: game.winner,
        ratingChange: game.ratingChange,
        time: getTimeAgo(game.timestamp)
      }));
      setRecentMatches(matches);
    };

    updateMatches();

    // Update every 5 seconds to show new games
    const interval = setInterval(updateMatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Recent Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentMatches.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No recent matches. Start playing games to see match history!
          </div>
        ) : (
          recentMatches.map((match) => (
            <div
              key={match.id}
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{match.white}</span>
                  <span className="text-muted-foreground text-xs">vs</span>
                  <span className="font-medium text-sm">{match.black}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>±{match.ratingChange} ELO</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {match.time}
                  </div>
                </div>
              </div>
              <div>
                <Badge
                  variant={
                    match.winner === "draw" ? "secondary" :
                    match.winner === "white" ? "default" : "outline"
                  }
                  className="text-xs"
                >
                  {match.winner === "draw" ? "Draw" :
                   match.winner === "white" ? "White" : "Black"}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
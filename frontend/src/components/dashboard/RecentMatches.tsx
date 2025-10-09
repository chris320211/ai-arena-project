import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface RecentMatch {
  id: string;
  white: string;
  black: string;
  winner: "white" | "black" | "draw";
  moves: number;
  time: string;
}

const getModelDisplayName = (modelId: string): string => {
  const names: Record<string, string> = {
    'anthropic_claude_haiku': 'Claude 3 Haiku',
    'anthropic_claude_sonnet': 'Claude 3.5 Sonnet',
    'openai_gpt4o_mini': 'GPT-4o Mini',
    'openai_gpt4o': 'GPT-4o',
    'gemini_pro': 'Gemini Pro',
  };
  return names[modelId] || modelId;
};

export const RecentMatches = () => {
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);

  useEffect(() => {
    const updateMatches = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/stats/games?limit=10');
        const data = await response.json();
        const games = data.games || [];

        const matches = games.map((game: any) => ({
          id: game.id,
          white: getModelDisplayName(game.white_model),
          black: getModelDisplayName(game.black_model),
          winner: game.winner,
          moves: game.moves || 0,
          time: getTimeAgo(game.timestamp)
        }));
        setRecentMatches(matches);
      } catch (error) {
        console.error('Failed to fetch recent matches:', error);
      }
    };

    updateMatches();

    // Update every 5 seconds to show new games
    const interval = setInterval(updateMatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (timestamp: string): string => {
    const gameTime = new Date(timestamp).getTime();
    const now = Date.now();
    const diff = now - gameTime;

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
                  <span>{match.moves} moves</span>
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
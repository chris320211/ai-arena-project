import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award } from "lucide-react";
import { eloService } from "@/services/eloService";
import { useEffect, useState } from "react";

interface LeaderboardModel {
  rank: number;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  trend: "up" | "down" | "stable";
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-4 w-4 text-gold" />;
    case 2:
      return <Medal className="h-4 w-4 text-muted-foreground" />;
    case 3:
      return <Award className="h-4 w-4 text-orange-600" />;
    default:
      return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  }
};

export const Leaderboard = () => {
  const [models, setModels] = useState<LeaderboardModel[]>([]);

  useEffect(() => {
    const updateLeaderboard = () => {
      const ratings = eloService.getRatings();
      // Filter to only show GPT-4o and Claude Haiku
      const allowedModels = ['gpt-4o', 'claude-3-haiku-20240307'];
      const filteredRatings = ratings.filter(r => allowedModels.includes(r.modelId));

      const leaderboardData = filteredRatings.map((rating, index) => ({
        rank: index + 1,
        name: eloService.getModelName(rating.modelId),
        elo: rating.rating,
        wins: rating.wins,
        losses: rating.losses,
        draws: rating.draws,
        winRate: rating.gamesPlayed > 0 ? Math.round((rating.wins / rating.gamesPlayed) * 100) : 0,
        trend: "stable" as const // We'll implement trend calculation later based on recent games
      }));
      setModels(leaderboardData);
    };

    updateLeaderboard();

    // Update leaderboard every 5 seconds to reflect new game results
    const interval = setInterval(updateLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          AI Model Rankings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {models.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No ratings data available
          </div>
        ) : (
          models.map((model) => (
            <div
              key={model.rank}
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center">
                  {getRankIcon(model.rank)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{model.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {model.wins}W • {model.losses}L • {model.draws}D
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{model.elo}</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={model.winRate >= 70 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {model.winRate}%
                  </Badge>
                  <div className={`h-2 w-2 rounded-full ${
                    model.trend === 'up' ? 'bg-accent' :
                    model.trend === 'down' ? 'bg-destructive' :
                    'bg-muted-foreground'
                  }`} />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
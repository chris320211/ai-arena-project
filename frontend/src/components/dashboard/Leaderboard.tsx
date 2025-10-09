import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award } from "lucide-react";
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

interface ModelStats {
  model_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  win_rate: number;
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

export const Leaderboard = () => {
  const [models, setModels] = useState<LeaderboardModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/stats/models');
        const data = await response.json();

        const leaderboardData: LeaderboardModel[] = data.model_stats
          .map((stat: ModelStats, index: number) => ({
            rank: index + 1,
            name: getModelDisplayName(stat.model_id),
            elo: stat.rating,
            wins: stat.wins,
            losses: stat.losses,
            draws: stat.draws,
            winRate: Math.round(stat.win_rate),
            trend: "stable" as const
          }));

        setModels(leaderboardData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setLoading(false);
      }
    };

    updateLeaderboard();

    // Update leaderboard every 10 seconds to reflect new game results
    const interval = setInterval(updateLeaderboard, 10000);
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
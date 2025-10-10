import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL } from "@/config/api";
import { AI_MODELS } from "@/components/ModelSelector";
import { cn } from "@/lib/utils";

interface LeaderboardModel {
  rank: number;
  modelId: string;
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

const getModelConfig = (modelId: string) => {
  const model = AI_MODELS.find(m => m.id === modelId);
  if (model) {
    return {
      name: model.name,
      icon: model.icon,
      color: model.color,
    };
  }
  // Fallback for unknown models
  return {
    name: modelId,
    icon: null,
    color: 'from-gray-500 to-gray-600',
  };
};

export const Leaderboard = () => {
  const [models, setModels] = useState<LeaderboardModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateLeaderboard = async () => {
      try {
        const response = await fetch(`${API_URL}/api/stats/models`);
        const data = await response.json();

        const leaderboardData: LeaderboardModel[] = data.model_stats
          .map((stat: ModelStats, index: number) => {
            const modelConfig = getModelConfig(stat.model_id);
            return {
              rank: index + 1,
              modelId: stat.model_id,
              name: modelConfig.name,
              elo: stat.rating,
              wins: stat.wins,
              losses: stat.losses,
              draws: stat.draws,
              winRate: Math.round(stat.win_rate),
              trend: "stable" as const
            };
          });

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
          models.map((model) => {
            const modelConfig = getModelConfig(model.modelId);
            return (
              <div
                key={model.rank}
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                {/* Rank Icon */}
                <div className="flex h-8 w-8 items-center justify-center flex-shrink-0">
                  {getRankIcon(model.rank)}
                </div>

                {/* Model Info with Icon */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-r flex-shrink-0",
                    modelConfig.color
                  )}>
                    {modelConfig.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{model.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {model.wins}W • {model.losses}L • {model.draws}D
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-foreground">{model.elo}</p>
                  <Badge
                    variant={model.winRate >= 70 ? "default" : model.winRate >= 50 ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {model.winRate}%
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
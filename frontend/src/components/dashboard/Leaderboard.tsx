import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award } from "lucide-react";

const models = [
  {
    rank: 1,
    name: "AlphaChess Pro",
    elo: 2847,
    wins: 1203,
    losses: 127,
    draws: 89,
    winRate: 94.8,
    trend: "up"
  },
  {
    rank: 2,
    name: "DeepMind Chess",
    elo: 2802,
    wins: 987,
    losses: 156,
    draws: 102,
    winRate: 89.2,
    trend: "up"
  },
  {
    rank: 3,
    name: "Stockfish Neural",
    elo: 2756,
    wins: 834,
    losses: 189,
    draws: 156,
    winRate: 84.1,
    trend: "down"
  },
  {
    rank: 4,
    name: "GPT-Chess",
    elo: 2689,
    wins: 723,
    losses: 234,
    draws: 198,
    winRate: 78.6,
    trend: "up"
  },
  {
    rank: 5,
    name: "LeelaZero",
    elo: 2634,
    wins: 645,
    losses: 278,
    draws: 223,
    winRate: 72.4,
    trend: "stable"
  }
];

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {models.map((model) => (
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
                  variant={model.winRate >= 90 ? "default" : "secondary"}
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
        ))}
      </CardContent>
    </Card>
  );
};
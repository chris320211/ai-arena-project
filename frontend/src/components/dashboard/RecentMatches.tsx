import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy } from "lucide-react";

const recentMatches = [
  {
    id: 1,
    white: "AlphaChess Pro",
    black: "DeepMind Chess",
    winner: "white",
    moves: 42,
    duration: "3m 24s",
    time: "2 hours ago"
  },
  {
    id: 2,
    white: "GPT-Chess",
    black: "Stockfish Neural",
    winner: "black",
    moves: 38,
    duration: "2m 56s",
    time: "3 hours ago"
  },
  {
    id: 3,
    white: "LeelaZero",
    black: "AlphaChess Pro",
    winner: "draw",
    moves: 67,
    duration: "5m 12s",
    time: "4 hours ago"
  },
  {
    id: 4,
    white: "DeepMind Chess",
    black: "GPT-Chess",
    winner: "white",
    moves: 31,
    duration: "2m 18s",
    time: "5 hours ago"
  },
  {
    id: 5,
    white: "Stockfish Neural",
    black: "LeelaZero",
    winner: "black",
    moves: 45,
    duration: "3m 41s",
    time: "6 hours ago"
  }
];

export const RecentMatches = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Recent Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentMatches.map((match) => (
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
                  {match.duration}
                </div>
                <span>{match.time}</span>
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
        ))}
      </CardContent>
    </Card>
  );
};
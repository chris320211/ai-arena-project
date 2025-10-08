import { Card, CardContent } from "@/components/ui/card";
import { Activity, Users, Zap, TrendingUp } from "lucide-react";
import { eloService } from "@/services/eloService";
import { useEffect, useState } from "react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  trend: "up" | "down" | "stable";
}

export const StatsCards = () => {
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    const updateStats = () => {
      const ratings = eloService.getRatings();
      const games = eloService.getRecentGames(100);

      const totalGames = games.length;
      const activeModels = ratings.filter(r => r.gamesPlayed > 0).length;
      const avgRating = ratings.filter(r => r.gamesPlayed > 0).reduce((sum, r) => sum + r.rating, 0) / Math.max(1, activeModels);
      const totalWins = ratings.reduce((sum, r) => sum + r.wins, 0);
      const totalPlayed = ratings.reduce((sum, r) => sum + r.gamesPlayed, 0);
      const winRate = totalPlayed > 0 ? (totalWins / totalPlayed) * 100 : 0;

      const newStats: StatCard[] = [
        {
          title: "Total Games",
          value: totalGames.toString(),
          change: totalGames > 0 ? `${totalGames} completed` : "No games yet",
          icon: Activity,
          trend: "up"
        },
        {
          title: "Active Models",
          value: activeModels.toString(),
          change: `${ratings.length - activeModels} inactive`,
          icon: Users,
          trend: activeModels > 0 ? "up" : "stable"
        },
        {
          title: "Avg ELO Rating",
          value: Math.round(avgRating).toString(),
          change: activeModels > 0 ? "Dynamic rating" : "Starting at 1000",
          icon: TrendingUp,
          trend: "stable"
        },
        {
          title: "Win Rate Balance",
          value: `${winRate.toFixed(1)}%`,
          change: totalPlayed > 0 ? `${totalPlayed} total matches` : "No data yet",
          icon: Zap,
          trend: winRate > 50 ? "up" : winRate < 50 ? "down" : "stable"
        }
      ];

      setStats(newStats);
    };

    updateStats();

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className={`text-xs ${
                  stat.trend === 'up' ? 'text-accent' : stat.trend === 'down' ? 'text-orange-600' : 'text-muted-foreground'
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Users, Zap, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Total Games",
    value: "12,847",
    change: "+342 today",
    icon: Activity,
    trend: "up"
  },
  {
    title: "Active Models",
    value: "8",
    change: "+2 this week",
    icon: Users,
    trend: "up"
  },
  {
    title: "Avg Game Time",
    value: "2.4m",
    change: "-12s vs last week",
    icon: Zap,
    trend: "down"
  },
  {
    title: "Win Rate Balance",
    value: "94.2%",
    change: "+1.2% this month",
    icon: TrendingUp,
    trend: "up"
  }
];

export const StatsCards = () => {
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
                  stat.trend === 'up' ? 'text-accent' : 'text-orange-600'
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
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { RecentMatches } from "@/components/dashboard/RecentMatches";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const StatsDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Arena Analytics</h1>
                <p className="text-sm text-muted-foreground">AI Model Performance Dashboard</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Arena
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Statistics Overview */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-foreground">Overview</h2>
            <StatsCards />
          </section>

          {/* Main Dashboard Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Charts */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="mb-6 text-xl font-semibold text-foreground">Performance Trends</h2>
                <PerformanceChart />
              </section>

              <section>
                <h2 className="mb-6 text-xl font-semibold text-foreground">Recent Matches</h2>
                <RecentMatches />
              </section>
            </div>

            {/* Right Column - Leaderboard */}
            <div className="space-y-8">
              <section>
                <h2 className="mb-6 text-xl font-semibold text-foreground">AI Model Rankings</h2>
                <Leaderboard />
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StatsDashboard;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface ChartDataPoint {
  game: number;
  [key: string]: number | string;
}

const colors = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"
];

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

// ELO calculation functions
const K_FACTOR = 32;

const calculateExpectedScore = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

const calculateNewRating = (currentRating: number, expectedScore: number, actualScore: number): number => {
  return Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));
};

export const PerformanceChart = () => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [modelNames, setModelNames] = useState<string[]>([]);

  useEffect(() => {
    const updateChartData = async () => {
      try {
        const gamesResponse = await fetch('http://localhost:8001/api/stats/games?limit=100');
        const gamesData = await gamesResponse.json();
        const games = gamesData.games || [];

        if (games.length === 0) {
          setChartData([]);
          setModelNames([]);
          return;
        }

        // Reverse to get chronological order (oldest first)
        const orderedGames = games.slice().reverse();

        // Initialize ratings at 1000
        const ratings: Record<string, number> = {};
        const uniqueModels = new Set<string>();

        orderedGames.forEach((game: any) => {
          uniqueModels.add(game.white_model);
          uniqueModels.add(game.black_model);
        });

        uniqueModels.forEach(model => {
          ratings[model] = 1000;
        });

        // Get display names
        const names = Array.from(uniqueModels).map(id =>
          getModelDisplayName(id).replace(/\s+/g, '')
        );
        setModelNames(names);

        // Calculate ELO after each game
        const chartPoints: ChartDataPoint[] = [];

        // Add initial state
        const initialPoint: ChartDataPoint = { game: 0 };
        uniqueModels.forEach(model => {
          const displayName = getModelDisplayName(model).replace(/\s+/g, '');
          initialPoint[displayName] = 1000;
        });
        chartPoints.push(initialPoint);

        // Process each game
        orderedGames.forEach((game: any, index: number) => {
          const whiteModel = game.white_model;
          const blackModel = game.black_model;
          const whiteRating = ratings[whiteModel];
          const blackRating = ratings[blackModel];

          // Calculate expected scores
          const whiteExpected = calculateExpectedScore(whiteRating, blackRating);
          const blackExpected = calculateExpectedScore(blackRating, whiteRating);

          // Determine actual scores
          let whiteActual: number, blackActual: number;
          if (game.winner === 'white') {
            whiteActual = 1;
            blackActual = 0;
          } else if (game.winner === 'black') {
            whiteActual = 0;
            blackActual = 1;
          } else {
            whiteActual = 0.5;
            blackActual = 0.5;
          }

          // Calculate new ratings
          ratings[whiteModel] = calculateNewRating(whiteRating, whiteExpected, whiteActual);
          ratings[blackModel] = calculateNewRating(blackRating, blackExpected, blackActual);

          // Create data point
          const dataPoint: ChartDataPoint = { game: index + 1 };
          uniqueModels.forEach(model => {
            const displayName = getModelDisplayName(model).replace(/\s+/g, '');
            dataPoint[displayName] = ratings[model];
          });
          chartPoints.push(dataPoint);
        });

        setChartData(chartPoints);
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      }
    };

    updateChartData();

    // Update chart every 10 seconds
    const interval = setInterval(updateChartData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          ELO Rating Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 || modelNames.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No ELO history data available. Play some games to see trends!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="game"
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis
                domain={['dataMin - 50', 'dataMax + 50']}
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend />

              {modelNames.map((modelName, index) => (
                <Line
                  key={modelName}
                  type="monotone"
                  dataKey={modelName}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
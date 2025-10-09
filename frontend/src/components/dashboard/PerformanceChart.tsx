import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { eloService } from "@/services/eloService";
import { useEffect, useState } from "react";
import { AI_MODELS } from "@/components/ModelSelector";

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

const colors = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"
];

export const PerformanceChart = () => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [modelNames, setModelNames] = useState<string[]>([]);

  useEffect(() => {
    const updateChartData = () => {
      const history = eloService.getEloHistory(100);
      const ratings = eloService.getRatings();

      // Filter to only show GPT-4o and Claude Haiku
      const allowedModels = ['gpt-4o', 'claude-3-haiku-20240307'];
      const playedModelIds = ratings
        .filter(r => r.gamesPlayed > 0 && allowedModels.includes(r.modelId))
        .map(r => r.modelId);
      const names = playedModelIds.map(id => eloService.getModelName(id).replace(/\s+/g, ''));
      setModelNames(names);

      if (history.length === 0) {
        // No history data, show initial ratings
        const initialData: ChartDataPoint = {
          timestamp: Date.now(),
          time: "Start",
        };

        playedModelIds.forEach((modelId, index) => {
          const rating = ratings.find(r => r.modelId === modelId);
          initialData[names[index]] = rating ? rating.rating : 1000;
        });

        setChartData([initialData]);
        return;
      }

      // Group history by timestamp to create chart data points
      const timestampGroups = new Map<number, Map<string, number>>();

      history.forEach(entry => {
        if (!playedModelIds.includes(entry.modelId)) return;

        const roundedTimestamp = Math.floor(entry.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000); // Round to 5-minute intervals

        if (!timestampGroups.has(roundedTimestamp)) {
          timestampGroups.set(roundedTimestamp, new Map());
        }

        const modelName = eloService.getModelName(entry.modelId).replace(/\s+/g, '');
        timestampGroups.get(roundedTimestamp)!.set(modelName, entry.rating);
      });

      // Convert to chart data format
      const data: ChartDataPoint[] = [];
      const sortedTimestamps = Array.from(timestampGroups.keys()).sort();

      // Track last known rating for each model to fill gaps
      const lastKnownRatings = new Map<string, number>();
      playedModelIds.forEach(modelId => {
        const rating = ratings.find(r => r.modelId === modelId);
        const modelName = eloService.getModelName(modelId).replace(/\s+/g, '');
        lastKnownRatings.set(modelName, rating ? rating.rating : 1000);
      });

      sortedTimestamps.forEach(timestamp => {
        const dataPoint: ChartDataPoint = {
          timestamp,
          time: new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })
        };

        const ratingsAtTimestamp = timestampGroups.get(timestamp)!;

        names.forEach(modelName => {
          if (ratingsAtTimestamp.has(modelName)) {
            const rating = ratingsAtTimestamp.get(modelName)!;
            dataPoint[modelName] = rating;
            lastKnownRatings.set(modelName, rating);
          } else {
            // Use last known rating
            dataPoint[modelName] = lastKnownRatings.get(modelName) || 1000;
          }
        });

        data.push(dataPoint);
      });

      // Limit to last 20 data points for readability
      setChartData(data.slice(-20));
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
                dataKey="time"
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
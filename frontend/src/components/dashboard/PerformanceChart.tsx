import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const data = [
  { time: "00:00", AlphaChess: 2847, DeepMind: 2802, Stockfish: 2756, GPTChess: 2689, LeelaZero: 2634 },
  { time: "04:00", AlphaChess: 2851, DeepMind: 2798, Stockfish: 2761, GPTChess: 2692, LeelaZero: 2628 },
  { time: "08:00", AlphaChess: 2849, DeepMind: 2805, Stockfish: 2759, GPTChess: 2688, LeelaZero: 2635 },
  { time: "12:00", AlphaChess: 2853, DeepMind: 2801, Stockfish: 2754, GPTChess: 2695, LeelaZero: 2631 },
  { time: "16:00", AlphaChess: 2856, DeepMind: 2807, Stockfish: 2752, GPTChess: 2691, LeelaZero: 2638 },
  { time: "20:00", AlphaChess: 2858, DeepMind: 2803, Stockfish: 2748, GPTChess: 2697, LeelaZero: 2642 },
  { time: "24:00", AlphaChess: 2860, DeepMind: 2809, Stockfish: 2745, GPTChess: 2693, LeelaZero: 2639 }
];

const colors = {
  AlphaChess: "#8b5cf6",
  DeepMind: "#06b6d4",
  Stockfish: "#10b981",
  GPTChess: "#f59e0b",
  LeelaZero: "#ef4444"
};

export const PerformanceChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          ELO Rating Trends (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              domain={['dataMin - 20', 'dataMax + 20']}
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

            <Line
              type="monotone"
              dataKey="AlphaChess"
              stroke={colors.AlphaChess}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="DeepMind"
              stroke={colors.DeepMind}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Stockfish"
              stroke={colors.Stockfish}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="GPTChess"
              stroke={colors.GPTChess}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="LeelaZero"
              stroke={colors.LeelaZero}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
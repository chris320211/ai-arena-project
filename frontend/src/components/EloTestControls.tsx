import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Zap, Trophy } from "lucide-react";
import { eloService } from "@/services/eloService";
import { AI_MODELS } from "@/components/ModelSelector";
import { toast } from "@/hooks/use-toast";

export const EloTestControls = () => {
  const resetElo = () => {
    eloService.resetAllRatings();
    toast({
      title: "ELO Ratings Reset",
      description: "All models reset to 1000 ELO",
      variant: "default"
    });
    window.location.reload(); // Refresh to show updated data
  };

  const generateTestData = () => {
    try {
      const models = AI_MODELS.slice(0, 5); // Use first 5 models for test data

      // Generate some test games
      for (let i = 0; i < 20; i++) {
        const whiteModel = models[Math.floor(Math.random() * models.length)];
        const blackModel = models[Math.floor(Math.random() * models.length)];

        if (whiteModel.id !== blackModel.id) {
          // Random winner (slightly favor higher strength models)
          let winner: 'white' | 'black' | 'draw';
          if (whiteModel.strength > blackModel.strength) {
            winner = Math.random() < 0.6 ? 'white' : Math.random() < 0.8 ? 'black' : 'draw';
          } else if (blackModel.strength > whiteModel.strength) {
            winner = Math.random() < 0.6 ? 'black' : Math.random() < 0.8 ? 'white' : 'draw';
          } else {
            winner = Math.random() < 0.45 ? 'white' : Math.random() < 0.9 ? 'black' : 'draw';
          }

          eloService.recordGameResult(whiteModel.id, blackModel.id, winner);
        }
      }

      toast({
        title: "Test Data Generated",
        description: "20 test games added to ELO system",
        variant: "default"
      });

      // Refresh the page to show new data
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error generating test data:', error);
      toast({
        title: "Error",
        description: "Failed to generate test data",
        variant: "destructive"
      });
    }
  };

  const ratings = eloService.getRatings();
  const activeModels = ratings.filter(r => r.gamesPlayed > 0).length;
  const totalGames = eloService.getRecentGames(100).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          ELO System Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <Badge variant="outline" className="mb-2">Active Models</Badge>
            <div className="text-2xl font-bold">{activeModels}</div>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="mb-2">Total Games</Badge>
            <div className="text-2xl font-bold">{totalGames}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={generateTestData}
            variant="default"
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" />
            Generate Test Data
          </Button>

          <Button
            onClick={resetElo}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Ratings
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Generate test data to see the ELO system in action</p>
          <p>• Reset to clear all ratings and start fresh</p>
          <p>• Play AI vs AI games to see live ELO updates</p>
        </div>
      </CardContent>
    </Card>
  );
};
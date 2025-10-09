import { AI_MODELS } from '@/components/ModelSelector';

export interface EloRating {
  modelId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface GameResult {
  id: string;
  whiteModelId: string;
  blackModelId: string;
  winner: 'white' | 'black' | 'draw';
  timestamp: number;
  whiteRatingBefore: number;
  blackRatingBefore: number;
  whiteRatingAfter: number;
  blackRatingAfter: number;
  ratingChange: number;
  moves?: number;
}

export interface EloHistoryEntry {
  modelId: string;
  rating: number;
  timestamp: number;
  gameId: string;
}

class EloService {
  private static readonly STORAGE_KEY = 'chess-ai-elo-ratings';
  private static readonly GAMES_STORAGE_KEY = 'chess-ai-game-results';
  private static readonly HISTORY_STORAGE_KEY = 'chess-ai-elo-history';
  private static readonly K_FACTOR = 32;
  private static readonly INITIAL_RATING = 1000;

  // Initialize all models with 1000 ELO rating
  private initializeRatings(): Map<string, EloRating> {
    const ratings = new Map<string, EloRating>();

    AI_MODELS.forEach(model => {
      ratings.set(model.id, {
        modelId: model.id,
        rating: this.INITIAL_RATING,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0
      });
    });

    return ratings;
  }

  // Load ratings from localStorage or initialize if not exists
  private loadRatings(): Map<string, EloRating> {
    try {
      const stored = localStorage.getItem(EloService.STORAGE_KEY);
      if (!stored) {
        return this.initializeRatings();
      }

      const data = JSON.parse(stored);
      const ratings = new Map<string, EloRating>();

      // Ensure all current models have ratings
      AI_MODELS.forEach(model => {
        const stored = data[model.id];
        if (stored) {
          ratings.set(model.id, stored);
        } else {
          // New model, initialize with default rating
          ratings.set(model.id, {
            modelId: model.id,
            rating: this.INITIAL_RATING,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0
          });
        }
      });

      return ratings;
    } catch (error) {
      console.error('Error loading ELO ratings:', error);
      return this.initializeRatings();
    }
  }

  // Save ratings to localStorage
  private saveRatings(ratings: Map<string, EloRating>): void {
    try {
      const data: Record<string, EloRating> = {};
      ratings.forEach((rating, modelId) => {
        data[modelId] = rating;
      });
      localStorage.setItem(EloService.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving ELO ratings:', error);
    }
  }

  // Load game results from localStorage
  private loadGameResults(): GameResult[] {
    try {
      const stored = localStorage.getItem(EloService.GAMES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading game results:', error);
      return [];
    }
  }

  // Save game results to localStorage
  private saveGameResults(results: GameResult[]): void {
    try {
      localStorage.setItem(EloService.GAMES_STORAGE_KEY, JSON.stringify(results));
    } catch (error) {
      console.error('Error saving game results:', error);
    }
  }

  // Load ELO history from localStorage
  private loadEloHistory(): EloHistoryEntry[] {
    try {
      const stored = localStorage.getItem(EloService.HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading ELO history:', error);
      return [];
    }
  }

  // Save ELO history to localStorage
  private saveEloHistory(history: EloHistoryEntry[]): void {
    try {
      localStorage.setItem(EloService.HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving ELO history:', error);
    }
  }

  // Calculate expected score for ELO calculation
  private calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  // Calculate new ELO rating
  private calculateNewRating(currentRating: number, expectedScore: number, actualScore: number): number {
    return Math.round(currentRating + EloService.K_FACTOR * (actualScore - expectedScore));
  }

  // Get all current ratings
  getRatings(): EloRating[] {
    const ratings = this.loadRatings();
    return Array.from(ratings.values()).sort((a, b) => b.rating - a.rating);
  }

  // Get rating for specific model
  getRating(modelId: string): EloRating | null {
    const ratings = this.loadRatings();
    return ratings.get(modelId) || null;
  }

  // Record a game result and update ELO ratings
  recordGameResult(whiteModelId: string, blackModelId: string, winner: 'white' | 'black' | 'draw'): GameResult {
    const ratings = this.loadRatings();
    const whiteRating = ratings.get(whiteModelId);
    const blackRating = ratings.get(blackModelId);

    if (!whiteRating || !blackRating) {
      throw new Error('Model ratings not found');
    }

    // Calculate expected scores
    const whiteExpected = this.calculateExpectedScore(whiteRating.rating, blackRating.rating);
    const blackExpected = this.calculateExpectedScore(blackRating.rating, whiteRating.rating);

    // Determine actual scores
    let whiteActual: number, blackActual: number;
    switch (winner) {
      case 'white':
        whiteActual = 1;
        blackActual = 0;
        break;
      case 'black':
        whiteActual = 0;
        blackActual = 1;
        break;
      case 'draw':
        whiteActual = 0.5;
        blackActual = 0.5;
        break;
    }

    // Calculate new ratings
    const whiteNewRating = this.calculateNewRating(whiteRating.rating, whiteExpected, whiteActual);
    const blackNewRating = this.calculateNewRating(blackRating.rating, blackExpected, blackActual);

    const ratingChange = whiteNewRating - whiteRating.rating;

    // Update rating objects
    const updatedWhiteRating: EloRating = {
      ...whiteRating,
      rating: whiteNewRating,
      gamesPlayed: whiteRating.gamesPlayed + 1,
      wins: whiteRating.wins + (winner === 'white' ? 1 : 0),
      losses: whiteRating.losses + (winner === 'black' ? 1 : 0),
      draws: whiteRating.draws + (winner === 'draw' ? 1 : 0)
    };

    const updatedBlackRating: EloRating = {
      ...blackRating,
      rating: blackNewRating,
      gamesPlayed: blackRating.gamesPlayed + 1,
      wins: blackRating.wins + (winner === 'black' ? 1 : 0),
      losses: blackRating.losses + (winner === 'white' ? 1 : 0),
      draws: blackRating.draws + (winner === 'draw' ? 1 : 0)
    };

    // Update ratings map
    ratings.set(whiteModelId, updatedWhiteRating);
    ratings.set(blackModelId, updatedBlackRating);

    // Save updated ratings
    this.saveRatings(ratings);

    // Create game result record
    const gameResult: GameResult = {
      id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      whiteModelId,
      blackModelId,
      winner,
      timestamp: Date.now(),
      whiteRatingBefore: whiteRating.rating,
      blackRatingBefore: blackRating.rating,
      whiteRatingAfter: whiteNewRating,
      blackRatingAfter: blackNewRating,
      ratingChange: Math.abs(ratingChange)
    };

    // Save game result
    const gameResults = this.loadGameResults();
    gameResults.unshift(gameResult); // Add to beginning

    // Keep only last 100 games
    if (gameResults.length > 100) {
      gameResults.splice(100);
    }

    this.saveGameResults(gameResults);

    // Update ELO history
    const history = this.loadEloHistory();

    history.push({
      modelId: whiteModelId,
      rating: whiteNewRating,
      timestamp: Date.now(),
      gameId: gameResult.id
    });

    history.push({
      modelId: blackModelId,
      rating: blackNewRating,
      timestamp: Date.now(),
      gameId: gameResult.id
    });

    // Keep only last 500 history entries
    if (history.length > 500) {
      history.splice(0, history.length - 500);
    }

    this.saveEloHistory(history);

    return gameResult;
  }

  // Get recent game results
  getRecentGames(limit: number = 20): GameResult[] {
    const games = this.loadGameResults();
    return games.slice(0, limit);
  }

  // Get ELO history for charts
  getEloHistory(limit: number = 100): EloHistoryEntry[] {
    const history = this.loadEloHistory();
    return history.slice(-limit); // Get most recent entries
  }

  // Reset all ratings to 1000
  resetAllRatings(): void {
    const ratings = this.initializeRatings();
    this.saveRatings(ratings);

    // Clear game results and history
    localStorage.removeItem(EloService.GAMES_STORAGE_KEY);
    localStorage.removeItem(EloService.HISTORY_STORAGE_KEY);
  }

  // Get model name by ID
  getModelName(modelId: string): string {
    if (modelId === 'human') return 'Human Player';
    const model = AI_MODELS.find(m => m.id === modelId);
    return model ? model.name : modelId;
  }
}

export const eloService = new EloService();
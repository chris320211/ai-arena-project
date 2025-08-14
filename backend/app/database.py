import os
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from bson import ObjectId


class GameResult(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    white_model: str
    black_model: str
    winner: Optional[str] = None  # 'white', 'black', or None for draw
    end_reason: str  # 'checkmate', 'stalemate', 'resignation', 'timeout'
    moves: int
    duration: int  # in seconds
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    pgn: Optional[str] = None  # Complete game notation

    model_config = {"populate_by_name": True}


class ModelStats(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    model_id: str
    games_played: int = 0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    win_rate: float = 0.0
    avg_move_time: float = 0.0
    rating: int = 1200  # Starting ELO rating
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True}


class Database:
    client: AsyncIOMotorClient = None
    database = None

database = Database()


async def get_database() -> AsyncIOMotorClient:
    return database.database


async def connect_to_mongo():
    """Create database connection"""
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/ai-arena")
    database.client = AsyncIOMotorClient(mongodb_url)
    database.database = database.client.get_default_database()
    
    # Test connection
    try:
        await database.client.admin.command('ping')
        print("Successfully connected to MongoDB")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close database connection"""
    if database.client:
        database.client.close()


async def save_game_result(game_result: GameResult) -> str:
    """Save a game result to the database"""
    db = await get_database()
    result = await db.game_results.insert_one(game_result.dict(by_alias=True))
    return str(result.inserted_id)


async def get_recent_games(limit: int = 10) -> List[GameResult]:
    """Get recent game results"""
    db = await get_database()
    cursor = db.game_results.find().sort("timestamp", -1).limit(limit)
    games = []
    async for doc in cursor:
        # Convert ObjectId to string for Pydantic
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        games.append(GameResult(**doc))
    return games


async def get_model_stats(model_id: str) -> Optional[ModelStats]:
    """Get statistics for a specific model"""
    db = await get_database()
    doc = await db.model_stats.find_one({"model_id": model_id})
    if doc:
        # Convert ObjectId to string for Pydantic
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return ModelStats(**doc)
    return None


async def update_model_stats(model_id: str, won: bool, drew: bool, moves: int, game_duration: int):
    """Update model statistics after a game"""
    db = await get_database()
    
    # Get current stats or create new ones
    current_stats = await get_model_stats(model_id)
    if not current_stats:
        current_stats = ModelStats(model_id=model_id)
    
    # Update stats
    current_stats.games_played += 1
    if won:
        current_stats.wins += 1
    elif drew:
        current_stats.draws += 1
    else:
        current_stats.losses += 1
    
    # Calculate win rate
    if current_stats.games_played > 0:
        current_stats.win_rate = (current_stats.wins / current_stats.games_played) * 100
    
    # Update average move time (simple approximation)
    if moves > 0:
        avg_time_per_move = game_duration / moves
        if current_stats.games_played == 1:
            current_stats.avg_move_time = avg_time_per_move
        else:
            # Weighted average
            current_stats.avg_move_time = (
                (current_stats.avg_move_time * (current_stats.games_played - 1) + avg_time_per_move) 
                / current_stats.games_played
            )
    
    current_stats.last_updated = datetime.utcnow()
    
    # Save to database
    await db.model_stats.replace_one(
        {"model_id": model_id},
        current_stats.dict(by_alias=True),
        upsert=True
    )


async def get_all_model_stats() -> List[ModelStats]:
    """Get statistics for all models"""
    db = await get_database()
    cursor = db.model_stats.find().sort("rating", -1)
    stats = []
    async for doc in cursor:
        # Convert ObjectId to string for Pydantic
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        stats.append(ModelStats(**doc))
    return stats


async def calculate_elo_changes(winner_rating: int, loser_rating: int, k_factor: int = 32) -> tuple[int, int]:
    """Calculate ELO rating changes for winner and loser"""
    expected_winner = 1 / (1 + 10 ** ((loser_rating - winner_rating) / 400))
    expected_loser = 1 / (1 + 10 ** ((winner_rating - loser_rating) / 400))
    
    winner_change = k_factor * (1 - expected_winner)
    loser_change = k_factor * (0 - expected_loser)
    
    return int(winner_change), int(loser_change)


async def update_elo_ratings(white_model: str, black_model: str, winner: Optional[str]):
    """Update ELO ratings after a game"""
    db = await get_database()
    
    white_stats = await get_model_stats(white_model)
    black_stats = await get_model_stats(black_model)
    
    if not white_stats or not black_stats:
        return  # Skip if we don't have stats for both models
    
    if winner == 'white':
        white_change, black_change = await calculate_elo_changes(white_stats.rating, black_stats.rating)
        white_stats.rating += white_change
        black_stats.rating += black_change
    elif winner == 'black':
        black_change, white_change = await calculate_elo_changes(black_stats.rating, white_stats.rating)
        black_stats.rating += black_change
        white_stats.rating += white_change
    # For draws, ratings change less dramatically
    elif winner is None:
        if white_stats.rating > black_stats.rating:
            white_stats.rating -= 8
            black_stats.rating += 8
        elif black_stats.rating > white_stats.rating:
            black_stats.rating -= 8
            white_stats.rating += 8
    
    # Update both models in database
    await db.model_stats.replace_one(
        {"model_id": white_model},
        white_stats.dict(by_alias=True),
        upsert=True
    )
    await db.model_stats.replace_one(
        {"model_id": black_model},
        black_stats.dict(by_alias=True),
        upsert=True
    )
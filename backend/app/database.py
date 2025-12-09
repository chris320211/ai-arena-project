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


class EloHistoryEntry(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    model_id: str
    rating_before: int
    rating_after: int
    rating_change: int
    opponent: str
    game_result: str  # 'win', 'loss', 'draw'
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    game_id: str

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
    # Explicitly use 'ai-arena' database name
    database.database = database.client["ai-arena"]
    
    # Test connection
    try:
        await database.client.admin.command('ping')
        print("Successfully connected to MongoDB")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        print("Running without database - statistics will not be saved")
        database.client = None
        database.database = None


async def close_mongo_connection():
    """Close database connection"""
    if database.client:
        database.client.close()


async def save_game_result(game_result: GameResult) -> str:
    """Save a game result to the database"""
    db = await get_database()
    if db is None:
        return ""
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
    if db is None:
        return []
    cursor = db.model_stats.find().sort("rating", -1)
    stats = []
    async for doc in cursor:
        # Convert ObjectId to string for Pydantic
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        stats.append(ModelStats(**doc))
    return stats




async def update_elo_ratings(white_model: str, black_model: str, winner: Optional[str], game_id: str = None):
    """Update ELO ratings after a game and save history"""
    db = await get_database()
    
    white_stats = await get_model_stats(white_model)
    black_stats = await get_model_stats(black_model)
    
    if not white_stats or not black_stats:
        return  # Skip if we don't have stats for both models
    
    # Store original ratings for history
    white_rating_before = white_stats.rating
    black_rating_before = black_stats.rating
    
    # Calculate expected scores for both players
    white_expected = 1 / (1 + 10 ** ((black_stats.rating - white_stats.rating) / 400))
    black_expected = 1 / (1 + 10 ** ((white_stats.rating - black_stats.rating) / 400))
    
    # Determine actual scores based on game outcome
    if winner == 'white':
        white_score = 1.0
        black_score = 0.0
        white_result = 'win'
        black_result = 'loss'
    elif winner == 'black':
        white_score = 0.0
        black_score = 1.0
        white_result = 'loss'
        black_result = 'win'
    else:  # Draw
        white_score = 0.5
        black_score = 0.5
        white_result = 'draw'
        black_result = 'draw'
    
    # Calculate rating changes using standard ELO formula
    k_factor = 32
    white_change = int(k_factor * (white_score - white_expected))
    black_change = int(k_factor * (black_score - black_expected))
    
    # Apply rating changes
    white_stats.rating += white_change
    black_stats.rating += black_change
    
    # Save ELO history if game_id is provided
    if game_id:
        # White player history
        white_history = EloHistoryEntry(
            model_id=white_model,
            rating_before=white_rating_before,
            rating_after=white_stats.rating,
            rating_change=white_change,
            opponent=black_model,
            game_result=white_result,
            game_id=game_id
        )
        await db.elo_history.insert_one(white_history.dict(by_alias=True))
        
        # Black player history
        black_history = EloHistoryEntry(
            model_id=black_model,
            rating_before=black_rating_before,
            rating_after=black_stats.rating,
            rating_change=black_change,
            opponent=white_model,
            game_result=black_result,
            game_id=game_id
        )
        await db.elo_history.insert_one(black_history.dict(by_alias=True))
    
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


async def get_elo_history(model_id: str, limit: int = 20) -> List[EloHistoryEntry]:
    """Get ELO rating history for a specific model"""
    db = await get_database()
    cursor = db.elo_history.find({"model_id": model_id}).sort("timestamp", -1).limit(limit)
    history = []
    async for doc in cursor:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        history.append(EloHistoryEntry(**doc))
    return history


async def get_all_elo_history(limit: int = 50) -> List[EloHistoryEntry]:
    """Get recent ELO history for all models"""
    db = await get_database()
    cursor = db.elo_history.find().sort("timestamp", -1).limit(limit)
    history = []
    async for doc in cursor:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        history.append(EloHistoryEntry(**doc))
    return history
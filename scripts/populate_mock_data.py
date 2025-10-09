#!/usr/bin/env python3
"""
Script to populate MongoDB Atlas with mock game data
for Claude Haiku vs GPT-4o-mini matches
"""

import os
import sys
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/ai-arena")

# Model names
CLAUDE_HAIKU = "anthropic_claude_haiku"
GPT4O_MINI = "openai_gpt4o_mini"

# Mock game outcomes (winner, moves, duration_seconds, end_reason)
# Format: (white_model, black_model, winner, moves, duration, end_reason)
MOCK_GAMES = [
    (CLAUDE_HAIKU, GPT4O_MINI, "white", 45, 320, "checkmate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "black", 38, 280, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, "black", 52, 410, "checkmate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "white", 41, 305, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, None, 67, 520, "stalemate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "black", 33, 245, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, "white", 48, 360, "checkmate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "black", 55, 425, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, "black", 39, 290, "checkmate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "white", 44, 330, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, "white", 50, 380, "checkmate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "black", 42, 315, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, None, 71, 550, "stalemate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "white", 36, 270, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, "black", 46, 340, "checkmate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "black", 51, 395, "checkmate"),
    (CLAUDE_HAIKU, GPT4O_MINI, "white", 43, 325, "checkmate"),
    (GPT4O_MINI, CLAUDE_HAIKU, "white", 37, 275, "checkmate"),
]


async def calculate_elo_change(rating1, rating2, score1, k=32):
    """Calculate ELO rating change"""
    expected1 = 1 / (1 + 10 ** ((rating2 - rating1) / 400))
    change = int(k * (score1 - expected1))
    return change


async def populate_data():
    """Populate MongoDB with mock data"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client["ai-arena"]

    # Clear existing data for these models
    print("Clearing existing data for Claude Haiku and GPT-4o-mini...")
    await db.game_results.delete_many({
        "$or": [
            {"white_model": {"$in": [CLAUDE_HAIKU, GPT4O_MINI]}},
            {"black_model": {"$in": [CLAUDE_HAIKU, GPT4O_MINI]}}
        ]
    })
    await db.model_stats.delete_many({"model_id": {"$in": [CLAUDE_HAIKU, GPT4O_MINI]}})
    await db.elo_history.delete_many({"model_id": {"$in": [CLAUDE_HAIKU, GPT4O_MINI]}})

    # Initialize ratings
    ratings = {
        CLAUDE_HAIKU: 1200,
        GPT4O_MINI: 1200
    }

    # Track stats
    stats = {
        CLAUDE_HAIKU: {"games": 0, "wins": 0, "losses": 0, "draws": 0},
        GPT4O_MINI: {"games": 0, "wins": 0, "losses": 0, "draws": 0}
    }

    # Insert games and update ELO
    base_time = datetime.utcnow() - timedelta(days=7)
    game_ids = []

    print(f"\nInserting {len(MOCK_GAMES)} mock games...")
    for i, (white, black, winner, moves, duration, end_reason) in enumerate(MOCK_GAMES):
        timestamp = base_time + timedelta(hours=i * 8)

        # Insert game result
        game_doc = {
            "white_model": white,
            "black_model": black,
            "winner": winner,
            "end_reason": end_reason,
            "moves": moves,
            "duration": duration,
            "timestamp": timestamp,
            "pgn": None
        }
        result = await db.game_results.insert_one(game_doc)
        game_id = str(result.inserted_id)
        game_ids.append(game_id)

        # Update stats
        stats[white]["games"] += 1
        stats[black]["games"] += 1

        if winner == "white":
            stats[white]["wins"] += 1
            stats[black]["losses"] += 1
            white_score, black_score = 1.0, 0.0
        elif winner == "black":
            stats[black]["wins"] += 1
            stats[white]["losses"] += 1
            white_score, black_score = 0.0, 1.0
        else:  # draw
            stats[white]["draws"] += 1
            stats[black]["draws"] += 1
            white_score, black_score = 0.5, 0.5

        # Calculate ELO changes
        white_before = ratings[white]
        black_before = ratings[black]

        white_change = await calculate_elo_change(white_before, black_before, white_score)
        black_change = await calculate_elo_change(black_before, white_before, black_score)

        ratings[white] += white_change
        ratings[black] += black_change

        # Insert ELO history
        white_result = "win" if winner == "white" else ("loss" if winner == "black" else "draw")
        black_result = "win" if winner == "black" else ("loss" if winner == "white" else "draw")

        await db.elo_history.insert_one({
            "model_id": white,
            "rating_before": white_before,
            "rating_after": ratings[white],
            "rating_change": white_change,
            "opponent": black,
            "game_result": white_result,
            "timestamp": timestamp,
            "game_id": game_id
        })

        await db.elo_history.insert_one({
            "model_id": black,
            "rating_before": black_before,
            "rating_after": ratings[black],
            "rating_change": black_change,
            "opponent": white,
            "game_result": black_result,
            "timestamp": timestamp,
            "game_id": game_id
        })

        print(f"  Game {i+1}: {white} vs {black} -> {winner or 'draw'} "
              f"(ELO: {white}={ratings[white]:+d}, {black}={ratings[black]:+d})")

    # Insert final model stats
    print("\nInserting model statistics...")
    for model in [CLAUDE_HAIKU, GPT4O_MINI]:
        win_rate = (stats[model]["wins"] / stats[model]["games"] * 100) if stats[model]["games"] > 0 else 0
        avg_move_time = sum(d for _, _, _, m, d, _ in MOCK_GAMES) / len(MOCK_GAMES) / sum(m for _, _, _, m, _, _ in MOCK_GAMES) if MOCK_GAMES else 0

        await db.model_stats.insert_one({
            "model_id": model,
            "games_played": stats[model]["games"],
            "wins": stats[model]["wins"],
            "losses": stats[model]["losses"],
            "draws": stats[model]["draws"],
            "win_rate": win_rate,
            "avg_move_time": avg_move_time,
            "rating": ratings[model],
            "last_updated": datetime.utcnow()
        })

        print(f"  {model}: {stats[model]['games']} games, "
              f"{stats[model]['wins']}W-{stats[model]['losses']}L-{stats[model]['draws']}D, "
              f"ELO: {ratings[model]}, Win rate: {win_rate:.1f}%")

    print("\n✅ Mock data successfully populated!")
    print(f"   - {len(MOCK_GAMES)} games inserted")
    print(f"   - 2 model stats inserted")
    print(f"   - {len(MOCK_GAMES) * 2} ELO history entries inserted")
    print(f"\n📊 Check your MongoDB Atlas 'ai-arena' database!")

    client.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Mock Data Population Script")
    print("=" * 60)
    print(f"MongoDB URL: {MONGODB_URL[:50]}...")
    print(f"Models: {CLAUDE_HAIKU} vs {GPT4O_MINI}")
    print("=" * 60)

    asyncio.run(populate_data())

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ROWS = 6;
const COLS = 9;
const CELL_SIZE = 48;
const HALF_CELL = CELL_SIZE / 2;

const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
];

const getCriticalMass = (r, c) => {
    return directions.reduce((count, [dr, dc]) => {
        const nr = r + dr,
            nc = c + dc;
        return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS ? count + 1 : count;
    }, 0);
};

const initialGrid = () => {
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) {
            grid[r][c] = null;
        }
    }
    return grid;
};

export default function ChainReactionGame() {
    const players = ["red", "blue"];
    const [grid, setGrid] = useState(initialGrid);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [hasPlayed, setHasPlayed] = useState(players.map(() => false));
    const [gameOver, setGameOver] = useState(false);
    const [explosions, setExplosions] = useState([]);
    const [processing, setProcessing] = useState(false);

    const handleClick = (r, c) => {
        if (processing || gameOver) return;

        const cell = grid[r][c];
        if (cell && cell.player !== currentPlayer) return;

        const newGrid = grid.map((row) =>
            row.map((cell) => (cell ? { ...cell } : null))
        );

        if (newGrid[r][c]) {
            newGrid[r][c].count += 1;
        } else {
            newGrid[r][c] = { player: currentPlayer, count: 1 };
        }

        setGrid(newGrid);
        setProcessing(true);
        processExplosions(newGrid, r, c, currentPlayer, (finalGrid) => {
            const updatedHasPlayed = [...hasPlayed];
            updatedHasPlayed[currentPlayer] = true;
            setHasPlayed(updatedHasPlayed);

            const allPlayersStarted = updatedHasPlayed.every((p) => p);
            const winner = checkWin(finalGrid, currentPlayer);

            if (allPlayersStarted && winner) {
                setGameOver(true);
            } else {
                setCurrentPlayer((currentPlayer + 1) % players.length);
            }

            setProcessing(false);
        });
    };

    const processExplosions = (initialGrid, r, c, player, onComplete) => {
        const workingGrid = initialGrid.map((row) =>
            row.map((cell) => (cell ? { ...cell } : null))
        );
        const queue = [];

        const enqueueExplosion = (x, y) => {
            const cell = workingGrid[x][y];
            const critical = getCriticalMass(x, y);

            if (cell && cell.count >= critical) {
                workingGrid[x][y] = null;

                for (const [dx, dy] of directions) {
                    const nx = x + dx,
                        ny = y + dy;
                    if (nx >= 0 && nx < ROWS && ny >= 0 && ny < COLS) {
                        queue.push({ from: [x, y], to: [nx, ny], player });
                    }
                }
            }
        };

        enqueueExplosion(r, c);
        setGrid(workingGrid);
        stepThroughQueue(queue, workingGrid, player, onComplete);
    };

    const stepThroughQueue = (queue, gridCopy, player, onComplete) => {
        if (queue.length === 0) {
            setGrid(
                gridCopy.map((row) =>
                    row.map((cell) => (cell ? { ...cell } : null))
                )
            );
            onComplete(gridCopy);
            return;
        }

        // Group all explosions in this wave
        const currentWave = [...queue];
        queue.length = 0; // Clear queue for next wave

        // Animate all current wave
        const newExplosions = currentWave.map(({ from, to }) => {
            const key = `${from[0]}-${from[1]}->${to[0]}-${
                to[1]
            }-${Date.now()}`;
            return {
                from,
                to,
                key,
                player,
            };
        });

        setExplosions((prev) => [...prev, ...newExplosions]);

        // Apply effects after animations
        setTimeout(() => {
            for (const { to } of currentWave) {
                const [tx, ty] = to;
                const cell = gridCopy[tx][ty];

                if (cell) {
                    cell.count += 1;
                    cell.player = player;
                } else {
                    gridCopy[tx][ty] = { player, count: 1 };
                }
            }

            // Remove explosion animations
            setExplosions((prev) =>
                prev.filter(
                    (e) => !newExplosions.some((ne) => ne.key === e.key)
                )
            );
            setGrid(
                gridCopy.map((row) =>
                    row.map((cell) => (cell ? { ...cell } : null))
                )
            );

            // Enqueue any new explosions for next wave
            for (const { to } of currentWave) {
                const [tx, ty] = to;
                const critical = getCriticalMass(tx, ty);
                if (gridCopy[tx][ty].count >= critical) {
                    gridCopy[tx][ty] = null;
                    for (const [dx, dy] of directions) {
                        const nx = tx + dx,
                            ny = ty + dy;
                        if (nx >= 0 && nx < ROWS && ny >= 0 && ny < COLS) {
                            queue.push({
                                from: [tx, ty],
                                to: [nx, ny],
                                player,
                            });
                        }
                    }
                }
            }

            // Recurse to next wave
            stepThroughQueue(queue, gridCopy, player, onComplete);
        }, 300);
    };

    const checkWin = (grid, player) => {
        const alive = new Set();
        for (let row of grid) {
            for (let cell of row) {
                if (cell) alive.add(cell.player);
            }
        }
        return alive.size === 1 && alive.has(player);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white relative">
            <h1 className="text-3xl font-bold mb-4">Chain Reaction</h1>

            {!gameOver ? (
                <div className="mb-4 text-lg">
                    Current Turn:{" "}
                    <span
                        className="font-bold capitalize"
                        style={{ color: players[currentPlayer] }}
                    >
                        Player {currentPlayer + 1} ({players[currentPlayer]})
                    </span>
                </div>
            ) : (
                <div className="mt-4 text-xl text-green-400">
                    🎉 Player{" "}
                    <span
                        className="font-bold"
                        style={{ color: players[currentPlayer] }}
                    >
                        {currentPlayer + 1}
                    </span>{" "}
                    wins!
                </div>
            )}

            <div
                className="grid gap-1 relative"
                style={{ gridTemplateColumns: `repeat(${COLS}, 3rem)` }}
            >
                {grid.map((row, r) =>
                    row.map((cell, c) => (
                        <div
                            key={`${r}-${c}`}
                            onClick={() => handleClick(r, c)}
                            className={`w-12 h-12 border border-gray-600 flex items-center justify-center cursor-pointer transition ${
                                processing
                                    ? "pointer-events-none"
                                    : "hover:scale-105"
                            }`}
                        >
                            {cell && (
                                <div className="flex flex-wrap justify-center items-center gap-0.5 w-full h-full">
                                    <AnimatePresence initial={false}>
                                        {Array.from({ length: cell.count }).map(
                                            (_, i) => (
                                                <motion.div
                                                    key={`${r}-${c}-orb-${i}-${cell.player}`} // unique per player + orb count
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            players[
                                                                cell.player
                                                            ],
                                                    }}
                                                    initial={{
                                                        scale: 0,
                                                        opacity: 0,
                                                    }}
                                                    animate={{
                                                        scale: 1,
                                                        opacity: 1,
                                                    }}
                                                    exit={{
                                                        scale: 0,
                                                        opacity: 0,
                                                    }}
                                                    transition={{
                                                        duration: 0.2,
                                                    }}
                                                />
                                            )
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    ))
                )}

                <AnimatePresence>
                    {explosions.map(({ from, to, key, player }) => {
                        const [fx, fy] = from;
                        const [tx, ty] = to;
                        const xOffset = (ty - fy) * 48;
                        const yOffset = (tx - fx) * 48;

                        return (
                            <motion.div
                                key={key}
                                initial={{ x: 0, y: 0 }}
                                animate={{ x: xOffset, y: yOffset }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="absolute w-4 h-4 rounded-full pointer-events-none z-50"
                                style={{
                                    top: fx * 48 + 24,
                                    left: fy * 48 + 24,
                                    transform: "translate(-50%, -50%)",
                                    backgroundColor: players[player],
                                }}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}

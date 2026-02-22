import { Router, Request, Response } from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bcrypt from "bcrypt";
import { authenticate, signToken, AuthRequest } from "../middleware/auth";

const router = Router();

async function getDB() {
  return open({
    filename: "./database.sqlite",
    driver: sqlite3.Database
  });
}

// Register
router.post("/register", async (req: Request, res: Response) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "Name and password required" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const db = await getDB();
  const result = await db.run(
    "INSERT INTO users (name, password) VALUES (?, ?)",
    [name, hashed]
  );

  const token = signToken({ id: result.lastID, name });

  res.status(201).json({ token });
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  const { name, password } = req.body;

  const db = await getDB();
  const user = await db.get(
    "SELECT * FROM users WHERE name = ?",
    [name]
  );

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(400).json({ error: "Invalid password" });
  }

  const token = signToken({ id: user.id, name: user.name });

  res.json({ token });
});

// Protected: Create Expense
router.post(
  "/expenses",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { title, amount } = req.body;
    const userId = req.user.id;

    const db = await getDB();

    const result = await db.run(
      "INSERT INTO expenses (title, amount, user_id) VALUES (?, ?, ?)",
      [title, amount, userId]
    );

    res.status(201).json({
      id: result.lastID,
      title,
      amount
    });
  }
);

// Protected: Get Expenses
router.get(
  "/expenses",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;

    const db = await getDB();
    const expenses = await db.all(
      "SELECT * FROM expenses WHERE user_id = ?",
      [userId]
    );

    res.json(expenses);
  }
);

export default router;
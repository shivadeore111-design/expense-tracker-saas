import express, { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../database";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

const SECRET = process.env.JWT_SECRET || "supersecretkey";

/* ===========================
   AUTH ROUTES
=========================== */

// Register
router.post("/register", async (req, res: Response) => {
  const { name, password } = req.body;
  const db = await getDB();

  const existing = await db.get("SELECT * FROM users WHERE name = ?", [name]);
  if (existing) return res.status(400).json({ error: "User exists" });

  const hashed = await bcrypt.hash(password, 10);

  const result = await db.run(
    "INSERT INTO users (name, password) VALUES (?, ?)",
    [name, hashed]
  );

  const token = jwt.sign({ id: result.lastID, name }, SECRET, {
    expiresIn: "1h"
  });

  res.json({ token });
});

// Login
router.post("/login", async (req, res: Response) => {
  const { name, password } = req.body;
  const db = await getDB();

  const user = await db.get("SELECT * FROM users WHERE name = ?", [name]);
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, name }, SECRET, {
    expiresIn: "1h"
  });

  res.json({ token });
});

/* ===========================
   EXPENSE ROUTES (Protected)
=========================== */

// Get expenses
router.get(
  "/expenses",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const db = await getDB();

    const expenses = await db.all(
      "SELECT * FROM expenses WHERE user_id = ?",
      [req.user.id]
    );

    res.json(expenses);
  }
);

// Add expense
router.post(
  "/expenses",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { title, amount } = req.body;
    const db = await getDB();

    const result = await db.run(
      "INSERT INTO expenses (title, amount, user_id) VALUES (?, ?, ?)",
      [title, amount, req.user.id]
    );

    res.json({ id: result.lastID, title, amount });
  }
);

// Update expense
router.put(
  "/expenses/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const expenseId = Number(req.params.id);
    const { title, amount } = req.body;
    const db = await getDB();

    await db.run(
      "UPDATE expenses SET title = ?, amount = ? WHERE id = ? AND user_id = ?",
      [title, amount, expenseId, req.user.id]
    );

    res.json({ message: "Updated" });
  }
);

// Delete expense
router.delete(
  "/expenses/:id",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const expenseId = Number(req.params.id);
    const db = await getDB();

    await db.run(
      "DELETE FROM expenses WHERE id = ? AND user_id = ?",
      [expenseId, req.user.id]
    );

    res.json({ message: "Deleted" });
  }
);

export default router;
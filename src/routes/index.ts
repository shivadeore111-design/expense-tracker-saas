import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../database";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = express.Router();

/* ------------------ AUTH ------------------ */

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const db = getDB();

  try {
    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashed]
    );

    res.json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ message: "User already exists" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const db = getDB();

  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

/* ------------------ EXPENSES ------------------ */

router.post("/expenses", authMiddleware, async (req: AuthRequest, res) => {
  const { title, amount } = req.body;
  const db = getDB();

  await db.query(
    "INSERT INTO expenses (title, amount, user_id) VALUES ($1, $2, $3)",
    [title, amount, req.userId]
  );

  res.json({ message: "Expense added" });
});

router.get("/expenses", authMiddleware, async (req: AuthRequest, res) => {
  const db = getDB();

  const result = await db.query(
    "SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );

  res.json(result.rows);
});

router.delete("/expenses/:id", authMiddleware, async (req: AuthRequest, res) => {
  const db = getDB();
  const { id } = req.params;

  await db.query(
    "DELETE FROM expenses WHERE id = $1 AND user_id = $2",
    [id, req.userId]
  );

  res.json({ message: "Expense deleted" });
});

export default router;
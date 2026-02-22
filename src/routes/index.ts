import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { getDB } from "../database";
import { authMiddleware } from "../middleware/auth";
import { Request } from "express";

interface AuthRequest extends Request {
  userId?: number;
}

const router = express.Router();

/* ------------------ HELPERS ------------------ */

function isValidEmail(email: string) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function isStrongPassword(password: string) {
  const strongRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return strongRegex.test(password);
}

/* ------------------ LOGIN RATE LIMIT ------------------ */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts. Try again later." }
});

/* ------------------ AUTH ------------------ */

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  if (!isStrongPassword(password))
    return res.status(400).json({
      message:
        "Password must be 8+ chars, include uppercase, lowercase, number & special character"
    });

  const db = getDB();

  try {
    const hashed = await bcrypt.hash(password, 12);

    await db.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashed]
    );

    res.json({ message: "User registered" });
  } catch {
    res.status(400).json({ message: "User already exists" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  const db = getDB();

  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  const user = result.rows[0];

  if (!user)
    return res.status(400).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);

  if (!valid)
    return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

/* ------------------ EXPENSES ------------------ */

router.post("/expenses", authMiddleware, async (req: AuthRequest, res) => {
  const { title, amount, category } = req.body;

  if (!title || !amount)
    return res.status(400).json({ message: "Title and amount required" });

  const db = getDB();

  await db.query(
    "INSERT INTO expenses (title, amount, category, user_id) VALUES ($1, $2, $3, $4)",
    [title, amount, category || "General", req.userId]
  );

  res.json({ message: "Expense added" });
});

router.get("/expenses", authMiddleware, async (req: AuthRequest, res) => {
  const { category } = req.query;
  const db = getDB();

  let query = "SELECT * FROM expenses WHERE user_id = $1";
  let values: any[] = [req.userId];

  if (category) {
    query += " AND category = $2";
    values.push(category);
  }

  query += " ORDER BY created_at DESC";

  const result = await db.query(query, values);

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
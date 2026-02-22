/* ------------------ EXPENSES ------------------ */

router.post("/expenses", authMiddleware, async (req: AuthRequest, res) => {
  const { title, amount, category } = req.body;

  if (!title || !amount) {
    return res.status(400).json({ message: "Title and amount required" });
  }

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
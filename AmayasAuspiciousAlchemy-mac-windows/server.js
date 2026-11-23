const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Open connection to persistent SQLite database
const dbPath = path.resolve(__dirname, 'potion_shop.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
  } else {
    console.log('✨ Connected to persistent SQLite database: potion_shop.db');
  }
});

// Enable Foreign Key Constraints in SQLite
db.run("PRAGMA foreign_keys = ON;");
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'customer')),
      customer_id INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
    )
  `);

  const ownerPasswordHash = hashPassword('AlchemyOwner2026!');
  db.run(
    `INSERT OR IGNORE INTO accounts (email, password_hash, role)
     VALUES (?, ?, 'owner')`,
    ['owner@amayasalchemy.com', ownerPasswordHash]
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS ingredient_stock (
      ingredient_id INTEGER PRIMARY KEY,
      quantity INTEGER NOT NULL DEFAULT 10 CHECK (quantity >= 0),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
    )
  `);
  db.run(`
    INSERT OR IGNORE INTO ingredient_stock (ingredient_id, quantity)
    SELECT ingredient_id, 10 FROM ingredients
  `);
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedHash, 'hex'));
}

const sessions = new Map();

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const account = token && sessions.get(token);
  if (!account) return res.status(401).json({ error: 'Please log in to continue.' });
  req.account = account;
  next();
}

function requireOwner(req, res, next) {
  if (req.account.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access is required for this area.' });
  }
  next();
}

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  db.get(
    `SELECT account_id, email, password_hash, role, customer_id FROM accounts WHERE email = ?`,
    [email],
    (err, account) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!account || !verifyPassword(password, account.password_hash)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const safeAccount = {
        accountId: account.account_id,
        email: account.email,
        role: account.role,
        customerId: account.customer_id
      };
      sessions.set(token, safeAccount);
      res.json({ token, account: safeAccount });
    }
  );
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization.replace('Bearer ', '');
  sessions.delete(token);
  res.json({ success: true });
});


// -----------------------------------------------------------------------------
// OPERATION 1: Search or Browse Data
// Parameterized SQL query filtering potions by name or effect
// -----------------------------------------------------------------------------
app.get('/api/potions', requireAuth, (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const effect = String(req.query.effect || '').trim();
  const potionType = String(req.query.potionType || '').trim();
  const sql = `
    SELECT potion_id, potion_name, effect, level, potion_type 
    FROM potions 
    WHERE (potion_name LIKE ? OR effect LIKE ?)
      AND (? = '' OR effect = ?)
      AND (? = '' OR potion_type = ?)
    ORDER BY potion_name ASC`;

  db.all(sql, [search, search, effect, effect, potionType, potionType], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/potion-filters', requireAuth, (req, res) => {
  db.all('SELECT DISTINCT effect FROM potions WHERE effect IS NOT NULL AND effect <> "" ORDER BY effect ASC', (effectErr, effects) => {
    if (effectErr) return res.status(500).json({ error: effectErr.message });
    db.all('SELECT DISTINCT potion_type FROM potions WHERE potion_type IS NOT NULL AND potion_type <> "" ORDER BY potion_type ASC', (typeErr, types) => {
      if (typeErr) return res.status(500).json({ error: typeErr.message });
      res.json({
        effects: effects.map((row) => row.effect),
        potionTypes: types.map((row) => row.potion_type)
      });
    });
  });
});


// -----------------------------------------------------------------------------
// OPERATION 2: Display Related Data (3-Table SQL JOIN)
// Retrieves brewing instructions by joining potions, potion_ingredients, & ingredients
// -----------------------------------------------------------------------------
app.get('/api/recipes/:potionId', requireAuth, (req, res) => {
  const potionId = parseInt(req.params.potionId, 10);
  if (!potionId || potionId <= 0) {
    return res.status(400).json({ error: 'Invalid Potion ID provided.' });
  }

  const sql = `
    SELECT p.potion_name, pi.step_order, i.ingredient_name, pi.description
    FROM potions p
    JOIN potion_ingredients pi ON p.potion_id = pi.potion_id
    JOIN ingredients i ON pi.ingredient_id = i.ingredient_id
    WHERE p.potion_id = ?
    ORDER BY pi.step_order ASC`;

  db.all(sql, [potionId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) {
      return res.status(404).json({ error: `No brewing recipe found for Potion ID ${potionId}.` });
    }
    res.json(rows);
  });
});

app.get('/api/recipes', requireAuth, (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const effect = String(req.query.effect || '').trim();
  const sql = `
    SELECT p.potion_id, p.potion_name, p.effect, pi.step_order,
           i.ingredient_name, pi.description
    FROM potions p
    JOIN potion_ingredients pi ON p.potion_id = pi.potion_id
    JOIN ingredients i ON pi.ingredient_id = i.ingredient_id
    WHERE (p.potion_name LIKE ? OR i.ingredient_name LIKE ?)
      AND (? = '' OR p.effect = ?)
    ORDER BY p.potion_name ASC, pi.step_order ASC`;

  db.all(sql, [search, search, effect, effect], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/owner/recipe-planner', requireAuth, requireOwner, (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const effect = String(req.query.effect || '').trim();
  const potionType = String(req.query.potionType || '').trim();
  const lowStockOnly = String(req.query.lowStockOnly || '') === 'true';
  const lowStockLimit = Math.max(0, Number.parseInt(req.query.lowStockLimit, 10) || 5);
  const recipeSql = `
    SELECT p.potion_id, p.potion_name, p.effect, p.potion_type,
           si.quantity AS stock_quantity,
           pi.step_order, i.ingredient_id, i.ingredient_name, pi.description
    FROM potions p
    JOIN potion_ingredients pi ON p.potion_id = pi.potion_id
    JOIN ingredients i ON pi.ingredient_id = i.ingredient_id
    LEFT JOIN shop_inventory si ON si.potion_id = p.potion_id
    WHERE (p.potion_name LIKE ? OR i.ingredient_name LIKE ?)
      AND (? = '' OR p.effect = ?)
      AND (? = '' OR p.potion_type = ?)
      AND (? = 0 OR COALESCE(si.quantity, 0) <= ?)
    ORDER BY p.potion_name ASC, pi.step_order ASC`;
  const needsSql = `
    SELECT i.ingredient_id, i.ingredient_name, COALESCE(ist.quantity, 0) AS ingredient_stock,
           COUNT(DISTINCT p.potion_id) AS recipe_count,
           COUNT(*) AS step_count,
           SUM(CASE WHEN COALESCE(si.quantity, 0) <= ? THEN 1 ELSE 0 END) AS low_stock_recipe_count,
           (SUM(CASE WHEN COALESCE(si.quantity, 0) <= ? THEN 1 ELSE 0 END) * 3
             + COUNT(DISTINCT p.potion_id)) AS restock_priority
    FROM ingredients i
    JOIN potion_ingredients pi ON i.ingredient_id = pi.ingredient_id
    JOIN potions p ON p.potion_id = pi.potion_id
    LEFT JOIN shop_inventory si ON si.potion_id = p.potion_id
    LEFT JOIN ingredient_stock ist ON ist.ingredient_id = i.ingredient_id
    WHERE (p.potion_name LIKE ? OR i.ingredient_name LIKE ?)
      AND (? = '' OR p.effect = ?)
      AND (? = '' OR p.potion_type = ?)
    GROUP BY i.ingredient_id, i.ingredient_name
    ORDER BY restock_priority DESC, recipe_count DESC, step_count DESC, i.ingredient_name ASC`;

  db.all(recipeSql, [search, search, effect, effect, potionType, potionType, lowStockOnly ? 1 : 0, lowStockLimit], (recipeErr, recipes) => {
    if (recipeErr) return res.status(500).json({ error: recipeErr.message });
    db.all(needsSql, [lowStockLimit, lowStockLimit, search, search, effect, effect, potionType, potionType], (needsErr, ingredientNeeds) => {
      if (needsErr) return res.status(500).json({ error: needsErr.message });
      res.json({ recipes, ingredientNeeds, lowStockLimit });
    });
  });
});

    app.post('/api/owner/potions', requireAuth, requireOwner, (req, res) => {
      const { potionName, effect, potionType, level, price, ingredients } = req.body;
      const steps = Array.isArray(ingredients) ? ingredients : [];
      if (!potionName?.trim() || !effect?.trim() || !potionType?.trim() || !steps.length) {
        return res.status(400).json({ error: 'Potion name, effect, type, and at least one recipe ingredient are required.' });
      }
      const potionLevel = Number.parseInt(level, 10);
      const potionPrice = Number.parseFloat(price);
      if (!potionLevel || potionLevel < 1 || potionLevel > 3 || Number.isNaN(potionPrice) || potionPrice < 0) {
        return res.status(400).json({ error: 'Level must be 1-3 and price must be 0 or greater.' });
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(
          'INSERT INTO potions (potion_name, effect, level, potion_type) VALUES (?, ?, ?, ?)',
          [potionName.trim(), effect.trim(), potionLevel, potionType.trim()],
          function (potionErr) {
            if (potionErr) return db.run('ROLLBACK', () => res.status(409).json({ error: 'A potion with that name may already exist.' }));
            const potionId = this.lastID;
            db.run(
              'INSERT INTO shop_inventory (potion_id, price, quantity) VALUES (?, ?, 0)',
              [potionId, potionPrice],
              (inventoryErr) => {
                if (inventoryErr) return db.run('ROLLBACK', () => res.status(500).json({ error: inventoryErr.message }));
                let index = 0;
                const addIngredient = () => {
                  if (index >= steps.length) {
                    return db.run('COMMIT', (commitErr) => {
                      if (commitErr) return db.run('ROLLBACK', () => res.status(500).json({ error: commitErr.message }));
                      res.status(201).json({ potionId, message: 'Potion and recipe saved permanently.' });
                    });
                  }
                  const step = steps[index++];
                  const ingredientName = String(step.name || '').trim();
                  if (!ingredientName) return db.run('ROLLBACK', () => res.status(400).json({ error: 'Every recipe step needs an ingredient name.' }));
                  db.run('INSERT OR IGNORE INTO ingredients (ingredient_name, category, description) VALUES (?, ?, ?)', [ingredientName, 'Custom', 'Shop recipe ingredient'], () => {
                    db.get('SELECT ingredient_id FROM ingredients WHERE ingredient_name = ?', [ingredientName], (findErr, ingredient) => {
                      if (findErr || !ingredient) return db.run('ROLLBACK', () => res.status(500).json({ error: 'Could not save recipe ingredient.' }));
                      db.run('INSERT INTO ingredient_stock (ingredient_id, quantity) VALUES (?, 10) ON CONFLICT(ingredient_id) DO NOTHING', [ingredient.ingredient_id], (stockErr) => {
                        if (stockErr) return db.run('ROLLBACK', () => res.status(500).json({ error: stockErr.message }));
                        db.run('INSERT INTO potion_ingredients (potion_id, ingredient_id, step_order, description) VALUES (?, ?, ?, ?)', [potionId, ingredient.ingredient_id, index, step.description || 'Add ingredient'], (stepErr) => {
                          if (stepErr) return db.run('ROLLBACK', () => res.status(500).json({ error: stepErr.message }));
                          addIngredient();
                        });
                      });
                    });
                  });
                };
                addIngredient();
              }
            );
          }
        );
      });
    });

    app.post('/api/owner/brew/:potionId', requireAuth, requireOwner, (req, res) => {
      const potionId = Number.parseInt(req.params.potionId, 10);
      if (!potionId) return res.status(400).json({ error: 'Invalid potion ID.' });
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.all('SELECT ingredient_id, ingredient_name FROM potion_ingredients JOIN ingredients USING (ingredient_id) WHERE potion_id = ? ORDER BY step_order', [potionId], (recipeErr, ingredients) => {
          if (recipeErr || !ingredients.length) return db.run('ROLLBACK', () => res.status(404).json({ error: 'Recipe not found.' }));
          const ids = ingredients.map((ingredient) => ingredient.ingredient_id);
          let index = 0;
          const consume = () => {
            if (index >= ids.length) {
              return db.run('UPDATE shop_inventory SET quantity = quantity + 3 WHERE potion_id = ?', [potionId], function (stockErr) {
                if (stockErr || !this.changes) return db.run('ROLLBACK', () => res.status(404).json({ error: 'Potion is not stocked in the shop.' }));
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) return db.run('ROLLBACK', () => res.status(500).json({ error: commitErr.message }));
                  res.json({ message: 'Brew complete: 3 potions added to stock.', added: 3 });
                });
              });
            }
            const ingredientId = ids[index++];
            db.get('SELECT quantity FROM ingredient_stock WHERE ingredient_id = ?', [ingredientId], (stockErr, stock) => {
              if (stockErr || !stock || stock.quantity < 1) return db.run('ROLLBACK', () => res.status(400).json({ error: 'Not enough ingredients to brew this potion.' }));
              db.run('UPDATE ingredient_stock SET quantity = quantity - 1 WHERE ingredient_id = ?', [ingredientId], (updateErr) => {
                if (updateErr) return db.run('ROLLBACK', () => res.status(500).json({ error: updateErr.message }));
                consume();
              });
            });
          };
          consume();
        });
      });
    });

// -----------------------------------------------------------------------------
// OPERATION 3: Add Data (INSERT into Customer Table)
// Validates fields & adds new customer with default reward points
// -----------------------------------------------------------------------------
app.post('/api/customers', (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Names, email, and a password of at least 8 characters are required!' });
  }

  const sql = `INSERT INTO customer (first_name, last_name, email, reward_points) VALUES (?, ?, ?, 0)`;

  db.run(sql, [firstName.trim(), lastName.trim(), email.trim()], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: `A customer with email '${email}' already exists!` });
      }
      return res.status(500).json({ error: err.message });
    }
    const customerId = this.lastID;
    db.run(
      `INSERT INTO accounts (email, password_hash, role, customer_id) VALUES (?, ?, 'customer', ?)`,
      [email.trim().toLowerCase(), hashPassword(password), customerId],
      (accountErr) => {
        if (accountErr) {
          db.run(`DELETE FROM customer WHERE customer_id = ?`, [customerId]);
          return res.status(500).json({ error: 'Could not create the customer login.' });
        }
        res.status(201).json({ customerId, firstName, lastName, email, rewardPoints: 0 });
      }
    );
  });
});


// Helper route: Fetch all customers or current active user profile
app.get('/api/customers', requireAuth, (req, res) => {
  const email = req.query.email;
  if (email) {
    db.get(`SELECT * FROM customer WHERE email = ?`, [email], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Customer not found." });
      res.json(row);
    });
  } else {
    db.all(`SELECT * FROM customer ORDER BY last_name ASC`, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
});


// Helper route: Fetch full inventory with potion names
app.get('/api/inventory', requireAuth, (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const sql = `
    SELECT si.shop_item_id, si.potion_id, p.potion_name, p.effect, si.price, si.quantity
    FROM shop_inventory si
    JOIN potions p ON si.potion_id = p.potion_id
    WHERE (p.potion_name LIKE ? OR p.effect LIKE ?)
    ORDER BY si.shop_item_id ASC`;

  db.all(sql, [search, search], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// -----------------------------------------------------------------------------
// OPERATION 4: Update Data (UPDATE Shop Inventory)
// Modifies inventory prices and adds stock quantity
// -----------------------------------------------------------------------------
app.put('/api/inventory/:shopItemId', requireAuth, requireOwner, (req, res) => {
  const shopItemId = parseInt(req.params.shopItemId, 10);
  const price = parseFloat(req.body.price);
  const addQty = parseInt(req.body.addQty, 10);

  if (isNaN(shopItemId) || shopItemId <= 0) {
    return res.status(400).json({ error: 'Invalid Shop Item ID!' });
  }
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'Price must be a positive number!' });
  }
  if (isNaN(addQty) || addQty < 0) {
    return res.status(400).json({ error: 'Quantity to add must be 0 or greater!' });
  }

  const sql = `UPDATE shop_inventory SET price = ?, quantity = quantity + ? WHERE shop_item_id = ?`;

  db.run(sql, [price, addQty, shopItemId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ error: `Shop Item ID ${shopItemId} not found!` });
    }
    res.json({ message: 'Inventory updated successfully!' });
  });
});


// -----------------------------------------------------------------------------
// OPERATION 5: Summary / Report Query (GROUP BY, HAVING, AGGREGATES)
// Generates VIP customer spending and purchase breakdown
// -----------------------------------------------------------------------------
app.get('/api/reports/customer-summary', requireAuth, requireOwner, (req, res) => {
  const sql = `
    SELECT c.customer_id, c.first_name, c.last_name, c.email,
           COUNT(ct.transaction_id) AS total_orders,
           COALESCE(SUM(ct.quantity), 0) AS total_potions_bought,
           COALESCE(SUM(ct.total_price), 0) AS total_spent
    FROM customer c
    LEFT JOIN cust_transactions ct ON c.customer_id = ct.customer_id
    GROUP BY c.customer_id, c.first_name, c.last_name, c.email
    ORDER BY total_spent DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// -----------------------------------------------------------------------------
// OPERATION 6: Multi-Step Purchase Transaction
// Executes multi-table updates (Stock deduction, transaction log, reward points)
// with full ROLLBACK protection on error
// -----------------------------------------------------------------------------
app.post('/api/purchase', requireAuth, (req, res, next) => {
  if (req.account.role !== 'customer') {
    return res.status(403).json({ error: 'Only customer accounts can buy potions.' });
  }
  const customerId = Number.parseInt(req.body.customerId, 10);
  const requestedItems = Array.isArray(req.body.items)
    ? req.body.items
    : [{ shopItemId: req.body.shopItemId, quantity: req.body.quantity }];
  const quantities = new Map();
  requestedItems.forEach((item) => {
    const shopItemId = Number.parseInt(item.shopItemId, 10);
    const quantity = Number.parseInt(item.quantity, 10);
    if (shopItemId > 0 && quantity > 0) {
      quantities.set(shopItemId, (quantities.get(shopItemId) || 0) + quantity);
    }
  });
  const items = [...quantities.entries()].map(([shopItemId, quantity]) => ({ shopItemId, quantity }));

  if (!customerId || customerId !== req.account.customerId || items.length === 0) {
    return res.status(400).json({ error: 'Choose at least one potion with a valid quantity.' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    let totalPrice = 0;
    let earnedPoints = 0;
    let index = 0;
    let finished = false;
    const rollback = (status, error) => {
      if (finished) return;
      finished = true;
      db.run('ROLLBACK', () => res.status(status).json({ error }));
    };
    const processNext = () => {
      if (index >= items.length) {
        return db.run(
          'UPDATE customer SET reward_points = reward_points + ? WHERE customer_id = ?',
          [earnedPoints, customerId],
          (pointsErr) => {
            if (pointsErr) return rollback(500, 'Failed to update customer reward points.');
            db.run('COMMIT', (commitErr) => {
              if (commitErr) return rollback(500, 'Transaction commit failed.');
              finished = true;
              res.json({
                success: true,
                message: `Purchase successful! Total: $${totalPrice.toFixed(2)}. Earned ${earnedPoints} reward points!`,
                totalPrice,
                earnedPoints,
                itemCount: items.length
              });
            });
          }
        );
      }

      const { shopItemId, quantity } = items[index++];
      db.get('SELECT price, quantity FROM shop_inventory WHERE shop_item_id = ?', [shopItemId], (err, item) => {
        if (err) return rollback(500, err.message);
        if (!item) return rollback(404, `Shop item ${shopItemId} not found.`);
        if (item.quantity < quantity) return rollback(400, `Insufficient stock for item ${shopItemId}. Only ${item.quantity} available.`);
        const lineTotal = item.price * quantity;
        totalPrice += lineTotal;
        earnedPoints += Math.floor(lineTotal);
        db.run(
          'INSERT INTO cust_transactions (customer_id, shop_item_id, quantity, total_price) VALUES (?, ?, ?, ?)',
          [customerId, shopItemId, quantity, lineTotal],
          (txErr) => {
            if (txErr) return rollback(500, `Failed to record transaction: ${txErr.message}`);
            db.run(
              'UPDATE shop_inventory SET quantity = quantity - ? WHERE shop_item_id = ?',
              [quantity, shopItemId],
              (stockErr) => {
                if (stockErr) return rollback(500, 'Failed to update inventory stock.');
                processNext();
              }
            );
          }
        );
      });
    };
    processNext();
  });
});

app.post('/api/purchase-legacy', requireAuth, (req, res) => {
  const customerId = parseInt(req.body.customerId, 10);
  const shopItemId = parseInt(req.body.shopItemId, 10);
  const quantity = parseInt(req.body.quantity, 10);

  if (!customerId || !shopItemId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Valid Customer ID, Shop Item ID, and Quantity (>0) are required!' });
  }

  // Begin Explicit Transaction
  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");

    // 1. Verify item availability and price
    db.get("SELECT price, quantity FROM shop_inventory WHERE shop_item_id = ?", [shopItemId], (err, item) => {
      if (err || !item) {
        db.run("ROLLBACK;");
        return res.status(404).json({ error: 'Shop item not found!' });
      }

      if (item.quantity < quantity) {
        db.run("ROLLBACK;");
        return res.status(400).json({ error: `Insufficient stock! Only ${item.quantity} available.` });
      }

      const totalPrice = item.price * quantity;
      const earnedPoints = Math.floor(totalPrice);

      // 2. Insert into cust_transactions
      db.run(
        "INSERT INTO cust_transactions (customer_id, shop_item_id, quantity, total_price) VALUES (?, ?, ?, ?)",
        [customerId, shopItemId, quantity, totalPrice],
        function (txErr) {
          if (txErr) {
            db.run("ROLLBACK;");
            return res.status(500).json({ error: 'Failed to record transaction: ' + txErr.message });
          }

          // 3. Deduct stock from shop_inventory
          db.run(
            "UPDATE shop_inventory SET quantity = quantity - ? WHERE shop_item_id = ?",
            [quantity, shopItemId],
            function (stockErr) {
              if (stockErr) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: 'Failed to update inventory stock.' });
              }

              // 4. Update customer reward points
              db.run(
                "UPDATE customer SET reward_points = reward_points + ? WHERE customer_id = ?",
                [earnedPoints, customerId],
                function (pointsErr) {
                  if (pointsErr) {
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: 'Failed to update customer reward points.' });
                  }

                  // All steps succeeded -> Commit Transaction
                  db.run("COMMIT;", (commitErr) => {
                    if (commitErr) {
                      db.run("ROLLBACK;");
                      return res.status(500).json({ error: 'Transaction commit failed.' });
                    }
                    res.json({
                      success: true,
                      message: `Purchase successful! Total: $${totalPrice.toFixed(2)}. Earned ${earnedPoints} reward points! 🌟`,
                      totalPrice,
                      earnedPoints
                    });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`🔮 Amaya's Auspicious Alchemy backend listening on http://localhost:${PORT}`);
});

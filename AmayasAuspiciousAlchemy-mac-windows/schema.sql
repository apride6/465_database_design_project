PRAGMA foreign_keys = ON;

--drop tables

DROP TABLE IF EXISTS cust_transactions;
DROP TABLE IF EXISTS shop_inventory;
DROP TABLE IF EXISTS potion_ingredients;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS potions;

-- drop view and index
DROP VIEW IF EXISTS inventory_view;
DROP INDEX IF EXISTS index_shop_inventory_potion;

-- potions table
CREATE TABLE potions(
    potion_id INTEGER PRIMARY KEY,
    potion_name TEXT,
    effect TEXT,
    duration_seconds INTEGER,
    level INTEGER CHECK (level >= 1 AND level <=3),
    potion_type TEXT
);

-- Ingredients

CREATE TABLE  ingredients(
    ingredient_id INTEGER PRIMARY KEY,
    ingredient_name TEXT,
    category TEXT, 
    description TEXT
);

-- potion ingredients

CREATE TABLE potion_ingredients(
    potion_id INTEGER,
    ingredient_id INTEGER,
    step_order INTEGER,
    description TEXT,

    PRIMARY KEY (potion_id, ingredient_id),

    FOREIGN KEY (potion_id)
        REFERENCES potions(potion_id),

    FOREIGN KEY (ingredient_id)
        REFERENCES ingredients(ingredient_id)
);

CREATE TABLE customer(
    customer_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    reward_points INTEGER DEFAULT 0 CHECK(reward_points >= 0)
);

CREATE TABLE cust_transactions(
    transaction_id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    shop_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL CHECK(total_price >=0),

    FOREIGN KEY (customer_id)
        REFERENCES customer(customer_id),

    FOREIGN KEY (shop_item_id)
        REFERENCES shop_inventory(shop_item_id)
);

CREATE TABLE shop_inventory(
    shop_item_id INTEGER PRIMARY KEY,
    potion_id INTEGER NOT NULL,
    price REAL NOT NULL CHECK(price >=0),
    quantity INTEGER DEFAULT 0 CHECK(quantity >=0),

    FOREIGN KEY (potion_id)
        REFERENCES potions(potion_id)
);

-- view 
CREATE VIEW inventory_view AS
SELECT
    si.shop_item_id,
    p.potion_name,
    p.effect,
    p.potion_type,
    si.price,
    si.quantity
FROM shop_inventory si
JOIN potions p
    ON si.potion_id = p.potion_id;

-- index
CREATE INDEX index_shop_inventory_potion
ON shop_inventory(potion_id);
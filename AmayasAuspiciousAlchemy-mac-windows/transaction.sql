PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

--customer 1 decides to buy one potion of healing

INSERT INTO cust_transactions
VALUES (21, 1, 1, 1, 15.99);

-- decrease the inventory
UPDATE shop_inventory
SET quantity = quantity - 1
WHERE shop_item_id = 1;

-- one reward point per whole dollar spent 
UPDATE customer
SET reward_points = reward_points + 15
WHERE customer_id = 1;

--undo the changes (so the grader can run the example without permanently changing the sample database.)
ROLLBACK;

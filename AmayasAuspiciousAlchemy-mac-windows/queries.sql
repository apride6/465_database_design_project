--1. Filtering and Sorting

-- find long-lasting potions 
SELECT potion_name, duration_seconds
FROM potions
WHERE potion_type = 'Positive' AND duration_seconds >= 180
ORDER BY duration_seconds DESC;


--2. INNER JOIN
-- potions that are currently in the inventory 
SELECT p.potion_name, si.price, si.quantity
FROM potions p
INNER JOIN shop_inventory si
    ON p.potion_id = si.potion_id;


--3. LEFT JOIN
-- potions with no inventory
SELECT p.potion_name, si.quantity
FROM potions p
LEFT JOIN shop_inventory si
    ON p.potion_id = si.potion_id
WHERE si.shop_item_id IS NULL;


--4. Three-Table Join
-- potion that each customer has purchased
SELECT c.first_name, c.last_name, p.potion_name, ct.quantity
FROM customer c
JOIN cust_transactions ct
    ON c.customer_id = ct.customer_id
JOIN shop_inventory si
    ON ct.shop_item_id = si.shop_item_id
JOIN potions p
    ON si.potion_id = p.potion_id
ORDER BY c.last_name;


--5. Aggregate Query
-- how much money has my shop made
SELECT SUM(total_price) AS total_revenue
FROM cust_transactions;


--6. GROUP BY and HAVING
-- find customers that have purchases more than once (returning customers)
SELECT c.first_name, c.last_name, COUNT(ct.transaction_id) AS purchases
FROM customer c
JOIN cust_transactions ct
    ON c.customer_id = ct.customer_id
GROUP BY c.customer_id
HAVING COUNT(ct.transaction_id) > 2;

--7. Subquery
-- find the most expensive potions to see if prices need to be changed 
SELECT p.potion_name, si.price
FROM potions p
JOIN shop_inventory si ON p.potion_id = si.potion_id 
    WHERE si.price > ( 
        SELECT AVG(price)
        FROM shop_inventory
    );

--8. Set Operation
-- find  some movement related potions 
SELECT ingredient_name AS name
FROM ingredients
WHERE ingredient_name = 'Sugar' OR ingredient_name = 'Rabbit Foot'
UNION
SELECT potion_name
FROM potions
WHERE effect LIKE '%Speed%' OR effect LIKE '%Jump%';


--9. View
-- see whoch potions are low in stock 
SELECT potion_name, quantity, price
FROM inventory_view
WHERE quantity < 15
ORDER BY quantity;
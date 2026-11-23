
-- Potions: 19

INSERT INTO potions VALUES
(1,'Potion of Healing','Instant Health',1,1,'Positive'),
(2,'Potion of Regeneration','Health Regeneration',45,2,'Positive'),
(3,'Potion of Strength','Attack Damage Boost',180,2,'Positive'),
(4,'Potion of Swiftness','Movement Speed Boost',180,1,'Positive'),
(5,'Potion of Fire Resistance','Fire Immunity',180,2,'Positive'),
(6,'Potion of Water Breathing','Underwater Breathing',180,2,'Positive'),
(7,'Potion of Night Vision','See in Darkness',180,1,'Positive'),
(8,'Potion of Leaping','Jump Boost',180,1,'Positive'),
(9,'Potion of Slow Falling','Reduced Fall Damage',90,1,'Positive'),
(10,'Potion of Invisibility','Become Invisible',180,2,'Positive'),
(11,'Potion of Poison','Damage Over Time',45,2,'Negative'),
(12,'Potion of Weakness','Reduced Melee Damage',90,1,'Negative'),
(13,'Potion of Harming','Instant Damage',1,3,'Negative'),
(14,'Potion of Slowness','Movement Reduction',90,2,'Negative'),
(15,'Potion of the Turtle Master','Resistance and Slowness',20,3,'Mixed'),
(16,'Potion of Wind Charging','Wind Burst Effect',180,2,'Special'),
(17,'Potion of Oozing','Spawn Slimes on Death',180,2,'Special'),
(18,'Potion of Weaving','Spawn Cobwebs on Death',180,2,'Special'),
(19,'Potion of Infestation','Spawn Silverfish',180,2,'Special'),
(20, 'Potion of Levitation', 'Float upward', 45, 1, 'Utility');

-- Ingredients: 10

INSERT INTO ingredients VALUES
(1,'Nether Wart','Base','Required for most potions'),
(2,'Glistering Melon','Brewing','Creates Healing'),
(3,'Ghast Tear','Brewing','Creates Regeneration'),
(4,'Blaze Powder','Brewing','Creates Strength'),
(5,'Sugar','Brewing','Creates Swiftness'),
(6,'Spider Eye','Brewing','Creates Poison'),
(7,'Magma Cream','Brewing','Creates Fire Resistance'),
(8,'Golden Carrot','Brewing','Creates Night Vision'),
(9,'Rabbit Foot','Brewing','Creates Leaping'),
(10,'Phantom Membrane','Brewing','Creates Slow Falling');


-- Potion_ingredients: 32

INSERT INTO potion_ingredients VALUES
-- makes a potion of healing
(1,1,1,'Create awkward potion'),
(1,2,2,'Add glistering melon'),

-- potion of regeneration
(2,1,1,'Create awkward potion'),
(2,3,2,'Add ghast tear'),

-- potion of strength
(3,1,1,'Create awkward potion'),
(3,4,2,'Add blaze powder'),

--potion of swiftness
(4,1,1,'Create awkward potion'),
(4,5,2,'Add sugar'),

--potion of fire resistance
(5,1,1,'Create awkward potion'),
(5,7,2,'Add magma cream'),

--potion of water breathing
(6,1,1,'Create awkward potion'),
(6,8,2,'Add pufferfish substitute'),

--potion of night vision
(7,1,1,'Create awkward potion'),
(7,8,2,'Add golden carrot'),

--potion of leaping
(8,1,1,'Create awkward potion'),
(8,9,2,'Add rabbit foot'),

--potion of slow falling
(9,1,1,'Create awkward potion'),
(9,10,2,'Add phantom membrane'),

--potion of invisibility 
(10,1,1,'Create awkward potion'),
(10,8,2,'Night vision base'),
(10,6,3,'Corrupt into invisibility'),

--potion of posion
(11,1,1,'Create awkward potion'),
(11,6,2,'Add spider eye'),

--potion of weakness
(12,1,1,'Water bottle'),
(12,6,2,'Add fermented spider eye'),

--potion of harming
(13,1,1,'Create poison'),
(13,6,2,'Poison base'),
(13,2,3,'Corrupt into harming'),

--potion of slowness
(14,1,1,'Create swiftness'),
(14,5,2,'Swiftness base'),
(14,6,3,'Corrupt into slowness'),

--potion of turtle master
(15,1,1,'Create awkward potion'),
(15,9,2,'Base ingredient'),

--potion of wind charging
(16,1,1,'Create awkward potion'),
(16,4,2,'Wind charge catalyst'),

--potion of oozing
(17,1,1,'Create awkward potion'),
(17,2,2,'Slime catalyst'),

--potion of weaving
(18,1,1,'Create awkward potion'),
(18,5,2,'Cobweb catalyst'),

--potion of infestation
(19,1,1,'Create awkward potion'),
(19,6,2,'Infestation catalyst');


-- Customers: 8

INSERT INTO customer VALUES
(1,'Steve','Miner','steve@minecraft.com',120),
(2,'Alex','Builder','alex@minecraft.com',250),
(3,'Villager','Trader','villager@minecraft.com',45),
(4,'Enderman','Walker','enderman@minecraft.com',500),
(5,'Piglin','Merchant','piglin@minecraft.com',80),
(6,'Witch','Brewer','witch@minecraft.com',175),
(7,'Skeleton','Archer','skeleton@minecraft.com',60),
(8,'Zombie','Hunter','zombie@minecraft.com',0);


-- Shop_inventory: 19

INSERT INTO shop_inventory VALUES
(1,1,15.99,30),
(2,2,24.99,20),
(3,3,29.99,25),
(4,4,19.99,35),
(5,5,22.99,18),
(6,6,18.99,14),
(7,7,17.99,20),
(8,8,16.99,20),
(9,9,26.99,15),
(10,10,29.99,12),
(11,11,14.99,22),
(12,12,12.99,25),
(13,13,27.99,10),
(14,14,18.99,16),
(15,15,34.99,8),
(16,16,31.99,12),
(17,17,30.99,10),
(18,18,28.99,11),
(19,19,29.99,9);

-- Cust_transactions: 20

INSERT INTO cust_transactions VALUES
(1,1,1,2,31.98),
(2,1,3,1,29.99),
(3,2,2,3,74.97),
(4,2,4,2,39.98),
(5,3,5,1,22.99),
(6,4,15,2,69.98),
(7,4,10,1,29.99),
(8,5,6,4,75.96),
(9,5,1,2,31.98),
(10,6,16,1,31.99),
(11,6,17,1,30.99),
(12,7,11,2,29.98),
(13,8,7,1,17.99),
(14,8,2,1,24.99),
(15,1,18,3,86.97),
(16,2,19,2,59.98),
(17,3,8,5,84.95),
(18,4,9,1,26.99),
(19,5,13,2,55.98),
(20,6,14,3,56.97);
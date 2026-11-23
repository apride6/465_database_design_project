# Amaya's Auspicious Alchemy

Amaya's Auspicious Alchemy is a React potion-shop application with an Express/SQLite backend.

## Limitation
there are no known limitations

## Returning users
run **npm install** to install dependencies, then run **npm run dev** to start the application.

## First-time setup

These instructions assume you are setting up the project on a computer that does
not have the required tools installed yet.

### 1. Install Node.js

1. Go to [https://nodejs.org/](https://nodejs.org/).
2. Download the **LTS** version for your operating system.
3. Run the installer and accept the default options. npm is included with Node.js.
4. Close and reopen PowerShell or your terminal.

Verify that both tools are installed:

```powershell
node --version
npm --version
```

Node.js 18 or newer is recommended.

### 2. Download and extract the project

Download the project as a ZIP file, then extract the ZIP. A convenient location
on Windows is the **Downloads** folder, but any folder is acceptable.

After extracting, make sure you have opened the actual project folder. It should
contain `package.json`, `server.js`, `src`, `public`, and `potion_shop.db`.

### 3. Open a terminal in the project folder

In File Explorer, open the extracted project folder, right-click an empty area,
and choose **Open in Terminal** or **Open PowerShell window here**.

Alternatively, open a terminal and change to the folder manually. Replace the
path below with the location where you extracted the project:

```powershell
cd "C:\path\to\AmayasAuspiciousAlchemy"
```

For example, if it was extracted into your Downloads folder:

```powershell
cd "$HOME\Downloads\AmayasAuspiciousAlchemy"
```

### 4. Install the project dependencies

Run this command from the project folder:

```powershell
npm install
```

This downloads the frontend and backend packages listed in `package.json`.
No separate database server is required because the application uses SQLite.

## Files required to run

Keep these files and folders in the project:

- `package.json` and `package-lock.json` - JavaScript dependencies and npm scripts
- `server.js` - Express backend and API routes
- `src/` - React frontend source
- `public/` - frontend public files
- `potion_shop.db` - the SQLite database containing the application data and schema

The `node_modules/` folder does not need to be copied or committed. It is recreated by `npm install`.

## Run the application

### Recommended: run frontend and backend together

```powershell
npm run dev
```
Then wait for the application to open it may take a few moments.

Then open the frontend at [http://localhost:3000](http://localhost:3000). 

This command starts:

- React development server on port `3000`
- Express API server on port `5000`

The React development server proxies `/api` requests to `http://localhost:5000`.

### Run the servers separately

Use two terminal windows.

**Terminal 1 - backend:**

```powershell
npm start
```

The backend runs at [http://localhost:5000](http://localhost:5000).

**Terminal 2 - frontend:**

```powershell
npm run client
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

## Accounts

The backend creates the default owner account when it starts if it does not already exist:

Don't include any spaces:
```text
Email: owner@amayasalchemy.com
Password: AlchemyOwner2026!
```

Customers can create an account from the registration form. Passwords must be at least eight characters long.

## Required application operations

After logging in, the application provides the rubric operations through these
tabs and controls:

1. **Search or browse data:** Use **Search potions** to browse potions and filter
   by name, effect, or potion type.
2. **Display related data:** Use **Brew recipes** as a customer, or
   **Recipes & planning** as an owner, to display potion recipes with their
   related ingredients.
3. **Add data:** Use **New customer** on the login screen to add a customer
   account, or use **Add a new potion and recipe** in the owner's
   **Recipes & planning** tab.
4. **Update data:** Owners can use the **Inventory** tab to change a potion's
   price and add stock.
5. **Summary/report:** Owners can use the **VIP report** tab to view customer
   order counts and total spending.
6. **Additional meaningful operation:** Customers can use **Cart & checkout** to
   purchase potions. This records the transaction, decreases inventory, and
   updates reward points in one database transaction. Owners can also brew
   potions from **Recipes & planning**, which consumes ingredients and adds
   finished potions to inventory.

## Database

The backend opens `potion_shop.db` from the project root. On startup it:

- Enables SQLite foreign-key constraints
- Creates the `accounts` table if needed
- Creates the `ingredient_stock` table if needed
- Inserts the default owner account if it does not already exist
- Initializes missing ingredient-stock rows with a quantity of `10`

The existing database file is required because the backend expects the application tables and seed data to already be present. Do not delete or rename `potion_shop.db` unless you have another compatible database backup.

To back up the application data, stop the backend and copy:

```text
potion_shop.db
```

No database migration or backend-file update is required for this setup documentation.

## Production build

Create an optimized frontend build with:

```powershell
npm run build
```

The output is written to `build/`. The current `server.js` starts the API only; it does not serve the React production build. For local development, use `npm run dev`.

## Troubleshooting

### `npm` or `node` is not recognized

Install Node.js from [https://nodejs.org/](https://nodejs.org/) and restart the terminal.

### The frontend cannot reach the API

Confirm that the backend terminal is running and listening on port `5000`. If port `5000` is already in use, stop the other process before starting the application.

### Database errors appear on startup

Confirm that `potion_shop.db` is in the project root next to `server.js`. Restore it from a backup if it was moved, renamed, or replaced with an incompatible SQLite file.

### Port `3000` is already in use

Stop the other development server, or allow Create React App to offer another available frontend port. The backend remains on port `5000`.

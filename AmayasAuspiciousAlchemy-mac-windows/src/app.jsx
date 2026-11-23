import React, { useEffect, useState } from 'react';
import './styles.css';

const API_BASE = `${process.env.REACT_APP_API_BASE || ''}/api`;

async function readResponse(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function LoginScreen({ onLogin, darkMode, setDarkMode }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_BASE}/${mode === 'login' ? 'auth/login' : 'customers'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email: form.email, password: form.password } : form)
      });
      const data = await readResponse(response);
      if (mode === 'login') {
        onLogin(data);
      } else {
        setMode('login');
        setError('Account created. You can now log in.');
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <main className="login-page">
      <button className="theme-toggle floating-toggle" onClick={() => setDarkMode(!darkMode)}>{darkMode ? 'Light' : 'Neon dark'}</button>
      <section className="login-card">
        <div className="brand-mark">✦</div>
        <h1>Amaya&apos;s Auspicious Alchemy</h1>
        <p className="muted">{mode === 'login' ? 'Enter the shop portal' : 'Create a customer account'}</p>
        <div className="mode-tabs">
          <button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Log in</button>
          <button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>New customer</button>
        </div>
        <form onSubmit={submit} className="stack-form">
          {mode === 'register' && <>
            <input name="firstName" placeholder="First name" value={form.firstName} onChange={update} required />
            <input name="lastName" placeholder="Last name" value={form.lastName} onChange={update} required />
          </>}
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={update} required />
          <input name="password" type="password" placeholder="Password (8+ characters)" value={form.password} onChange={update} minLength="8" required />
          <button className="primary-button" type="submit">{mode === 'login' ? 'Enter the shop' : 'Create account'}</button>
        </form>
        {error && <p className={error.startsWith('Account') ? 'success-text' : 'error-text'}>{error}</p>}
      </section>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('alchemySession');
    return saved ? JSON.parse(saved) : null;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('alchemyTheme') === 'dark');
  const [activeTab, setActiveTab] = useState('browse');
  const [status, setStatus] = useState(null);
  const [potions, setPotions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [report, setReport] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [recipeId, setRecipeId] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeEffect, setRecipeEffect] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [effect, setEffect] = useState('');
  const [potionType, setPotionType] = useState('');
  const [filterOptions, setFilterOptions] = useState({ effects: [], potionTypes: [] });
  const [inventorySearch, setInventorySearch] = useState('');
  const [restock, setRestock] = useState({ shopItemId: '', price: '', addQty: '' });
  const [cart, setCart] = useState([]);
  const [cartQuantities, setCartQuantities] = useState({});
  const [planner, setPlanner] = useState({ recipes: [], ingredientNeeds: [], lowStockLimit: 5 });
  const [plannerSearch, setPlannerSearch] = useState('');
  const [plannerEffect, setPlannerEffect] = useState('');
  const [plannerPotionType, setPlannerPotionType] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [lowStockLimit, setLowStockLimit] = useState('5');
  const setLowLimit = setLowStockLimit;
  const [newPotion, setNewPotion] = useState({ potionName: '', effect: '', potionType: 'Positive', level: '1', price: '', ingredients: '' });

  const isOwner = session?.account.role === 'owner';
  const authFetch = (url, options = {}) => fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { Authorization: `Bearer ${session.token}`, ...(options.headers || {}) }
  });
  const notify = (type, text) => setStatus({ type, text });

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : '';
    localStorage.setItem('alchemyTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  useEffect(() => {
    if (!status) return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    if (!isOwner || activeTab !== 'report') return undefined;
    fetchReport();
    const timer = window.setInterval(fetchReport, 5000);
    return () => window.clearInterval(timer);
  }, [activeTab, isOwner]);

  const loadInventory = async (searchText = inventorySearch) => {
    setInventory(await readResponse(await authFetch(`/inventory?search=${encodeURIComponent(searchText)}`)));
  };
  const loadData = async (filters = { search, effect, potionType }) => {
    try {
      const query = `?search=${encodeURIComponent(filters.search)}&effect=${encodeURIComponent(filters.effect)}&potionType=${encodeURIComponent(filters.potionType)}`;
      setPotions(await readResponse(await authFetch(`/potions${query}`)));
      await loadInventory();
      if (isOwner) {
        if (activeTab === 'recipes') await loadPlanner();
      } else if (session.account.customerId) {
        setCustomer(await readResponse(await authFetch(`/customers?email=${encodeURIComponent(session.account.email)}`)));
      }
    } catch (error) {
      notify('error', error.message);
    }
  };
  useEffect(() => {
    if (session) {
      loadData();
      authFetch('/potion-filters')
        .then(readResponse)
        .then(setFilterOptions)
        .catch((error) => notify('error', error.message));
    }
  }, [session]);

  const loadPlanner = async () => {
    try {
      const query = `?search=${encodeURIComponent(plannerSearch)}&effect=${encodeURIComponent(plannerEffect)}&potionType=${encodeURIComponent(plannerPotionType)}&lowStockOnly=${lowStockOnly}&lowStockLimit=${lowStockLimit}`;
      setPlanner(await readResponse(await authFetch(`/owner/recipe-planner${query}`)));
    } catch (error) {
      notify('error', error.message);
    }
  };
  const login = (data) => {
    localStorage.setItem('alchemySession', JSON.stringify(data));
    setSession(data);
  };
  const logout = async () => {
    await authFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('alchemySession');
    setSession(null);
  };
  const fetchRecipe = async (event) => {
    event.preventDefault();
    try {
      setRecipe(await readResponse(await authFetch(`/recipes/${recipeId}`)));
    } catch (error) {
      notify('error', error.message);
    }
  };
  const searchRecipes = async (event) => {
    event?.preventDefault();
    try {
      const query = `?search=${encodeURIComponent(recipeSearch)}&effect=${encodeURIComponent(recipeEffect)}`;
      setRecipes(await readResponse(await authFetch(`/recipes${query}`)));
    } catch (error) {
      notify('error', error.message);
    }
  };
  const addToCart = (shopItemId) => {
    const quantity = Number.parseInt(cartQuantities[shopItemId], 10);
    if (!quantity || quantity < 1) return notify('error', 'Choose a quantity before adding an item.');
    setCart((current) => {
      const existing = current.find((item) => item.shopItemId === shopItemId);
      if (existing) return current.map((item) => item.shopItemId === shopItemId ? { ...item, quantity: item.quantity + quantity } : item);
      return [...current, { shopItemId, quantity }];
    });
    setCartQuantities({ ...cartQuantities, [shopItemId]: '' });
    notify('success', 'Potion added to your cart.');
  };
  const checkout = async () => {
    try {
      const result = await readResponse(await authFetch('/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.customer_id, items: cart })
      }));
      notify('success', result.message);
      setCart([]);
      await loadData();
    } catch (error) {
      notify('error', error.message);
    }
  };
  const updateCartQuantity = (shopItemId, quantity) => {
    const nextQuantity = Number.parseInt(quantity, 10);
    if (!nextQuantity || nextQuantity < 1) return setCart(cart.filter((item) => item.shopItemId !== shopItemId));
    setCart(cart.map((item) => item.shopItemId === shopItemId ? { ...item, quantity: nextQuantity } : item));
  };
  const updateInventory = async (event) => {
    event.preventDefault();
    try {
      await readResponse(await authFetch(`/inventory/${restock.shopItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restock)
      }));
      notify('success', 'Inventory updated.');
      setRestock({ shopItemId: '', price: '', addQty: '' });
      loadData();
    } catch (error) {
      notify('error', error.message);
    }
  };
  const fetchReport = async () => {
    try {
      setReport(await readResponse(await authFetch('/reports/customer-summary')));
    } catch (error) {
      notify('error', error.message);
    }
  };
  const createPotion = async (event) => {
    event.preventDefault();
    try {
      const ingredients = newPotion.ingredients.split('\n').map((line) => {
        const [name, ...description] = line.split('|');
        return { name: name.trim(), description: description.join('|').trim() || 'Add ingredient' };
      }).filter((step) => step.name);
      await readResponse(await authFetch('/owner/potions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newPotion, ingredients }) }));
      notify('success', 'Potion and recipe saved permanently.');
      setNewPotion({ potionName: '', effect: '', potionType: 'Positive', level: '1', price: '', ingredients: '' });
      loadData();
    } catch (error) { notify('error', error.message); }
  };
  const brewPotion = async (potionId) => {
    try {
      const result = await readResponse(await authFetch(`/owner/brew/${potionId}`, { method: 'POST' }));
      notify('success', result.message);
      await loadData();
      await loadPlanner();
    } catch (error) { notify('error', error.message); }
  };

  if (!session) return <LoginScreen onLogin={login} darkMode={darkMode} setDarkMode={setDarkMode} />;
  return (
    <main className="app-shell">
      <header className="app-header">
        <div><span className="eyebrow">{isOwner ? 'OWNER CONSOLE' : 'CUSTOMER PORTAL'}</span><h1>✦ Amaya&apos;s Auspicious Alchemy</h1></div>
        <div className="header-actions"><span>{session.account.email}{!isOwner && customer && ` · ${customer.reward_points} reward points`}</span><button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>{darkMode ? 'Light' : 'Neon dark'}</button><button onClick={logout}>Log out</button></div>
      </header>
      {status && <div className={`status ${status.type}`}>{status.text}<button onClick={() => setStatus(null)}>x</button></div>}
      <nav className="nav-tabs">
        <button className={activeTab === 'browse' ? 'active' : ''} onClick={() => setActiveTab('browse')}>Search potions</button>
        <button className={activeTab === 'recipes' ? 'active' : ''} onClick={() => { setActiveTab('recipes'); if (isOwner) loadPlanner(); }}>{isOwner ? 'Recipes & planning' : 'Brew recipes'}</button>
        {isOwner && <><button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>Inventory</button><button className={activeTab === 'report' ? 'active' : ''} onClick={() => { setActiveTab('report'); fetchReport(); }}>VIP report</button></>}
        {!isOwner && <button className={activeTab === 'purchase' ? 'active' : ''} onClick={() => setActiveTab('purchase')}>Cart & checkout ({cart.length})</button>}
      </nav>
      <section className="content-card">
        {activeTab === 'browse' && <><h2>All potions</h2><form className="filter-form" onSubmit={(event) => { event.preventDefault(); loadData({ search, effect, potionType }); }}><input placeholder="Search potion name or effect text..." value={search} onChange={(event) => setSearch(event.target.value)} /><select value={effect} onChange={(event) => setEffect(event.target.value)}><option value="">All effects</option>{filterOptions.effects.map((option) => <option key={option} value={option}>{option}</option>)}</select><select value={potionType} onChange={(event) => setPotionType(event.target.value)}><option value="">All types</option>{filterOptions.potionTypes.map((option) => <option key={option} value={option}>{option}</option>)}</select><button className="primary-button">Search potions</button><button type="button" onClick={() => { setSearch(''); setEffect(''); setPotionType(''); loadData({ search: '', effect: '', potionType: '' }); }}>Clear</button></form><p className="muted">{potions.length} potion(s) shown. Search matches names and effect text.</p><DataTable rows={potions} /></>}
        {activeTab === 'recipes' && !isOwner && <><h2>All brew recipes</h2><form onSubmit={searchRecipes} className="filter-form"><input placeholder="Search by potion name or ingredient..." value={recipeSearch} onChange={(event) => setRecipeSearch(event.target.value)} /><input placeholder="Filter by effect text..." value={recipeEffect} onChange={(event) => setRecipeEffect(event.target.value)} /><button className="primary-button">Search recipes</button></form><p className="muted">{recipes.length} recipe step(s) shown.</p><RecipeTable recipes={recipes} /><details className="recipe-id-lookup"><summary>Look up a recipe by potion ID</summary><form onSubmit={fetchRecipe} className="inline-form"><input type="number" placeholder="Potion ID" value={recipeId} onChange={(event) => setRecipeId(event.target.value)} required /><button className="primary-button">Fetch recipe</button></form>{recipe && <RecipeList recipe={recipe} />}</details></>}
        {activeTab === 'recipes' && isOwner && <><OwnerPlanner planner={planner} options={filterOptions} search={plannerSearch} setSearch={setPlannerSearch} effect={plannerEffect} setEffect={setPlannerEffect}         potionType={plannerPotionType} setPotionType={setPlannerPotionType} lowOnly={lowStockOnly} setLowOnly={setLowStockOnly} lowLimit={lowStockLimit} setLowLimit={setLowStockLimit} onSearch={loadPlanner} onBrew={brewPotion} /><h2>Add a new potion and recipe</h2><p className="muted">One ingredient per line: <code>Ingredient name | instructions</code>. New ingredients start with 10 units.</p><form onSubmit={createPotion} className="stack-form narrow"><input placeholder="Potion name" value={newPotion.potionName} onChange={(event) => setNewPotion({ ...newPotion, potionName: event.target.value })} required /><input placeholder="Effect" value={newPotion.effect} onChange={(event) => setNewPotion({ ...newPotion, effect: event.target.value })} required /><select value={newPotion.potionType} onChange={(event) => setNewPotion({ ...newPotion, potionType: event.target.value })}><option>Positive</option><option>Negative</option><option>Mixed</option><option>Special</option><option>Utility</option></select><input type="number" min="1" max="3" placeholder="Level" value={newPotion.level} onChange={(event) => setNewPotion({ ...newPotion, level: event.target.value })} required /><input type="number" min="0" step="0.01" placeholder="Price" value={newPotion.price} onChange={(event) => setNewPotion({ ...newPotion, price: event.target.value })} required /><textarea rows="4" placeholder={'Nether Wart | Add to the cauldron\nGlowstone Dust | Stir until bright'} value={newPotion.ingredients} onChange={(event) => setNewPotion({ ...newPotion, ingredients: event.target.value })} required /><button className="primary-button">Save potion and recipe</button></form></>}
        {activeTab === 'inventory' && isOwner && <><h2>Shop inventory</h2><form className="filter-form" onSubmit={(event) => { event.preventDefault(); loadInventory(inventorySearch); }}><input placeholder="Search inventory by potion or effect..." value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} /><button className="primary-button">Search inventory</button><button type="button" onClick={() => { setInventorySearch(''); loadInventory(''); }}>Show all inventory</button></form><p className="muted">{inventory.length} inventory item(s) shown.</p><table><thead><tr><th>Potion</th><th>Effect</th><th>Price</th><th>Stock</th></tr></thead><tbody>{inventory.map((item) => <tr key={item.shop_item_id}><td>{item.potion_name}</td><td>{item.effect}</td><td>${Number(item.price).toFixed(2)}</td><td className={item.quantity <= 5 ? 'low-stock' : ''}>{item.quantity}</td></tr>)}</tbody></table><h2>Update inventory</h2><form onSubmit={updateInventory} className="stack-form narrow"><select value={restock.shopItemId} onChange={(event) => setRestock({ ...restock, shopItemId: event.target.value })} required><option value="">Select shop item</option>{inventory.map((item) => <option key={item.shop_item_id} value={item.shop_item_id}>{item.potion_name} (stock: {item.quantity})</option>)}</select><input type="number" step="0.01" placeholder="New price" value={restock.price} onChange={(event) => setRestock({ ...restock, price: event.target.value })} required /><input type="number" placeholder="Quantity to add" value={restock.addQty} onChange={(event) => setRestock({ ...restock, addQty: event.target.value })} required /><button className="primary-button">Update inventory</button></form></>}
        {activeTab === 'report' && isOwner && <><div className="section-heading"><div><h2>Customer accounts and spending</h2><p className="muted">All stored customer accounts are shown, including customers who have not purchased yet.</p></div><button onClick={fetchReport}>Refresh report</button></div><table><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Total spent</th></tr></thead><tbody>{report.map((row) => <tr key={row.customer_id}><td>{row.first_name} {row.last_name}</td><td>{row.email}</td><td>{row.total_orders}</td><td>${Number(row.total_spent).toFixed(2)}</td></tr>)}</tbody></table></>}
        {activeTab === 'purchase' && !isOwner && <CustomerCheckout inventory={inventory} customer={customer} cart={cart} quantities={cartQuantities} setQuantities={setCartQuantities} addToCart={addToCart} updateCartQuantity={updateCartQuantity} checkout={checkout} />}
      </section>
    </main>
  );
}

function DataTable({ rows }) {
  return <table><thead><tr><th>Name</th><th>Effect</th><th>Level</th><th>Type</th></tr></thead><tbody>{rows.map((potion) => <tr key={potion.potion_id}><td><strong>{potion.potion_name}</strong></td><td>{potion.effect}</td><td>{potion.level}</td><td>{potion.potion_type}</td></tr>)}</tbody></table>;
}

function RecipeList({ recipe }) {
  return <><h3>{recipe[0].potion_name}</h3><ol>{recipe.map((step) => <li key={step.step_order}><strong>Step {step.step_order}:</strong> Add {step.ingredient_name} - <em>{step.description}</em></li>)}</ol></>;
}

function CustomerCheckout({ inventory, customer, cart, quantities, setQuantities, addToCart, updateCartQuantity, checkout }) {
  return <><h2>Build your potion order</h2><p className="muted">You have <strong>{customer?.reward_points || 0} reward points</strong>. Earn 1 point per whole dollar spent.</p><p className="muted">Add as many different potions as you want, then check out once.</p><div className="shop-grid">{inventory.map((item) => <div className="shop-item" key={item.shop_item_id}><strong>{item.potion_name}</strong><span>${Number(item.price).toFixed(2)} | {item.quantity} in stock</span><div className="add-row"><input type="number" min="1" max={item.quantity} placeholder="Qty" value={quantities[item.shop_item_id] || ''} onChange={(event) => setQuantities({ ...quantities, [item.shop_item_id]: event.target.value })} /><button onClick={() => addToCart(item.shop_item_id)}>Add</button></div></div>)}</div><div className="cart-box"><h3>Your cart ({cart.length} items)</h3>{cart.length === 0 ? <p className="muted">Your cart is empty.</p> : <>{cart.map((item) => { const detail = inventory.find((entry) => entry.shop_item_id === item.shopItemId); return <div className="cart-row" key={item.shopItemId}><span>{detail?.potion_name || `Item ${item.shopItemId}`}</span><input type="number" min="1" max={detail?.quantity} value={item.quantity} onChange={(event) => updateCartQuantity(item.shopItemId, event.target.value)} /><strong>${(Number(detail?.price || 0) * item.quantity).toFixed(2)}</strong></div>; })}<button className="primary-button" onClick={checkout} disabled={!customer}>Checkout all potions</button></>}</div></>;
}

function countRecipePotions(recipes) {
  return new Set(recipes.map((recipe) => recipe.potion_id)).size;
}

function RecipeCards({ recipes, onBrew }) {
  const grouped = recipes.reduce((groups, step) => {
    const key = step.potion_id || step.potion_name;
    if (!groups[key]) groups[key] = {
      potion_id: step.potion_id,
      potion_name: step.potion_name,
      effect: step.effect,
      potion_type: step.potion_type,
      stock_quantity: step.stock_quantity,
      steps: []
    };
    groups[key].steps.push(step);
    return groups;
  }, {});

  return <div className="recipe-cards">{Object.values(grouped).map((recipe) => (
    <details className="recipe-card" key={recipe.potion_id || recipe.potion_name}>
      <summary><strong>{recipe.potion_name}</strong><span>{recipe.effect} · {recipe.potion_type} · {recipe.stock_quantity ?? 0} in stock · {recipe.steps.length} step(s)</span></summary>
      <ol>{recipe.steps.map((step, index) => <li key={`${step.step_order}-${index}`}><strong>Step {step.step_order}:</strong> Add {step.ingredient_name} - <em>{step.description}</em></li>)}</ol>{onBrew && <button className="primary-button" onClick={() => onBrew(recipe.potion_id)}>Brew 3 potions</button>}
    </details>
  ))}</div>;
}

function RecipeTable({ recipes }) {
  return <RecipeCards recipes={recipes} />;
}

function OwnerPlanner({ planner, options, search, setSearch, effect, setEffect, potionType, setPotionType, lowOnly, setLowOnly, lowLimit, setLowLimit, onSearch, onBrew }) {
  return <><h2>All recipes and ingredient planning</h2><p className="muted">Every matching recipe step is shown with its potion name. Search by potion name, ingredient, effect text, alignment, or healing/harming category.</p><form className="planner-filters" onSubmit={(event) => { event.preventDefault(); onSearch(); }}><input placeholder="Search potion or ingredient..." value={search} onChange={(event) => setSearch(event.target.value)} /><select value={effect} onChange={(event) => setEffect(event.target.value)}><option value="">All effects</option>{options.effects.map((option) => <option key={option} value={option}>{option}</option>)}</select><select value={potionType} onChange={(event) => setPotionType(event.target.value)}><option value="">All types</option>{options.potionTypes.map((option) => <option key={option} value={option}>{option}</option>)}</select><label><input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} /> Low stock only</label><input className="small-input" type="number" min="0" value={lowLimit} onChange={(event) => setLowLimit(event.target.value)} /><button className="primary-button">Search recipes</button></form><h3>Ingredients most needed</h3><table><thead><tr><th>Ingredient</th><th>Stock</th><th>Recipes</th><th>Steps</th><th>Low-stock recipes</th><th>Priority</th></tr></thead><tbody>{planner.ingredientNeeds.map((item) => <tr key={item.ingredient_id}><td><strong>{item.ingredient_name}</strong></td><td className={item.ingredient_stock <= lowLimit ? 'low-stock' : ''}>{item.ingredient_stock}</td><td>{item.recipe_count}</td><td>{item.step_count}</td><td>{item.low_stock_recipe_count}</td><td className="priority-score">{item.restock_priority}</td></tr>)}</tbody></table><h3>All matching recipe steps</h3>{planner.recipes.length ? <RecipeCards recipes={planner.recipes} onBrew={onBrew} /> : <p className="muted">No recipes match the current filters.</p>}</>;
}

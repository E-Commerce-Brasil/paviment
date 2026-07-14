import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const app = new Hono();
app.use("*", logger(console.log));

// Handle preflight OPTIONS requests before any other middleware
app.options("*", (c) => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

app.get("/make-server-24e8febc/health", (c) => c.json({ status: "ok" }));

// ── Products ──────────────────────────────────────────────────────

app.post("/make-server-24e8febc/products/seed", async (c) => {
  const products = await c.req.json();
  await kv.set("villagres_products", products);
  await kv.set("villagres_seeded", true);
  return c.json({ ok: true, count: products.length });
});

app.get("/make-server-24e8febc/products/seeded", async (c) => {
  const seeded = await kv.get("villagres_seeded");
  return c.json({ seeded: !!seeded });
});

app.get("/make-server-24e8febc/products", async (c) => {
  const q = (c.req.query("q") || "").toLowerCase();
  const superficie = c.req.query("superficie") || "";
  const localUso = c.req.query("localUso") || "";
  const colecao = c.req.query("colecao") || "";

  const all: any[] = (await kv.get("villagres_products")) || [];
  let filtered = all;

  if (q) {
    filtered = filtered.filter((p: any) =>
      p.linha?.toLowerCase().includes(q) ||
      p.colecao?.toLowerCase().includes(q) ||
      p.cor?.toLowerCase().includes(q) ||
      p.formato?.toLowerCase().includes(q) ||
      p.referencia?.toLowerCase().includes(q) ||
      p.superficie?.toLowerCase().includes(q)
    );
  }
  if (superficie) filtered = filtered.filter((p: any) => p.superficie === superficie);
  if (localUso) filtered = filtered.filter((p: any) => String(p.localUso) === localUso);
  if (colecao) filtered = filtered.filter((p: any) => p.colecao === colecao);

  return c.json(filtered.slice(0, 120));
});

app.get("/make-server-24e8febc/products/meta", async (c) => {
  const all: any[] = (await kv.get("villagres_products")) || [];
  const superficies = [...new Set(all.map((p: any) => p.superficie).filter(Boolean))].sort();
  const colecoes = [...new Set(all.map((p: any) => p.colecao).filter(Boolean))].sort();
  const linhas = [...new Set(all.map((p: any) => p.linha).filter(Boolean))].sort();
  return c.json({ superficies, colecoes, linhas });
});

// ── Customers ─────────────────────────────────────────────────────

app.get("/make-server-24e8febc/customers", async (c) => {
  const q = (c.req.query("q") || "").toLowerCase();
  const all: any[] = (await kv.get("villagres_customers")) || [];
  if (!q) return c.json(all.slice(0, 50));
  const filtered = all.filter((cu: any) =>
    cu.nome?.toLowerCase().includes(q) ||
    cu.cpf?.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
    cu.email?.toLowerCase().includes(q)
  );
  return c.json(filtered);
});

app.post("/make-server-24e8febc/customers", async (c) => {
  const body = await c.req.json();
  const customers: any[] = (await kv.get("villagres_customers")) || [];
  const newCustomer = {
    id: crypto.randomUUID(),
    nome: body.nome || "",
    cpf: body.cpf || "",
    email: body.email || "",
    telefone: body.telefone || "",
    endereco: body.endereco || "",
    cidade: body.cidade || "",
    estado: body.estado || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  customers.unshift(newCustomer);
  await kv.set("villagres_customers", customers);
  return c.json(newCustomer, 201);
});

app.put("/make-server-24e8febc/customers/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const customers: any[] = (await kv.get("villagres_customers")) || [];
  const idx = customers.findIndex((cu: any) => cu.id === id);
  if (idx === -1) return c.json({ error: "not found" }, 404);
  customers[idx] = { ...customers[idx], ...body, updatedAt: new Date().toISOString() };
  await kv.set("villagres_customers", customers);
  return c.json(customers[idx]);
});

// ── Budgets ───────────────────────────────────────────────────────

function recalcBudget(budget: any): any {
  const subtotal = (budget.items || []).reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
  const impostos = subtotal * ((budget.percentualImposto || 0) / 100);
  const totalFinal = subtotal + impostos + (budget.frete || 0);
  return { ...budget, subtotal, totalFinal };
}

app.get("/make-server-24e8febc/budgets", async (c) => {
  const customerId = c.req.query("customerId");
  const all: any[] = (await kv.get("villagres_budgets")) || [];
  if (customerId) return c.json(all.filter((b: any) => b.customerId === customerId));
  return c.json(all);
});

app.post("/make-server-24e8febc/budgets", async (c) => {
  const body = await c.req.json();
  const budgets: any[] = (await kv.get("villagres_budgets")) || [];
  let counter: number = ((await kv.get("villagres_budget_counter")) as number) || 0;
  counter++;
  await kv.set("villagres_budget_counter", counter);

  const newBudget = recalcBudget({
    id: crypto.randomUUID(),
    numero: counter,
    customerId: body.customerId,
    status: "rascunho",
    tabelaPreco: 1,
    frete: 0,
    percentualImposto: 0,
    observacoes: "",
    items: [],
    subtotal: 0,
    totalFinal: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  budgets.unshift(newBudget);
  await kv.set("villagres_budgets", budgets);
  return c.json(newBudget, 201);
});

app.get("/make-server-24e8febc/budgets/:id", async (c) => {
  const id = c.req.param("id");
  const budgets: any[] = (await kv.get("villagres_budgets")) || [];
  const budget = budgets.find((b: any) => b.id === id);
  if (!budget) return c.json({ error: "not found" }, 404);
  return c.json(budget);
});

app.put("/make-server-24e8febc/budgets/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const budgets: any[] = (await kv.get("villagres_budgets")) || [];
  const idx = budgets.findIndex((b: any) => b.id === id);
  if (idx === -1) return c.json({ error: "not found" }, 404);
  budgets[idx] = recalcBudget({
    ...budgets[idx],
    ...body,
    updatedAt: new Date().toISOString(),
  });
  await kv.set("villagres_budgets", budgets);
  return c.json(budgets[idx]);
});

app.delete("/make-server-24e8febc/budgets/:id", async (c) => {
  const id = c.req.param("id");
  const budgets: any[] = (await kv.get("villagres_budgets")) || [];
  const filtered = budgets.filter((b: any) => b.id !== id);
  await kv.set("villagres_budgets", filtered);
  return c.json({ ok: true });
});

// ── Budget Items ──────────────────────────────────────────────────

app.post("/make-server-24e8febc/budgets/:id/items", async (c) => {
  const budgetId = c.req.param("id");
  const body = await c.req.json();
  const budgets: any[] = (await kv.get("villagres_budgets")) || [];
  const idx = budgets.findIndex((b: any) => b.id === budgetId);
  if (idx === -1) return c.json({ error: "not found" }, 404);

  const newItem = {
    id: crypto.randomUUID(),
    productId: body.productId,
    product: body.product,
    areaM2: body.areaM2,
    caixas: body.caixas,
    precoM2: body.precoM2,
    subtotal: body.subtotal,
    observacao: body.observacao || "",
    createdAt: new Date().toISOString(),
  };
  budgets[idx].items = [...(budgets[idx].items || []), newItem];
  budgets[idx] = recalcBudget(budgets[idx]);
  budgets[idx].updatedAt = new Date().toISOString();
  await kv.set("villagres_budgets", budgets);
  return c.json(budgets[idx], 201);
});

app.put("/make-server-24e8febc/budget-items/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const body = await c.req.json();
  const budgets: any[] = (await kv.get("villagres_budgets")) || [];

  for (let i = 0; i < budgets.length; i++) {
    const itemIdx = (budgets[i].items || []).findIndex((it: any) => it.id === itemId);
    if (itemIdx !== -1) {
      budgets[i].items[itemIdx] = { ...budgets[i].items[itemIdx], ...body };
      budgets[i] = recalcBudget(budgets[i]);
      budgets[i].updatedAt = new Date().toISOString();
      await kv.set("villagres_budgets", budgets);
      return c.json(budgets[i]);
    }
  }
  return c.json({ error: "not found" }, 404);
});

app.delete("/make-server-24e8febc/budget-items/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const budgets: any[] = (await kv.get("villagres_budgets")) || [];

  for (let i = 0; i < budgets.length; i++) {
    const before = (budgets[i].items || []).length;
    budgets[i].items = (budgets[i].items || []).filter((it: any) => it.id !== itemId);
    if (budgets[i].items.length < before) {
      budgets[i] = recalcBudget(budgets[i]);
      budgets[i].updatedAt = new Date().toISOString();
      await kv.set("villagres_budgets", budgets);
      return c.json({ ok: true });
    }
  }
  return c.json({ error: "not found" }, 404);
});

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return app.fetch(req);
});

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import csvRaw from "../imports/tabela_vilagres.csv?raw";
import pavimentLogoPrint from "../imports/WhatsApp_Image_2026-07-11_at_10.17.07-3.jpeg";
import {
  Search, Plus, ArrowLeft, Package, FileText,
  Trash2, Send, Save, X, ChevronRight,
  RotateCcw, AlertTriangle, Pencil, Check, Copy, Printer,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

// ── Supabase client ───────────────────────────────────────────────

const SUPABASE_URL = `https://${projectId}.supabase.co`;
const supabase = createClient(SUPABASE_URL, publicAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ── Types ─────────────────────────────────────────────────────────

interface Product {
  id: string;
  formato: string;
  referencia: string;
  linha: string;
  colecao: string;
  cor: string;
  superficie: string;
  faces: number;
  variacao: string;
  localUso: number;
  derivacao: string;
  m2PorCaixa: number;
  pecasPorCaixa: number;
  m2PorPallet: number;
  cxPorPallet: number;
  pesoBrutoM2: number;
  pesoBrutoCx: number;
  espessuraMm: number;
  preco1: number | null;
  preco2: number | null;
  preco3: number | null;
  preco4: number | null;
  descontinuado: boolean;
}

interface PricingSettings {
  id?: string;
  impostoPercentual: number;
  taxaCartaoPercentual: number;
  fretePor100Kg: number;
}

interface Customer {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  createdAt: string;
}

interface BudgetItem {
  id: string;
  productId: string;
  product: Product;
  areaM2: number;
  caixas: number;
  precoM2: number;
  subtotal: number;
  observacao?: string;
}

type BudgetStatus = "rascunho" | "enviado_fabrica" | "enviado_cliente" | "fechado" | "cancelado";
type FormaPagamento = "avista" | "avista_pix" | "cartao";

interface Budget {
  id: string;
  numero: number;
  customerId: string;
  status: BudgetStatus;
  tabelaPreco: 1 | 2 | 3 | 4;
  frete: number;
  percentualImposto: number;
  formaPagamento: FormaPagamento;
  parcelasCartao: number;
  descontoPixPercentual: number;
  descontoPixIncluiFrete: boolean;
  observacoes?: string;
  tecnico?: string;
  enderecoEntrega?: string;
  entregaCep?: string;
  entregaLogradouro?: string;
  entregaNumero?: string;
  entregaComplemento?: string;
  entregaBairro?: string;
  entregaCidade?: string;
  entregaEstado?: string;
  items: BudgetItem[];
  subtotal: number;
  totalFinal: number;
  createdAt: string;
  updatedAt: string;
}

const TECNICOS = ["Fernanda Costa", "Ricardo Almeida", "Juliana Mendes"];

// ── Mappers (DB snake_case → JS camelCase) ────────────────────────

function mapProduct(r: any): Product {
  return {
    id: r.id,
    referencia: r.referencia || "",
    formato: r.formato || "",
    linha: r.linha || "",
    colecao: r.colecao || "",
    cor: r.cor || "",
    superficie: r.superficie || "",
    faces: r.faces || 0,
    variacao: r.variacao || "",
    localUso: r.local_uso || 3,
    derivacao: r.derivacao || "",
    m2PorCaixa: parseFloat(r.m2_por_caixa) || 0,
    pecasPorCaixa: r.pecas_por_caixa || 0,
    m2PorPallet: parseFloat(r.m2_por_pallet) || 0,
    cxPorPallet: r.cx_por_pallet || 0,
    pesoBrutoM2: parseFloat(r.peso_bruto_m2) || 0,
    pesoBrutoCx: parseFloat(r.peso_bruto_cx) || 0,
    espessuraMm: parseFloat(r.espessura_mm) || 0,
    preco1: r.preco1 != null ? parseFloat(r.preco1) : null,
    preco2: r.preco2 != null ? parseFloat(r.preco2) : null,
    preco3: r.preco3 != null ? parseFloat(r.preco3) : null,
    preco4: r.preco4 != null ? parseFloat(r.preco4) : null,
    descontinuado: r.descontinuado ?? false,
  };
}

function mapCustomer(r: any): Customer {
  return {
    id: r.id,
    nome: r.nome || "",
    cpf: r.cpf || "",
    email: r.email || "",
    telefone: r.telefone || "",
    cep: r.cep || "",
    logradouro: r.logradouro || "",
    numero: r.numero_end || "",
    complemento: r.complemento || "",
    bairro: r.bairro || "",
    cidade: r.cidade || "",
    estado: r.estado || "",
    createdAt: r.created_at,
  };
}

function mapItem(r: any): BudgetItem {
  return {
    id: r.id,
    productId: r.product_id,
    product: mapProduct(r.products),
    areaM2: parseFloat(r.area_m2),
    caixas: r.caixas,
    precoM2: parseFloat(r.preco_m2),
    subtotal: parseFloat(r.subtotal),
    observacao: r.observacao || "",
  };
}

function mapBudget(r: any, items: BudgetItem[] = []): Budget {
  return {
    id: r.id,
    numero: r.numero,
    customerId: r.customer_id,
    status: r.status as BudgetStatus,
    tabelaPreco: r.tabela_preco as 1 | 2 | 3 | 4,
    frete: parseFloat(r.frete) || 0,
    percentualImposto: parseFloat(r.percentual_imposto) || 0,
    formaPagamento: (r.forma_pagamento || "avista") as FormaPagamento,
    parcelasCartao: parseInt(r.parcelas_cartao) || 1,
    descontoPixPercentual: parseFloat(r.desconto_pix_percentual) || 0,
    descontoPixIncluiFrete: r.desconto_pix_inclui_frete === true,
    observacoes: r.observacoes || "",
    tecnico: r.tecnico || "",
    enderecoEntrega: r.endereco_entrega || "",
    entregaCep: r.entrega_cep || "",
    entregaLogradouro: r.entrega_logradouro || "",
    entregaNumero: r.entrega_numero || "",
    entregaComplemento: r.entrega_complemento || "",
    entregaBairro: r.entrega_bairro || "",
    entregaCidade: r.entrega_cidade || "",
    entregaEstado: r.entrega_estado || "",
    items,
    subtotal: parseFloat(r.subtotal) || 0,
    totalFinal: parseFloat(r.total_final) || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── SQL Schema (shown to user on first run) ───────────────────────

export const SETUP_SQL = `-- PAVIMENT · Schema do Banco de Dados
-- Execute no SQL Editor do Supabase (painel lateral > SQL Editor)

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia TEXT NOT NULL UNIQUE,
  formato TEXT, linha TEXT, colecao TEXT, cor TEXT,
  superficie TEXT, faces INTEGER DEFAULT 0,
  variacao TEXT, local_uso INTEGER DEFAULT 3, derivacao TEXT,
  m2_por_caixa DECIMAL(10,4) DEFAULT 0,
  pecas_por_caixa INTEGER DEFAULT 0,
  m2_por_pallet DECIMAL(10,4) DEFAULT 0,
  cx_por_pallet INTEGER DEFAULT 0,
  peso_bruto_m2 DECIMAL(10,4) DEFAULT 0,
  peso_bruto_cx DECIMAL(10,4) DEFAULT 0,
  espessura_mm DECIMAL(10,2) DEFAULT 0,
  preco1 DECIMAL(12,4), preco2 DECIMAL(12,4),
  preco3 DECIMAL(12,4), preco4 DECIMAL(12,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imposto_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  taxa_cartao_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  frete_por_100kg NUMERIC(10,2) NOT NULL DEFAULT 4,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pricing_settings DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL, cpf TEXT, email TEXT,
  telefone TEXT, cep TEXT, logradouro TEXT,
  numero_end TEXT, complemento TEXT, bairro TEXT,
  cidade TEXT, estado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER GENERATED ALWAYS AS IDENTITY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'rascunho',
  tabela_preco INTEGER DEFAULT 1,
  frete DECIMAL(12,2) DEFAULT 0,
  percentual_imposto DECIMAL(5,2) DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'avista',
  parcelas_cartao INTEGER DEFAULT 1,
  desconto_pix_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_pix_inclui_frete BOOLEAN DEFAULT FALSE,
  observacoes TEXT, subtotal DECIMAL(12,2) DEFAULT 0,
  total_final DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  area_m2 DECIMAL(10,2) NOT NULL,
  caixas INTEGER NOT NULL,
  preco_m2 DECIMAL(12,4) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE budget_items DISABLE ROW LEVEL SECURITY;

-- Migrações (execute se já tiver as tabelas criadas)
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS tecnico TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS endereco_entrega TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS descontinuado BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS numero_end TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bairro TEXT;`;

// ── CSV Parsing ───────────────────────────────────────────────────

function parseCSVFull(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ';') { row.push(field.trim()); field = ""; }
      else if (ch === '\n') {
        row.push(field.trim());
        if (row.some((f) => f.length > 0)) rows.push(row);
        row = []; field = "";
      } else if (ch !== '\r') { field += ch; }
    }
  }
  if (field.trim() || row.length > 0) { row.push(field.trim()); if (row.some(f => f.length > 0)) rows.push(row); }
  return rows;
}

function parsePrice(s: string): number | null {
  const clean = (s || "").replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) || n <= 0 ? null : n;
}

function parseNum(s: string): number {
  return parseFloat((s || "").replace(/\./g, "").replace(",", ".").trim()) || 0;
}

function buildProductsFromCSV(csvText: string): Omit<Product, "id">[] {
  const rows = parseCSVFull(csvText);
  const products: Omit<Product, "id">[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 17) continue;
    const ref = row[1]?.trim();
    if (!ref || ref.startsWith("Ref")) continue;
    products.push({
      formato: row[0]?.replace(/\n/g, " ").trim() || "",
      referencia: ref,
      linha: row[2]?.trim() || "",
      colecao: row[3]?.trim() || "",
      cor: row[4]?.trim() || "",
      superficie: row[5]?.trim() || "",
      faces: parseInt(row[6]) || 0,
      variacao: row[7]?.trim() || "",
      localUso: parseInt(row[8]) || 3,
      derivacao: row[9]?.trim() || "",
      m2PorCaixa: parseNum(row[10]),
      pecasPorCaixa: parseInt(row[11]) || 0,
      m2PorPallet: parseNum(row[12]),
      cxPorPallet: parseInt(row[13]) || 0,
      pesoBrutoM2: parseNum(row[14]),
      pesoBrutoCx: parseNum(row[15]),
      espessuraMm: parseNum(row[16]),
      preco1: parsePrice(row[17]),
      preco2: parsePrice(row[18]),
      preco3: parsePrice(row[19]),
      preco4: parsePrice(row[20]),
    });
  }
  return products;
}

// ── Data Layer ────────────────────────────────────────────────────

async function checkTablesExist(): Promise<boolean> {
  const { error } = await supabase.from("products").select("id").limit(1);
  return !error;
}

async function getProductCount(): Promise<number> {
  const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
  return count || 0;
}

async function seedProducts(products: Omit<Product, "id">[]): Promise<void> {
  const rows = products.map((p) => ({
    referencia: p.referencia,
    formato: p.formato,
    linha: p.linha,
    colecao: p.colecao,
    cor: p.cor,
    superficie: p.superficie,
    faces: p.faces,
    variacao: p.variacao,
    local_uso: p.localUso,
    derivacao: p.derivacao,
    m2_por_caixa: p.m2PorCaixa,
    pecas_por_caixa: p.pecasPorCaixa,
    m2_por_pallet: p.m2PorPallet,
    cx_por_pallet: p.cxPorPallet,
    peso_bruto_m2: p.pesoBrutoM2,
    peso_bruto_cx: p.pesoBrutoCx,
    espessura_mm: p.espessuraMm,
    preco1: p.preco1,
    preco2: p.preco2,
    preco3: p.preco3,
    preco4: p.preco4,
  }));
  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "referencia" });
    if (error) throw error;
  }
}

interface BudgetSummary extends Budget {
  customerNome: string;
  customerCidade?: string;
}

function mapBudgetSummary(r: any): BudgetSummary {
  return { ...mapBudget(r, []), customerNome: r.customers?.nome || "", customerCidade: r.customers?.cidade || "" };
}

async function fetchRecentBudgets(limit = 5): Promise<BudgetSummary[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("*, customers(nome, cidade)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapBudgetSummary);
}

async function fetchBudgetsFiltered(filters: {
  tecnico?: string; status?: string; customerQ?: string;
  dataInicio?: string; dataFim?: string;
}): Promise<BudgetSummary[]> {
  let q = supabase.from("budgets").select("*, customers(nome, cidade)");
  if (filters.tecnico) q = q.eq("tecnico", filters.tecnico);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.dataInicio) q = q.gte("created_at", filters.dataInicio);
  if (filters.dataFim) q = q.lte("created_at", filters.dataFim + "T23:59:59");
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  let rows = (data || []).map(mapBudgetSummary);
  if (filters.customerQ) {
    const term = filters.customerQ.toLowerCase();
    rows = rows.filter((b) => b.customerNome.toLowerCase().includes(term));
  }
  return rows;
}

async function seedTecnicosOnExistingBudgets(): Promise<void> {
  const { data } = await supabase.from("budgets").select("id, tecnico").is("tecnico", null);
  if (!data?.length) return;
  await Promise.all(data.map((b, i) =>
    supabase.from("budgets").update({ tecnico: TECNICOS[i % TECNICOS.length] }).eq("id", b.id)
  ));
}

async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("linha");
  if (error) throw error;
  return (data || []).map(mapProduct);
}

async function loadPricingSettings(): Promise<PricingSettings> {
  const { data, error } = await supabase
    .from("pricing_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (data) {
    return {
      id: data.id,
      impostoPercentual: parseDecimalInput(data.imposto_percentual),
      taxaCartaoPercentual: parseDecimalInput(data.taxa_cartao_percentual),
      fretePor100Kg: data.frete_por_100kg == null ? 4 : parseDecimalInput(data.frete_por_100kg),
    };
  }

  const { data: created, error: createError } = await supabase
    .from("pricing_settings")
    .insert({ imposto_percentual: 0, taxa_cartao_percentual: 0, frete_por_100kg: 4 })
    .select()
    .single();
  if (createError) throw createError;

  return {
    id: created.id,
    impostoPercentual: parseDecimalInput(created.imposto_percentual),
    taxaCartaoPercentual: parseDecimalInput(created.taxa_cartao_percentual),
    fretePor100Kg: created.frete_por_100kg == null ? 4 : parseDecimalInput(created.frete_por_100kg),
  };
}

async function savePricingSettings(settings: PricingSettings): Promise<PricingSettings> {
  const payload = {
    imposto_percentual: parseDecimalInput(settings.impostoPercentual),
    taxa_cartao_percentual: parseDecimalInput(settings.taxaCartaoPercentual),
    frete_por_100kg: parseDecimalInput(settings.fretePor100Kg) || 0,
    updated_at: new Date().toISOString(),
  };

  if (settings.id) {
    const { data, error } = await supabase
      .from("pricing_settings")
      .update(payload)
      .eq("id", settings.id)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      impostoPercentual: parseDecimalInput(data.imposto_percentual),
      taxaCartaoPercentual: parseDecimalInput(data.taxa_cartao_percentual),
      fretePor100Kg: data.frete_por_100kg == null ? 4 : parseDecimalInput(data.frete_por_100kg),
    };
  }

  const { data, error } = await supabase
    .from("pricing_settings")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    impostoPercentual: parseDecimalInput(data.imposto_percentual),
    taxaCartaoPercentual: parseDecimalInput(data.taxa_cartao_percentual),
    fretePor100Kg: data.frete_por_100kg == null ? 4 : parseDecimalInput(data.frete_por_100kg),
  };
}

async function searchCustomers(q: string): Promise<Customer[]> {
  if (!q.trim()) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(`nome.ilike.%${q}%,cpf.ilike.%${q}%,telefone.ilike.%${q}%,email.ilike.%${q}%`)
    .order("nome")
    .limit(30);
  if (error) throw error;
  return (data || []).map(mapCustomer);
}

function buildCustomerRow(form: Partial<Customer>) {
  return {
    nome: form.nome,
    cpf: form.cpf || null,
    email: form.email || null,
    telefone: form.telefone || null,
    cep: form.cep || null,
    logradouro: form.logradouro || null,
    numero_end: form.numero || null,
    complemento: form.complemento || null,
    bairro: form.bairro || null,
    cidade: form.cidade || null,
    estado: form.estado || null,
  };
}

function normalizeCustomerName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeCustomerEmail(value: string): string {
  return value.trim().toLowerCase();
}

function formatCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";

  const ddd = digits.slice(0, 2);
  if (digits.length <= 6) return `(${ddd}) ${digits.slice(2)}`;

  if (digits.length <= 10) {
    return `(${ddd}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCEP(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8;
}

interface ViaCepAddress {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

async function fetchAddressByCEP(value: string): Promise<ViaCepAddress | null> {
  const cep = onlyDigits(value);
  if (!isValidCEP(cep)) return null;

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) throw new Error("network");

  const data = await response.json();
  if (data.erro) return null;

  return {
    logradouro: data.logradouro || "",
    bairro: data.bairro || "",
    localidade: data.localidade || "",
    uf: data.uf || "",
  };
}

function buildFullAddress(address: {
  logradouro?: string; numero?: string; complemento?: string; bairro?: string;
  cidade?: string; estado?: string; cep?: string;
}): string {
  const street = [address.logradouro, address.numero, address.complemento].filter(Boolean).join(", ");
  const district = address.bairro || "";
  const cityState = address.cidade ? `${address.cidade}${address.estado ? `/${address.estado}` : ""}` : (address.estado || "");
  const cep = address.cep ? `CEP ${address.cep}` : "";
  return [street, district, cityState, cep].filter(Boolean).join(" - ");
}

function isValidCPF(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcDigit = (factor: number) => {
    let total = 0;
    for (let i = 0; i < factor - 1; i++) {
      total += Number(digits[i]) * (factor - i);
    }
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calcDigit(10) === Number(digits[9]) && calcDigit(11) === Number(digits[10]);
}

function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

function validateCustomerContactFields(cpf: string, telefone: string): boolean {
  if (cpf.trim() && !isValidCPF(cpf)) {
    toast.error("Informe um CPF válido.");
    return false;
  }

  if (telefone.trim() && !isValidPhone(telefone)) {
    toast.error("Informe um telefone válido com DDD.");
    return false;
  }

  return true;
}

async function checkCustomerDuplicate(
  nome: string,
  cpf: string,
  telefone: string,
  email: string,
  excludeId?: string
): Promise<string | null> {
  const normalizedName = normalizeCustomerName(nome);
  const cpfDigits = onlyDigits(cpf);
  const phoneDigits = onlyDigits(telefone);
  const normalizedEmail = normalizeCustomerEmail(email);

  let query = supabase.from("customers").select("id,nome,cpf,telefone,email");
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw error;

  for (const customer of data || []) {
    if (normalizedName && normalizeCustomerName(customer.nome || "") === normalizedName) {
      return `Já existe um cliente com este nome: ${customer.nome}`;
    }

    if (cpfDigits.length === 11 && onlyDigits(customer.cpf || "") === cpfDigits) {
      return `Já existe um cliente com este CPF: ${customer.nome}`;
    }

    if (phoneDigits && onlyDigits(customer.telefone || "") === phoneDigits) {
      return `Já existe um cliente com este telefone: ${customer.nome}`;
    }

    if (normalizedEmail && normalizeCustomerEmail(customer.email || "") === normalizedEmail) {
      return `Já existe um cliente com este e-mail: ${customer.nome}`;
    }
  }

  return null;
}

async function createCustomer(form: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert(buildCustomerRow(form))
    .select()
    .single();
  if (error) throw error;
  return mapCustomer(data);
}

async function updateCustomer(id: string, form: Partial<Customer>): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ ...buildCustomerRow(form), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function deleteCustomer(id: string): Promise<void> {
  const { count, error: ce } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);
  if (ce) throw ce;
  if ((count ?? 0) > 0) throw new Error(`Este cliente possui ${count} orçamento(s) vinculado(s). Exclua todos os orçamentos antes de deletar o cliente.`);
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

async function getBudgetsForCustomer(customerId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("customer_id", customerId)
    .order("numero", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => mapBudget(r, []));
}

async function getBudgetWithItems(budgetId: string): Promise<Budget> {
  const [{ data: b, error: be }, { data: items, error: ie }] = await Promise.all([
    supabase.from("budgets").select("*").eq("id", budgetId).single(),
    supabase.from("budget_items").select("*, products(*)").eq("budget_id", budgetId).order("created_at"),
  ]);
  if (be) throw be;
  if (ie) throw ie;
  return mapBudget(b, (items || []).map(mapItem));
}

async function createBudget(customerId: string, tecnico: string): Promise<Budget> {
  const { data, error } = await supabase
    .from("budgets")
    .insert({ customer_id: customerId, status: "rascunho", tabela_preco: 1, frete: 0, percentual_imposto: 0, forma_pagamento: "avista", parcelas_cartao: 1, desconto_pix_percentual: 0, desconto_pix_inclui_frete: false, tecnico })
    .select()
    .single();
  if (error) throw error;
  return mapBudget(data, []);
}

async function runMigrations(): Promise<void> {
  try {
    await supabase.rpc("exec_sql", { sql: `
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS tecnico TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS endereco_entrega TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS entrega_cep TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS entrega_logradouro TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS entrega_numero TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS entrega_complemento TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS entrega_bairro TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS entrega_cidade TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS entrega_estado TEXT;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'avista';
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS parcelas_cartao INTEGER DEFAULT 1;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS desconto_pix_percentual NUMERIC(5,2) DEFAULT 0;
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS desconto_pix_inclui_frete BOOLEAN DEFAULT FALSE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS descontinuado BOOLEAN DEFAULT FALSE;
      CREATE TABLE IF NOT EXISTS pricing_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        imposto_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
        taxa_cartao_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
        frete_por_100kg NUMERIC(10,2) NOT NULL DEFAULT 4,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS frete_por_100kg NUMERIC(10,2) NOT NULL DEFAULT 4;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS cep TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS logradouro TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS numero_end TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS complemento TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS bairro TEXT;
    `});
  } catch {
    // rpc não existe — colunas devem ser adicionadas manualmente via SQL Editor
  }
}

async function saveBudgetFields(id: string, patch: {
  status?: string; tabela_preco?: number; frete?: number;
  percentual_imposto?: number; forma_pagamento?: string; parcelas_cartao?: number; desconto_pix_percentual?: number; desconto_pix_inclui_frete?: boolean; observacoes?: string;
  subtotal?: number; total_final?: number; endereco_entrega?: string | null;
  entrega_cep?: string | null; entrega_logradouro?: string | null; entrega_numero?: string | null;
  entrega_complemento?: string | null; entrega_bairro?: string | null; entrega_cidade?: string | null; entrega_estado?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("budgets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

function calculatePaymentDiscount(
  subtotal: number,
  frete: number,
  formaPagamento: FormaPagamento,
  descontoPixPercentual: number,
  descontoPixIncluiFrete = false
): number {
  if (formaPagamento !== "avista_pix") return 0;
  const percent = Math.min(parseDecimalInput(descontoPixPercentual), 3);
  const baseDesconto = subtotal + (descontoPixIncluiFrete ? frete : 0);
  return round2(baseDesconto * (percent / 100));
}

function calculateBudgetTotal(subtotal: number, frete: number, formaPagamento: FormaPagamento, descontoPixPercentual: number, descontoPixIncluiFrete = false): number {
  const discount = calculatePaymentDiscount(subtotal, frete, formaPagamento, descontoPixPercentual, descontoPixIncluiFrete);
  return round2(subtotal + frete - discount);
}

async function recalcBudgetTotals(budget: Budget): Promise<void> {
  const subtotal = budget.items.reduce((s, i) => s + i.subtotal, 0);
  const totalFinal = calculateBudgetTotal(subtotal, budget.frete, budget.formaPagamento, budget.descontoPixPercentual, budget.descontoPixIncluiFrete);
  await saveBudgetFields(budget.id, { subtotal: round2(subtotal), total_final: round2(totalFinal) });
}

async function addBudgetItem(budgetId: string, item: {
  productId: string; product: Product;
  areaM2: number; caixas: number; precoM2: number; subtotal: number;
}): Promise<BudgetItem> {
  const subtotal = round2(item.subtotal);
  const { data, error } = await supabase
    .from("budget_items")
    .insert({
      budget_id: budgetId,
      product_id: item.productId,
      area_m2: item.areaM2,
      caixas: item.caixas,
      preco_m2: item.precoM2,
      subtotal,
    })
    .select("*")
    .single();
  if (error) throw error;

  return {
    id: data.id,
    productId: data.product_id,
    product: item.product,
    areaM2: parseFloat(data.area_m2),
    caixas: data.caixas,
    precoM2: parseFloat(data.preco_m2),
    subtotal: parseFloat(data.subtotal),
    observacao: data.observacao || "",
  };
}

async function updateBudgetItem(id: string, areaM2: number, caixas: number, precoM2: number): Promise<void> {
  const { error } = await supabase
    .from("budget_items")
    .update({ area_m2: areaM2, caixas, subtotal: round2(areaM2 * precoM2) })
    .eq("id", id);
  if (error) throw error;
}

async function deleteBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.from("budget_items").delete().eq("id", id);
  if (error) throw error;
}

async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
}

async function duplicateBudget(original: Budget, tecnico: string): Promise<Budget> {
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      customer_id: original.customerId,
      status: "rascunho",
      tabela_preco: original.tabelaPreco,
      frete: original.frete,
      percentual_imposto: 0,
      forma_pagamento: original.formaPagamento,
      parcelas_cartao: original.parcelasCartao,
      desconto_pix_percentual: original.descontoPixPercentual,
      desconto_pix_inclui_frete: original.descontoPixIncluiFrete,
      observacoes: original.observacoes,
      tecnico,
      endereco_entrega: original.enderecoEntrega || null,
      entrega_cep: original.entregaCep || null,
      entrega_logradouro: original.entregaLogradouro || null,
      entrega_numero: original.entregaNumero || null,
      entrega_complemento: original.entregaComplemento || null,
      entrega_bairro: original.entregaBairro || null,
      entrega_cidade: original.entregaCidade || null,
      entrega_estado: original.entregaEstado || null,
      subtotal: original.subtotal,
      total_final: original.totalFinal,
    })
    .select()
    .single();
  if (error) throw error;
  const newBudget = mapBudget(data, []);

  if (original.items.length > 0) {
    const itemRows = original.items.map((i) => ({
      budget_id: newBudget.id,
      product_id: i.productId,
      area_m2: i.areaM2,
      caixas: i.caixas,
      preco_m2: i.precoM2,
      subtotal: i.subtotal,
      observacao: i.observacao,
    }));
    const { error: ie } = await supabase.from("budget_items").insert(itemRows);
    if (ie) throw ie;
  }
  return newBudget;
}

// ── Helpers ───────────────────────────────────────────────────────

function round2(n: number): number { return Math.round(n * 100) / 100; }

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtKg(v: number): string {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

function calculateItemWeightKg(item: BudgetItem): number {
  const caixas = Number.isFinite(item.caixas) ? item.caixas : 0;
  const pesoPorCaixa = Number.isFinite(item.product?.pesoBrutoCx) ? item.product.pesoBrutoCx : 0;
  return round2(caixas * pesoPorCaixa);
}

function calculateBudgetWeightKg(items: BudgetItem[]): number {
  return round2(items.reduce((sum, item) => sum + calculateItemWeightKg(item), 0));
}

function calculateFreightByWeight(items: BudgetItem[], fretePor100Kg: number | string | null | undefined): number {
  return round2((calculateBudgetWeightKg(items) / 100) * parseDecimalInput(fretePor100Kg));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABELS: Record<BudgetStatus, string> = {
  rascunho: "Rascunho",
  enviado_fabrica: "Enviado à Fábrica",
  enviado_cliente: "Enviado ao Cliente",
  fechado: "Fechado",
  cancelado: "Cancelado",
};

const STATUS_PILL: Record<BudgetStatus, string> = {
  rascunho: "bg-amber-100 text-amber-800 border-amber-200",
  enviado_fabrica: "bg-blue-100 text-blue-800 border-blue-200",
  enviado_cliente: "bg-violet-100 text-violet-800 border-violet-200",
  fechado: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};

const LOCAL_USO: Record<number, string> = {
  1: "Parede/Piso", 2: "Parede", 3: "Piso Interno", 4: "Piso Externo",
};

function priceKey(t: 1 | 2 | 3 | 4): keyof Product {
  return `preco${t}` as keyof Product;
}

function parseDecimalInput(value: unknown): number {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function calculateFinalPrice(
  precoBase: number | null | undefined,
  impostoPercentual: number | string | null | undefined,
  taxaCartaoPercentual: number | string | null | undefined
): number {
  const base = parseDecimalInput(precoBase);
  const imposto = parseDecimalInput(impostoPercentual);
  const taxa = parseDecimalInput(taxaCartaoPercentual);
  return round2(base * (1 + (imposto + taxa) / 100));
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}
      className="border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
  );
}

function StatusPill({ status }: { status: BudgetStatus }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_PILL[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Setup Screen ─────────────────────────────────────────────────

function SetupScreen({ onVerify }: { onVerify: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-serif)" }}>
            Configuração inicial
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Execute o SQL abaixo no <strong>SQL Editor</strong> do Supabase para criar as tabelas do sistema.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-muted-foreground font-mono">Supabase SQL Editor</span>
            <button onClick={copy}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              {copied ? "Copiado!" : "Copiar SQL"}
            </button>
          </div>
          <pre className="text-xs font-mono p-4 overflow-x-auto text-muted-foreground leading-relaxed max-h-64 overflow-y-auto">
            {SETUP_SQL}
          </pre>
        </div>

        <div className="bg-primary/6 border border-primary/20 rounded-2xl p-4 mb-6 text-sm text-primary/80 leading-relaxed">
          <strong className="text-primary">Como executar:</strong> Acesse seu projeto no{" "}
          <strong>supabase.com</strong> → clique em <strong>SQL Editor</strong> no menu lateral →
          cole o SQL acima → clique em <strong>Run</strong>.
        </div>

        <button onClick={onVerify}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <Check size={16} /> Já executei o SQL — verificar conexão
        </button>
      </div>
    </div>
  );
}

// ── Product Search Modal ──────────────────────────────────────────

function ProductModal({
  allProducts, tabelaPreco, pricingSettings, onSelect, onClose,
}: {
  allProducts: Product[];
  tabelaPreco: 1 | 2 | 3 | 4;
  pricingSettings?: PricingSettings;
  onSelect: (product: Product, areaM2: number, tabelaPreco: 1 | 2 | 3 | 4) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [formato, setFormato] = useState("");
  const [localUso, setLocalUso] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [areaInput, setAreaInput] = useState("");
  const [selectedTabela, setSelectedTabela] = useState<1 | 2 | 3 | 4>(tabelaPreco);
  const pk = priceKey(selectedTabela);
  const safeProducts = Array.isArray(allProducts) ? allProducts : [];
  const effectivePricingSettings = pricingSettings || { impostoPercentual: 0, taxaCartaoPercentual: 0, fretePor100Kg: 4 };

  const results = safeProducts.filter((p) => {
    if (p.descontinuado) return false;
    const txt = q.toLowerCase();
    const matchQ = !q || [p.linha, p.colecao, p.cor, p.formato, p.referencia, p.superficie]
      .some((f) => f?.toLowerCase().includes(txt));
    return matchQ &&
      (!superficie || p.superficie === superficie) &&
      (!formato || p.formato === formato) &&
      (!localUso || String(p.localUso) === localUso);
  }).slice(0, 100);

  function confirmAdd() {
    if (!selected) return;
    const area = parseFloat(areaInput.replace(",", "."));
    if (!area || area <= 0) { toast.error("Informe a área em m²"); return; }
    onSelect(selected, area, selectedTabela);
  }

  const superficies = [...new Set(safeProducts.map((p) => p.superficie).filter(Boolean))].sort();
  const formatos = [...new Set(safeProducts.map((p) => p.formato).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  if (selected) {
    const priceBase = selected[pk] as number | null;
    const price = priceBase != null ? calculateFinalPrice(priceBase, effectivePricingSettings.impostoPercentual, effectivePricingSettings.taxaCartaoPercentual) : null;
    const area = parseFloat(areaInput.replace(",", ".")) || 0;
    const caixas = selected.m2PorCaixa > 0 ? Math.ceil(area / selected.m2PorCaixa) : 0;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 border border-border">
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft size={12} /> Voltar à busca
          </button>
          <div className="mb-4">
            <h3 className="font-semibold text-base">
              {selected.linha}
              {selected.cor && selected.cor !== "única" && selected.cor !== "-" ? ` · ${selected.cor}` : ""}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{selected.colecao} · {selected.superficie}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{selected.formato} · Ref: {selected.referencia}</p>
            <p className="text-xs text-muted-foreground">{LOCAL_USO[selected.localUso]} · {selected.m2PorCaixa} m²/cx · {selected.espessuraMm}mm</p>
          </div>
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Tabela de preço deste produto</p>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as const).map((t) => (
                <button key={t} type="button" onClick={() => setSelectedTabela(t)}
                  className={`rounded-lg py-1.5 text-xs font-semibold border transition-colors ${selectedTabela === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                  Tabela {t}
                </button>
              ))}
            </div>
          </div>
          {price ? (
            <div className="bg-primary/8 rounded-xl p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tabela {selectedTabela}</span>
              <span className="text-xl font-semibold text-primary font-mono">
                {fmtBRL(price)}<span className="text-sm font-normal text-muted-foreground">/m²</span>
              </span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle size={14} /> Preço não disponível para tabela {selectedTabela}
            </div>
          )}
          <label className="block text-xs font-medium text-muted-foreground mb-1">Área necessária (m²)</label>
          <input type="text" value={areaInput} onChange={(e) => setAreaInput(e.target.value)}
            placeholder="Ex: 45,50" autoFocus
            onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 mb-3 font-mono" />
          {area > 0 && selected.m2PorCaixa > 0 && (
            <div className="bg-muted rounded-xl p-3 mb-4 text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Caixas necessárias</span>
                <span className="font-mono font-medium text-foreground">{caixas} cx</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>m² real (arredondado)</span>
                <span className="font-mono text-foreground">{(caixas * selected.m2PorCaixa).toFixed(2)} m²</span>
              </div>
              {price && (
                <div className="flex justify-between pt-1.5 border-t border-border font-medium">
                  <span>Subtotal estimado</span>
                  <span className="font-mono text-primary">{fmtBRL(area * price)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm hover:bg-muted transition-colors">Cancelar</button>
            <button onClick={confirmAdd} disabled={!price}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40">
              Adicionar ao Orçamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Buscar Produto</h3>
            <p className="text-xs text-muted-foreground">Escolha a tabela no nível do produto</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="px-5 py-3 border-b border-border space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Coleção, cor, formato, referência..."
              className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
          </div>
          <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 bg-muted/30">
            <span className="text-xs text-muted-foreground mr-1">Tabela do produto:</span>
            {([1, 2, 3, 4] as const).map((t) => (
              <button key={t} type="button" onClick={() => setSelectedTabela(t)}
                className={`w-7 h-6 rounded text-xs font-semibold transition-all ${selectedTabela === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={superficie} onChange={(e) => setSuperficie(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-input-background focus:outline-none">
              <option value="">Todas as superfícies</option>
              {superficies.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={formato} onChange={(e) => setFormato(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-input-background focus:outline-none">
              <option value="">Todos os formatos</option>
              {formatos.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={localUso} onChange={(e) => setLocalUso(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-input-background focus:outline-none">
              <option value="">Todos os locais</option>
              <option value="2">Parede</option>
              <option value="3">Piso Interno</option>
              <option value="4">Piso Externo</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Package size={32} className="mx-auto mb-2 opacity-20" />
              {q || superficie || formato || localUso ? "Nenhum produto encontrado" : "Digite para buscar"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((p) => {
                const price = p[pk] as number | null;
                const finalPrice = price != null ? calculateFinalPrice(price, effectivePricingSettings.impostoPercentual, effectivePricingSettings.taxaCartaoPercentual) : null;
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className="w-full text-left px-5 py-3 hover:bg-muted/50 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {p.linha}
                          {p.cor && p.cor !== "única" && p.cor !== "-"
                            ? <span className="text-muted-foreground font-normal"> · {p.cor}</span> : null}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.formato} · {p.superficie} · {LOCAL_USO[p.localUso]}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.referencia} · {p.colecao}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {finalPrice != null
                          ? <p className="text-sm font-semibold text-primary font-mono">{fmtBRL(finalPrice)}/m²</p>
                          : <p className="text-xs text-amber-600">Consultar</p>}
                        <p className="text-xs text-muted-foreground">{p.m2PorCaixa} m²/cx</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Budget Editor ─────────────────────────────────────────────────

function BudgetEditor({
  budget: initBudget, allProducts, pricingSettings, customer, onBack, onGoHome, onBudgetChange, onOpenBudget,
}: {
  budget: Budget; allProducts: Product[]; pricingSettings: PricingSettings; customer: Customer;
  onBack: () => void; onGoHome: () => void; onBudgetChange: (b: Budget) => void;
  onOpenBudget?: (b: Budget) => void;
}) {
  const [budget, setBudget] = useState<Budget>(initBudget);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [frete, setFrete] = useState(String(initBudget.frete || "0"));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(initBudget.formaPagamento || "avista");
  const [parcelasCartao, setParcelasCartao] = useState(String(initBudget.parcelasCartao || 1));
  const [descontoPix, setDescontoPix] = useState(String(initBudget.descontoPixPercentual || 0));
  const [descontoPixIncluiFrete, setDescontoPixIncluiFrete] = useState(Boolean(initBudget.descontoPixIncluiFrete));
  const [obs, setObs] = useState(initBudget.observacoes || "");
  const [editFinancials, setEditFinancials] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAreaInput, setEditAreaInput] = useState("");
  const [editTabela, setEditTabela] = useState<1 | 2 | 3 | 4>(initBudget.tabelaPreco);
  const [showSaveDialog, setShowSaveDialog] = useState(false); // unused but kept for type safety
  const [isDirty, setIsDirty] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [dupTecnico, setDupTecnico] = useState("");
  const [dupTecnicoCustom, setDupTecnicoCustom] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  // Delivery address
  const customerAddr = buildFullAddress(customer);
  const hasCustomerAddress = Boolean(customerAddr);
  const savedDelivery = {
    cep: initBudget.entregaCep || "",
    logradouro: initBudget.entregaLogradouro || "",
    numero: initBudget.entregaNumero || "",
    complemento: initBudget.entregaComplemento || "",
    bairro: initBudget.entregaBairro || "",
    cidade: initBudget.entregaCidade || "",
    estado: initBudget.entregaEstado || "",
  };
  const savedDeliveryAddress = buildFullAddress(savedDelivery);
  const customerDelivery = {
    cep: formatCEP(customer.cep || ""),
    logradouro: customer.logradouro || "",
    numero: customer.numero || "",
    complemento: customer.complemento || "",
    bairro: customer.bairro || "",
    cidade: customer.cidade || "",
    estado: customer.estado || "",
  };
  const initialDelivery = savedDeliveryAddress ? savedDelivery : hasCustomerAddress ? customerDelivery : savedDelivery;
  const [deliveryMode, setDeliveryMode] = useState<"customer" | "different" | "">(savedDeliveryAddress ? "different" : hasCustomerAddress ? "customer" : "");
  const [entrega, setEntrega] = useState(initialDelivery);
  const [consultandoEntregaCep, setConsultandoEntregaCep] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const isLocked = budget.status === "enviado_fabrica" || budget.status === "fechado";
  const totalWeightKg = calculateBudgetWeightKg(budget.items);
  const suggestedFreightByWeight = calculateFreightByWeight(budget.items, pricingSettings.fretePor100Kg);

  function formatFreightInput(value: number): string {
    return round2(value).toFixed(2).replace(".", ",");
  }

  function openFinancialsEditor() {
    const freightValue = budget.frete > 0 ? budget.frete : suggestedFreightByWeight;
    setFrete(formatFreightInput(freightValue));
    setFormaPagamento(budget.formaPagamento);
    setParcelasCartao(String(budget.parcelasCartao));
    setDescontoPix(String(budget.descontoPixPercentual));
    setDescontoPixIncluiFrete(Boolean(budget.descontoPixIncluiFrete));
    setObs(budget.observacoes || "");
    setEditFinancials(true);
  }

  async function handleDuplicate() {
    const tecnico = dupTecnico === "__custom__" ? dupTecnicoCustom.trim() : dupTecnico;
    if (!tecnico) { toast.error("Selecione o técnico responsável"); return; }
    setDuplicating(true);
    try {
      const newBudget = await duplicateBudget(budget, tecnico);
      const full = await getBudgetWithItems(newBudget.id);
      setShowDuplicateModal(false);
      toast.success(`Orçamento #${full.numero} criado como cópia!`);
      onBudgetChange(full);
      // Navigate to new budget
      onBack();
      setTimeout(() => onOpenBudget?.(full), 50);
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setDuplicating(false); }
  }
  const canSaveDraft = !isLocked && (budget.status === "rascunho" || isDirty);

  function markDirty() { setIsDirty(true); }

  function updateLocal(patch: Partial<Budget>) {
    const updated = { ...budget, ...patch };
    const subtotal = updated.items.reduce((s, i) => s + i.subtotal, 0);
    const totalFinal = calculateBudgetTotal(subtotal, updated.frete, updated.formaPagamento, updated.descontoPixPercentual, updated.descontoPixIncluiFrete);
    const final = { ...updated, subtotal: round2(subtotal), totalFinal: round2(totalFinal) };
    if (Object.prototype.hasOwnProperty.call(patch, "frete")) {
      setFrete(formatFreightInput(final.frete));
    }
    setBudget(final);
    onBudgetChange(final);
    return final;
  }

  async function persistTotals(b: Budget) {
    await saveBudgetFields(b.id, {
      subtotal: b.subtotal,
      total_final: b.totalFinal,
      frete: b.frete,
      percentual_imposto: 0,
      forma_pagamento: b.formaPagamento,
      parcelas_cartao: b.parcelasCartao,
      desconto_pix_percentual: b.descontoPixPercentual,
      desconto_pix_inclui_frete: b.descontoPixIncluiFrete,
      observacoes: b.observacoes,
      status: b.status,
      tabela_preco: b.tabelaPreco,
    });
  }

  async function handleAddProduct(product: Product, areaM2: number, itemTabelaPreco: 1 | 2 | 3 | 4) {
    const already = budget.items.find((i) => i.productId === product.id);
    if (already) {
      setShowModal(false);
      toast.warning(`"${product.linha}" já está no orçamento — edite a metragem diretamente na tabela.`);
      return;
    }
    const precoBase = product[priceKey(itemTabelaPreco)] as number | null;
    if (precoBase == null || !Number.isFinite(Number(precoBase)) || Number(precoBase) <= 0) {
      toast.error(`Preço não disponível para a tabela ${itemTabelaPreco}.`);
      return;
    }
    if (!product.m2PorCaixa || product.m2PorCaixa <= 0) {
      toast.error("Produto sem m²/caixa válido. Corrija o cadastro antes de adicionar.");
      return;
    }
    const precoM2 = calculateFinalPrice(precoBase, pricingSettings.impostoPercentual, pricingSettings.taxaCartaoPercentual);
    if (!Number.isFinite(precoM2) || precoM2 <= 0) {
      toast.error("Não foi possível calcular o preço final do produto.");
      return;
    }
    const caixas = Math.ceil(areaM2 / product.m2PorCaixa);
    setSaving(true);
    try {
      const newItem = await addBudgetItem(budget.id, {
        productId: product.id, product, areaM2, caixas, precoM2, subtotal: round2(areaM2 * precoM2),
      });
      const nextItems = [...budget.items, newItem];
      const b = updateLocal({ items: nextItems, frete: calculateFreightByWeight(nextItems, pricingSettings.fretePor100Kg) });
      await persistTotals(b);
      markDirty();
      setShowModal(false);
      toast.success("Produto adicionado!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setSaving(false); }
  }

  async function handleRemoveItem(itemId: string) {
    setRemovingId(itemId);
    try {
      await deleteBudgetItem(itemId);
      const nextItems = budget.items.filter((i) => i.id !== itemId);
      const b = updateLocal({ items: nextItems, frete: calculateFreightByWeight(nextItems, pricingSettings.fretePor100Kg) });
      await persistTotals(b);
      markDirty();
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setRemovingId(null); }
  }

  function inferItemTabela(item: BudgetItem): 1 | 2 | 3 | 4 {
    for (const t of [1, 2, 3, 4] as const) {
      const precoBase = item.product[priceKey(t)] as number | null;
      if (precoBase == null) continue;
      const precoTabela = calculateFinalPrice(precoBase, pricingSettings.impostoPercentual, pricingSettings.taxaCartaoPercentual);
      if (Math.abs(precoTabela - item.precoM2) < 0.01) return t;
    }
    return budget.tabelaPreco;
  }

  function startEditItem(item: BudgetItem) {
    setEditingItemId(item.id);
    setEditAreaInput(String(item.areaM2).replace(".", ","));
    setEditTabela(inferItemTabela(item));
  }

  async function confirmEditItem(itemId: string) {
    const item = budget.items.find((i) => i.id === itemId);
    if (!item) return;
    const newArea = parseFloat(editAreaInput.replace(",", "."));
    if (!newArea || newArea <= 0) { toast.error("Área inválida"); return; }
    const precoBase = item.product[priceKey(editTabela)] as number | null;
    if (precoBase == null || !Number.isFinite(Number(precoBase)) || Number(precoBase) <= 0) {
      toast.error(`Preço não disponível para a tabela ${editTabela}.`);
      return;
    }
    const newPrecoM2 = calculateFinalPrice(precoBase, pricingSettings.impostoPercentual, pricingSettings.taxaCartaoPercentual);
    if (!Number.isFinite(newPrecoM2) || newPrecoM2 <= 0) {
      toast.error("Não foi possível calcular o preço final do produto.");
      return;
    }
    const caixas = item.product.m2PorCaixa > 0 ? Math.ceil(newArea / item.product.m2PorCaixa) : item.caixas;
    setSaving(true);
    try {
      await updateBudgetItem(itemId, newArea, caixas, newPrecoM2);
      const updatedItem = { ...item, areaM2: newArea, caixas, precoM2: newPrecoM2, subtotal: round2(newArea * newPrecoM2) };
      const nextItems = budget.items.map((i) => i.id === itemId ? updatedItem : i);
      const b = updateLocal({ items: nextItems, frete: calculateFreightByWeight(nextItems, pricingSettings.fretePor100Kg) });
      await persistTotals(b);
      markDirty();
      setEditingItemId(null);
      toast.success("Metragem atualizada!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setSaving(false); }
  }

  function handlePixDiscountChange(value: string) {
    if (value.trim() === "") {
      setDescontoPix("");
      return;
    }

    const parsed = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) return;
    if (parsed > 3) {
      toast.error("O desconto máximo permitido para PIX é de 3%.");
      return;
    }

    setDescontoPix(value);
  }

  async function handleSaveFinancials() {
    const fr = parseFloat(frete.replace(",", ".")) || 0;
    const forma = formaPagamento;
    const parcelas = forma === "cartao" ? Math.min(Math.max(parseInt(parcelasCartao) || 1, 1), 6) : 1;
    const desconto = forma === "avista_pix" ? Math.min(parseDecimalInput(descontoPix), 3) : 0;
    const incluiFrete = forma === "avista_pix" ? descontoPixIncluiFrete : false;
    setSaving(true);
    try {
      const b = updateLocal({ frete: fr, percentualImposto: 0, formaPagamento: forma, parcelasCartao: parcelas, descontoPixPercentual: desconto, descontoPixIncluiFrete: incluiFrete, observacoes: obs });
      await persistTotals(b);
      markDirty();
      setEditFinancials(false);
      toast.success("Orçamento salvo!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setSaving(false); }
  }


  async function handleDeliveryCepChange(value: string) {
    const cep = formatCEP(value);
    setEntrega((f) => ({ ...f, cep }));
    markDirty();

    if (!isValidCEP(cep)) return;

    setConsultandoEntregaCep(true);
    try {
      const address = await fetchAddressByCEP(cep);
      if (!address) {
        toast.error("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }

      setEntrega((f) => ({
        ...f,
        cep,
        logradouro: address.logradouro,
        bairro: address.bairro,
        cidade: address.localidade,
        estado: address.uf,
      }));
    } catch {
      toast.error("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setConsultandoEntregaCep(false);
    }
  }

  function useCustomerAddress() {
    if (!hasCustomerAddress) {
      toast.error("Cliente sem endereço cadastrado. Preencha o endereço de entrega manualmente.");
      setDeliveryMode("different");
      return;
    }
    setEntrega(customerDelivery);
    setDeliveryMode("customer");
    setShowDeliveryModal(false);
    markDirty();
  }

  function useDifferentDeliveryAddress() {
    setDeliveryMode("different");
    setShowDeliveryModal(true);
    markDirty();
  }

  function saveDifferentDeliveryAddress() {
    setDeliveryMode("different");
    setShowDeliveryModal(false);
    markDirty();
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const enderecoEntrega = buildFullAddress(entrega);
      await persistTotals(budget);
      await saveBudgetFields(budget.id, {
        endereco_entrega: enderecoEntrega,
        entrega_cep: entrega.cep || null,
        entrega_logradouro: entrega.logradouro || null,
        entrega_numero: entrega.numero || null,
        entrega_complemento: entrega.complemento || null,
        entrega_bairro: entrega.bairro || null,
        entrega_cidade: entrega.cidade || null,
        entrega_estado: entrega.estado || null,
      });
      updateLocal({
        enderecoEntrega,
        entregaCep: entrega.cep,
        entregaLogradouro: entrega.logradouro,
        entregaNumero: entrega.numero,
        entregaComplemento: entrega.complemento,
        entregaBairro: entrega.bairro,
        entregaCidade: entrega.cidade,
        entregaEstado: entrega.estado,
      });
      setIsDirty(false);
      toast.success("Rascunho salvo!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setSaving(false); }
  }

  async function changeStatus(status: BudgetStatus) {
    setSaving(true);
    try {
      await saveBudgetFields(budget.id, { status });
      updateLocal({ status });
      setIsDirty(false);
      toast.success(`Status: ${STATUS_LABELS[status]}`);
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setSaving(false); }
  }

  async function printBudget() {
    const fmtBRLStr = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // Convert logo to base64 using the Vite-resolved URL
    let logoSrc = "";
    try {
      const resp = await fetch(pavimentLogoPrint);
      const blob = await resp.blob();
      logoSrc = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* logo omitido se falhar */ }
    const dateStr = new Date(budget.createdAt).toLocaleDateString("pt-BR");

    const deliveryAddressForPrint = budget.enderecoEntrega || (deliveryMode === "customer" ? customerAddr : buildFullAddress(entrega));

    const rows = budget.items.map((item) => {
      const p = item.product;
      const cor = p?.cor && p.cor !== "única" && p.cor !== "-" ? p.cor : "";
      return `<tr>
        <td>${p?.referencia ?? ""}</td>
        <td>${p?.linha ?? ""}</td>
        <td>${p?.colecao ?? ""}${cor ? " / " + cor : ""}</td>
        <td>${p?.formato ?? ""}</td>
        <td style="text-align:right">${fmtBRLStr(item.precoM2)}</td>
        <td style="text-align:right">${item.areaM2.toFixed(2)}</td>
        <td style="text-align:right">${p?.m2PorCaixa ?? ""}</td>
        <td style="text-align:right">${fmtKg(calculateItemWeightKg(item))}</td>
        <td style="text-align:right">${fmtBRLStr(item.subtotal)}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Orçamento #${budget.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px 28px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .logo img { height: 60px; }
  .logo-text { font-size: 22px; font-weight: 900; letter-spacing: 4px; }
  .logo-sub { font-size: 9px; letter-spacing: 2px; color: #555; }
  .box-title { border: 1.5px solid #111; padding: 6px 12px; text-align: center; }
  .box-title h2 { font-size: 12px; font-weight: 700; }
  .box-title p { font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .info-table td { border: 1px solid #333; padding: 4px 8px; }
  .info-table td:first-child { font-weight: 700; width: 38%; background: #f0f0f0; }
  .section-header { background: #222; color: #fff; font-weight: 700; font-size: 11px; padding: 4px 8px; margin-bottom: 0; }
  .prod-table th { border: 1px solid #333; padding: 5px 7px; background: #e8e8e8; font-weight: 700; text-align: left; white-space: nowrap; }
  .prod-table td { border: 1px solid #333; padding: 5px 7px; vertical-align: top; }
  .prod-table th:nth-child(5), .prod-table th:nth-child(6), .prod-table th:nth-child(7), .prod-table th:nth-child(8), .prod-table th:nth-child(9) { text-align: right; }
  .total-row td { border: 1px solid #333; padding: 4px 8px; }
  .total-row td:first-child { font-weight: 700; text-align: right; }
  .total-row td:last-child { font-weight: 700; text-align: right; }
  .obs-box { border: 1px solid #333; padding: 8px; margin-top: 14px; }
  .obs-box .obs-title { font-weight: 700; margin-bottom: 4px; }
  .totals-box { float: right; border-collapse: collapse; margin-top: 4px; }
  .totals-box td { border: 1px solid #333; padding: 5px 12px; }
  .totals-box td:first-child { background: #e8e8e8; font-weight: 700; }
  .totals-box td:last-child { text-align: right; font-weight: 700; min-width: 100px; }
  .clearfix::after { content: ""; display: table; clear: both; }
  @media print { body { padding: 12px 16px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    ${logoSrc ? `<img src="${logoSrc}" style="height:70px;width:auto;object-fit:contain;" />` : "<strong style='font-size:20px;letter-spacing:4px'>PAVIMENT</strong>"}
  </div>
  <div class="box-title">
    <h2>SALA TÉCNICA - VILLAGRES</h2>
    <p>ORÇAMENTO N&nbsp; <strong>#${budget.numero}</strong>&nbsp;&nbsp;&nbsp; ${dateStr}</p>
  </div>
</div>

<table class="info-table" style="margin-bottom:16px">
  <tr><td>Nome do Cliente</td><td>${customer.nome}</td></tr>
  <tr><td>CPF / RG</td><td>${customer.cpf || ""}</td></tr>
  <tr><td>Telefone</td><td>${customer.telefone || ""}</td></tr>
  <tr><td>Cidade - CEP</td><td>${customer.cidade || ""}${customer.estado ? " / " + customer.estado : ""}</td></tr>
  <tr><td>E-mail</td><td>${customer.email || ""}</td></tr>
  ${budget.tecnico ? `<tr><td>Técnico Responsável</td><td>${budget.tecnico}</td></tr>` : ""}
  ${deliveryAddressForPrint ? `<tr><td>Endereço de Entrega</td><td>${deliveryAddressForPrint}</td></tr>` : ""}
</table>

<div class="section-header">PRODUTOS / ESPECIFICAÇÕES</div>
<table class="prod-table">
  <thead>
    <tr>
      <th>Ref</th><th>Linha</th><th>Cor</th><th>Formato</th>
      <th>Valor m²</th><th>Qnt m²</th><th>M²/cx</th><th>Peso total</th><th>Valor R$</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="clearfix">
  <table class="totals-box">
    <tr><td>Forma de Pagamento</td><td>${budget.formaPagamento === "cartao" ? `Cartão em ${budget.parcelasCartao}x` : budget.formaPagamento === "avista_pix" ? "À vista - PIX" : "À vista"}</td></tr>
    <tr><td>Peso total da carga</td><td>${fmtKg(calculateBudgetWeightKg(budget.items))}</td></tr>
    <tr><td>Cálculo do frete</td><td>${fmtBRL(pricingSettings.fretePor100Kg)} / 100 kg</td></tr>
    ${budget.frete > 0 ? `<tr><td>Frete</td><td>${fmtBRLStr(budget.frete)}</td></tr>` : ""}
    ${calculatePaymentDiscount(budget.subtotal, budget.frete, budget.formaPagamento, budget.descontoPixPercentual, budget.descontoPixIncluiFrete) > 0 ? `<tr><td>Desconto PIX (${budget.descontoPixPercentual}%${budget.descontoPixIncluiFrete ? " com frete" : ""})</td><td>- ${fmtBRLStr(calculatePaymentDiscount(budget.subtotal, budget.frete, budget.formaPagamento, budget.descontoPixPercentual, budget.descontoPixIncluiFrete))}</td></tr>` : ""}
    <tr><td>TOTAL</td><td>${fmtBRLStr(budget.totalFinal)}</td></tr>
  </table>
</div>

${budget.observacoes ? `
<div class="obs-box" style="margin-top:60px">
  <div class="obs-title">OBSERVAÇÕES</div>
  <p>${budget.observacoes}</p>
</div>` : ""}

<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="px-5 py-3 flex items-center gap-3 border-b border-white/10">
          <button onClick={onBack} className="hover:opacity-70 transition-opacity p-1 -ml-1" title="Voltar ao cliente">
            <ArrowLeft size={18} />
          </button>
          <button onClick={onGoHome} className="hover:opacity-70 transition-opacity text-xs opacity-60 hover:opacity-90 border border-white/20 px-2.5 py-1 rounded-lg" title="Tela inicial">
            Início
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-60 truncate">{customer.nome}</p>
            <p className="font-semibold text-sm">Orçamento #{budget.numero}</p>
            {budget.tecnico && <p className="text-xs opacity-50 truncate">Técnico: {budget.tecnico}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={budget.status} />
            {saving && <Spinner size={14} />}
          </div>
        </div>
        <div className="px-5 py-2.5 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs opacity-60">Status:</span>
            <select value={budget.status} onChange={(e) => changeStatus(e.target.value as BudgetStatus)}
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="text-foreground bg-card">{v}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-5">
        {isLocked && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 text-amber-500" />
              <span>
                Este orçamento está <strong>bloqueado para edição</strong>.
                Para editar, altere o status para Rascunho.
              </span>
            </div>
            <button
              onClick={() => { setDupTecnico(""); setDupTecnicoCustom(""); setShowDuplicateModal(true); }}
              className="flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-amber-700 transition-colors shrink-0">
              <Copy size={13} /> Copiar Orçamento
            </button>
          </div>
        )}
        {/* Products table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Produtos do Orçamento</h2>
            {!isLocked && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                <Plus size={13} /> Adicionar Produto
              </button>
            )}
          </div>

          {budget.items.length === 0 ? (
            <div className="py-14 text-center">
              <Package size={36} className="mx-auto mb-3 text-muted-foreground opacity-25" />
              <p className="text-sm text-muted-foreground">Nenhum produto adicionado</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-primary text-xs hover:underline">
                + Adicionar primeiro produto
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground bg-muted/30 border-b border-border">
                    <th className="text-left px-5 py-2.5 font-medium">Produto</th>
                    <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Formato</th>
                    <th className="text-right px-3 py-2.5 font-medium">m²</th>
                    <th className="text-right px-3 py-2.5 font-medium">Cx</th>
                    <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">R$/m²</th>
                    <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">Peso</th>
                    <th className="text-right px-3 py-2.5 font-medium">Subtotal</th>
                    <th className="px-3 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {budget.items.map((item) => {
                    const isEditing = editingItemId === item.id;
                    const previewArea = parseFloat(editAreaInput.replace(",", ".")) || 0;
                    const previewCx = item.product.m2PorCaixa > 0 ? Math.ceil(previewArea / item.product.m2PorCaixa) : 0;
                    const previewWeight = round2(previewCx * (item.product.pesoBrutoCx || 0));
                    const editPrecoBase = item.product[priceKey(editTabela)] as number | null;
                    const editPrecoM2 = editPrecoBase != null ? calculateFinalPrice(editPrecoBase, pricingSettings.impostoPercentual, pricingSettings.taxaCartaoPercentual) : item.precoM2;
                    return (
                      <tr key={item.id} className={`transition-colors ${isEditing ? "bg-primary/4" : "hover:bg-muted/20"}`}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-sm leading-tight">{item.product?.linha}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.product?.cor && item.product.cor !== "única" && item.product.cor !== "-"
                              ? `${item.product.cor} · ` : ""}
                            {item.product?.superficie}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">Ref: {item.product?.referencia}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">{item.product?.formato}</td>
                        <td className="px-3 py-3 text-right">
                          {isEditing ? (
                            <input type="text" value={editAreaInput} onChange={(e) => setEditAreaInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") confirmEditItem(item.id); if (e.key === "Escape") setEditingItemId(null); }}
                              autoFocus
                              className="w-20 border border-primary rounded-lg px-2 py-1 text-sm text-right font-mono bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          ) : (
                            <button onClick={() => !isLocked && startEditItem(item)}
                              className={`font-mono text-sm group flex items-center gap-1 ml-auto transition-colors ${isLocked ? "cursor-default" : "hover:text-primary"}`}
                              title={isLocked ? "Orçamento bloqueado" : "Clique para editar"}>
                              {item.areaM2.toFixed(2)}
                              {!isLocked && <Pencil size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm">
                          {isEditing && previewArea > 0
                            ? <span className="text-primary font-semibold">{previewCx}</span>
                            : item.caixas}
                        </td>
                        <td className="px-3 py-3 text-right text-sm hidden sm:table-cell">
                          {isEditing ? (
                            <div className="space-y-1">
                              <div className="grid grid-cols-4 gap-1">
                                {([1, 2, 3, 4] as const).map((t) => (
                                  <button key={t} type="button" onClick={() => setEditTabela(t)}
                                    className={`rounded px-1.5 py-1 text-[10px] font-semibold border transition-colors ${editTabela === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                                    T{t}
                                  </button>
                                ))}
                              </div>
                              <p className="font-mono text-primary font-semibold">{fmtBRL(editPrecoM2)}</p>
                            </div>
                          ) : <span className="font-mono">{fmtBRL(item.precoM2)}</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm hidden lg:table-cell">
                          {isEditing && previewArea > 0 ? fmtKg(previewWeight) : fmtKg(calculateItemWeightKg(item))}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-sm">
                          {isEditing && previewArea > 0
                            ? <span className="text-primary">{fmtBRL(previewArea * editPrecoM2)}</span>
                            : fmtBRL(item.subtotal)}
                        </td>
                        <td className="px-3 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => confirmEditItem(item.id)} className="text-primary hover:opacity-70" title="Confirmar">
                                <Check size={14} />
                              </button>
                              <button onClick={() => setEditingItemId(null)} className="text-muted-foreground hover:text-foreground" title="Cancelar">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {!isLocked && <button onClick={() => startEditItem(item)} className="text-muted-foreground hover:text-primary transition-colors" title="Editar metragem">
                                <Pencil size={13} />
                              </button>}
                              <button onClick={() => handleRemoveItem(item.id)} disabled={removingId === item.id || isLocked}
                                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40" title="Remover">
                                {removingId === item.id ? <Spinner size={13} /> : <Trash2 size={13} />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Financials + Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Condições do Orçamento</h3>
              {!editFinancials && !isLocked && (
                <button onClick={openFinancialsEditor}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Pencil size={12} /> Editar
                </button>
              )}
            </div>

            {editFinancials ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Observações</label>
                  <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
                    placeholder="Condições de pagamento, prazo de entrega..."
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none" />
                </div>
                <div>
                  <div>
                    <div className="mb-1">
                      <label className="text-xs font-medium text-muted-foreground">Frete (R$)</label>
                    </div>
                    <input type="text" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="0,00"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Sugestão: {fmtKg(totalWeightKg)} × {fmtBRL(pricingSettings.fretePor100Kg)} / 100 kg = {fmtBRL(suggestedFreightByWeight)}.
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Forma de pagamento</label>
                    <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25">
                      <option value="avista">À vista</option>
                      <option value="avista_pix">À vista - PIX</option>
                      <option value="cartao">Cartão de crédito</option>
                    </select>
                  </div>
                  {formaPagamento === "cartao" ? (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Parcelas no cartão</label>
                      <select value={parcelasCartao} onChange={(e) => setParcelasCartao(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25">
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                  ) : formaPagamento === "avista_pix" ? (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Desconto PIX (%)</label>
                      <input type="text" value={descontoPix} onChange={(e) => handlePixDiscountChange(e.target.value)} placeholder="Até 3"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono" />
                      <p className="text-[11px] text-muted-foreground mt-1">Máximo permitido: 3%</p>
                      <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={descontoPixIncluiFrete}
                          onChange={(e) => setDescontoPixIncluiFrete(e.target.checked)}
                          className="mt-0.5 rounded border-border"
                        />
                        <span>Aplicar desconto também sobre o valor do frete</span>
                      </label>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditFinancials(false); setFrete(String(budget.frete)); setFormaPagamento(budget.formaPagamento); setParcelasCartao(String(budget.parcelasCartao)); setDescontoPix(String(budget.descontoPixPercentual)); setDescontoPixIncluiFrete(Boolean(budget.descontoPixIncluiFrete)); setObs(budget.observacoes || ""); }}
                    className="flex-1 border border-border rounded-xl py-2 text-xs hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={handleSaveFinancials} disabled={saving}
                    className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {saving ? <Spinner size={13} /> : <Check size={13} />} Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Frete</span>
                  <span className="font-mono text-xs">{fmtBRL(budget.frete)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Pagamento</span>
                  <span className="font-mono text-xs">{budget.formaPagamento === "cartao" ? `Cartão ${budget.parcelasCartao}x` : budget.formaPagamento === "avista_pix" ? "À vista PIX" : "À vista"}</span>
                </div>
                {budget.formaPagamento === "avista_pix" && budget.descontoPixPercentual > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Desconto PIX</span>
                    <span className="font-mono text-xs">{budget.descontoPixPercentual}%{budget.descontoPixIncluiFrete ? " com frete" : ""}</span>
                  </div>
                )}
                {budget.observacoes
                  ? <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 mt-2 leading-relaxed">{budget.observacoes}</p>
                  : <p className="text-xs text-muted-foreground italic">Sem observações</p>}
              </div>
            )}

            {/* Endereço de entrega */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground">Endereço de Entrega</p>
                <p className="text-xs text-muted-foreground mt-1">Selecione onde este pedido deve ser entregue.</p>
              </div>

              <div className="space-y-2">
                <label className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors ${deliveryMode === "customer" ? "border-primary bg-primary/8" : "border-border"} ${isLocked ? "opacity-60" : "cursor-pointer hover:bg-muted"}`}>
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={deliveryMode === "customer"}
                    onChange={useCustomerAddress}
                    disabled={isLocked || !hasCustomerAddress}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium block">Entregar no endereço do cliente</span>
                    <span className="text-muted-foreground block mt-0.5">{hasCustomerAddress ? customerAddr : "Cliente sem endereço cadastrado"}</span>
                  </span>
                </label>

                <label className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors ${deliveryMode === "different" ? "border-primary bg-primary/8" : "border-border"} ${isLocked ? "opacity-60" : "cursor-pointer hover:bg-muted"}`}>
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={deliveryMode === "different"}
                    onChange={useDifferentDeliveryAddress}
                    disabled={isLocked}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium block">Entregar em outro endereço</span>
                    <span className="text-muted-foreground block mt-0.5">{deliveryMode === "different" ? buildFullAddress(entrega) || "Endereço ainda não preenchido" : "Selecionar para preencher em uma janela separada."}</span>
                  </span>
                </label>
              </div>

              {!hasCustomerAddress && deliveryMode !== "different" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 mt-3">
                  O cliente não possui endereço cadastrado. Selecione “Entregar em outro endereço” para preencher os dados de entrega.
                </div>
              )}

              {deliveryMode === "different" && !isLocked && (
                <button type="button" onClick={() => setShowDeliveryModal(true)}
                  className="mt-3 text-xs text-primary hover:underline">
                  Editar endereço de entrega
                </button>
              )}
            </div>

            {showDeliveryModal && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-base">Endereço de entrega</h3>
                      <p className="text-xs text-muted-foreground mt-1">Digite o CEP para consultar automaticamente e complete número/complemento.</p>
                    </div>
                    <button type="button" onClick={() => setShowDeliveryModal(false)} className="text-muted-foreground hover:text-foreground">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">CEP</label>
                      <input
                        value={entrega.cep}
                        onChange={(e) => handleDeliveryCepChange(e.target.value)}
                        placeholder="00000-000"
                        disabled={isLocked}
                        className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
                      />
                      {consultandoEntregaCep && <p className="text-xs text-muted-foreground mt-1">Consultando CEP...</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Logradouro</label>
                        <input value={entrega.logradouro} onChange={(e) => { setEntrega((f) => ({ ...f, logradouro: e.target.value })); markDirty(); }} disabled={isLocked}
                          className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Número</label>
                        <input value={entrega.numero} onChange={(e) => { setEntrega((f) => ({ ...f, numero: e.target.value })); markDirty(); }} disabled={isLocked}
                          className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Complemento</label>
                        <input value={entrega.complemento} onChange={(e) => { setEntrega((f) => ({ ...f, complemento: e.target.value })); markDirty(); }} disabled={isLocked}
                          className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Bairro</label>
                        <input value={entrega.bairro} onChange={(e) => { setEntrega((f) => ({ ...f, bairro: e.target.value })); markDirty(); }} disabled={isLocked}
                          className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                        <input value={entrega.cidade} onChange={(e) => { setEntrega((f) => ({ ...f, cidade: e.target.value })); markDirty(); }} disabled={isLocked}
                          className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Estado</label>
                        <input value={entrega.estado} onChange={(e) => { setEntrega((f) => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) })); markDirty(); }} disabled={isLocked} maxLength={2}
                          className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5">
                    <button type="button" onClick={() => setShowDeliveryModal(false)}
                      className="flex-1 border border-border rounded-xl py-2 text-xs hover:bg-muted transition-colors">Cancelar</button>
                    <button type="button" onClick={saveDifferentDeliveryAddress}
                      className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-medium hover:opacity-90">Salvar endereço</button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-border space-y-2">
              <button onClick={handleSaveDraft} disabled={saving || !canSaveDraft}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                title={!canSaveDraft ? "Faça uma alteração para salvar novamente como rascunho" : undefined}>
                {saving ? <Spinner size={14} /> : <Save size={14} />} Salvar Rascunho
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => changeStatus("enviado_fabrica")}
                  className="flex items-center justify-center gap-1.5 border border-primary text-primary py-2 rounded-xl text-xs font-medium hover:bg-primary/5 transition-colors">
                  <Send size={12} /> Fábrica
                </button>
                <button onClick={() => changeStatus("enviado_cliente")}
                  className="flex items-center justify-center gap-1.5 border border-border py-2 rounded-xl text-xs hover:bg-muted transition-colors">
                  <Send size={12} /> Cliente
                </button>
              </div>
              <button onClick={printBudget}
                className="w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-xl text-xs hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Printer size={13} /> Imprimir / Gerar PDF
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Resumo Financeiro</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({budget.items.length} {budget.items.length === 1 ? "produto" : "produtos"})
                </span>
                <span className="font-mono">{fmtBRL(budget.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagamento</span>
                <span className="font-mono">{budget.formaPagamento === "cartao" ? `Cartão ${budget.parcelasCartao}x` : budget.formaPagamento === "avista_pix" ? "À vista PIX" : "À vista"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Peso total da carga</span>
                <span className="font-mono">{fmtKg(totalWeightKg)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cálculo do frete</span>
                <span className="font-mono text-muted-foreground">{fmtBRL(pricingSettings.fretePor100Kg)} / 100 kg</span>
              </div>
              {budget.frete > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-mono">{fmtBRL(budget.frete)}</span>
                </div>
              )}
              {calculatePaymentDiscount(budget.subtotal, budget.frete, budget.formaPagamento, budget.descontoPixPercentual, budget.descontoPixIncluiFrete) > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Desconto PIX ({budget.descontoPixPercentual}%{budget.descontoPixIncluiFrete ? " com frete" : ""})</span>
                  <span className="font-mono">- {fmtBRL(calculatePaymentDiscount(budget.subtotal, budget.frete, budget.formaPagamento, budget.descontoPixPercentual, budget.descontoPixIncluiFrete))}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between items-baseline">
                <span className="font-semibold">Total Final</span>
                <span className="font-mono text-2xl font-semibold text-primary">{fmtBRL(budget.totalFinal)}</span>
              </div>
            </div>
            {budget.items.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2.5">Resumo de entrega</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total de caixas</span>
                    <span className="font-mono">{budget.items.reduce((s, i) => s + i.caixas, 0)} cx</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de m²</span>
                    <span className="font-mono">{budget.items.reduce((s, i) => s + i.areaM2, 0).toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peso total</span>
                    <span className="font-mono">{fmtKg(totalWeightKg)}</span>
                  </div>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground text-right">
              #{budget.numero} · {fmtDate(budget.createdAt)}
            </p>
          </div>
        </div>
      </div>


      {showModal && (
        <ProductModal allProducts={allProducts} tabelaPreco={budget.tabelaPreco} pricingSettings={pricingSettings}
          onSelect={handleAddProduct} onClose={() => setShowModal(false)} />
      )}

      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-border">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Copiar Orçamento</h3>
              <button onClick={() => setShowDuplicateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione o técnico responsável pelo novo orçamento (cópia do #{budget.numero}):
            </p>
            <div className="space-y-2 mb-4">
              {TECNICOS.map((nome) => (
                <button key={nome} onClick={() => setDupTecnico(nome)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    dupTecnico === nome
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}>
                  {nome}
                </button>
              ))}
              <button onClick={() => setDupTecnico("__custom__")}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  dupTecnico === "__custom__"
                    ? "border-primary bg-primary/8 text-primary"
                    : "border-dashed border-border hover:border-primary/40 text-muted-foreground"
                }`}>
                + Outro nome...
              </button>
            </div>
            {dupTecnico === "__custom__" && (
              <input
                type="text" value={dupTecnicoCustom} onChange={(e) => setDupTecnicoCustom(e.target.value)}
                placeholder="Nome do técnico"
                autoFocus
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 mb-4"
              />
            )}
            <button onClick={handleDuplicate} disabled={duplicating || !dupTecnico || (dupTecnico === "__custom__" && !dupTecnicoCustom.trim())}
              className="w-full bg-amber-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors mt-2">
              {duplicating ? <><Spinner size={14} /> Copiando...</> : <><Copy size={14} /> Criar Cópia</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Customer View ─────────────────────────────────────────────────

function CustomerView({
  customer: initCustomer, allProducts, pricingSettings, onBack, onOpenBudget,
}: {
  customer: Customer; allProducts: Product[]; pricingSettings: PricingSettings;
  onBack: () => void;
  onOpenBudget: (b: Budget, c: Customer) => void;
}) {
  const [customer, setCustomer] = useState(initCustomer);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    ...initCustomer,
    cpf: formatCPF(initCustomer.cpf || ""),
    telefone: formatPhone(initCustomer.telefone || ""),
    cep: formatCEP(initCustomer.cep || ""),
  });
  const [showTecnicoModal, setShowTecnicoModal] = useState(false);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState("");
  const [tecnicoCustom, setTecnicoCustom] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [consultandoEditCep, setConsultandoEditCep] = useState(false);

  async function handleEditCepChange(value: string) {
    const cep = formatCEP(value);
    setEditForm((f) => ({ ...f, cep }));

    if (!isValidCEP(cep)) return;

    setConsultandoEditCep(true);
    try {
      const address = await fetchAddressByCEP(cep);
      if (!address) {
        toast.error("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }

      setEditForm((f) => ({
        ...f,
        cep,
        logradouro: address.logradouro,
        bairro: address.bairro,
        cidade: address.localidade,
        estado: address.uf,
      }));
    } catch {
      toast.error("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setConsultandoEditCep(false);
    }
  }

  async function loadBudgets() {
    setLoading(true);
    try {
      setBudgets(await getBudgetsForCustomer(customer.id));
    } catch { toast.error("Erro ao carregar orçamentos"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadBudgets(); }, [customer.id]);

  function openTecnicoModal() {
    setTecnicoSelecionado("");
    setTecnicoCustom("");
    setShowTecnicoModal(true);
  }

  async function handleCreateBudget() {
    const tecnico = tecnicoSelecionado === "__custom__" ? tecnicoCustom.trim() : tecnicoSelecionado;
    if (!tecnico) { toast.error("Selecione ou informe o técnico responsável"); return; }
    setShowTecnicoModal(false);
    setCreating(true);
    try {
      const b = await createBudget(customer.id, tecnico);
      onOpenBudget(b, customer);
    } catch (e: any) { toast.error("Erro: " + e.message); setCreating(false); }
  }

  async function handleOpenBudget(b: Budget) {
    try {
      const full = await getBudgetWithItems(b.id);
      onOpenBudget(full, customer);
    } catch (e: any) { toast.error("Erro ao abrir orçamento: " + e.message); }
  }

  async function saveEdit() {
    if (!editForm.nome?.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!validateCustomerContactFields(editForm.cpf || "", editForm.telefone || "")) return;
    try {
      const dupMsg = await checkCustomerDuplicate(editForm.nome || "", editForm.cpf || "", editForm.telefone || "", editForm.email || "", customer.id);
      if (dupMsg) { toast.error(dupMsg); return; }
      await updateCustomer(customer.id, editForm);
      const updated = { ...customer, ...editForm };
      setCustomer(updated);
      setShowEdit(false);
      toast.success("Cliente atualizado!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
  }

  async function handleDeleteCustomer() {
    if (!confirm(`Excluir o cliente "${customer.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await deleteCustomer(customer.id);
      toast.success("Cliente excluído!");
      onBack();
    } catch (e: any) { toast.error(e.message); setDeleting(false); }
  }

  const totalFaturamento = budgets
    .filter((b) => b.status !== "cancelado")
    .reduce((s, b) => s + b.totalFinal, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-5 pt-4 pb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-90 mb-3 transition-opacity">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{customer.nome}</h1>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs opacity-70">
              {customer.cpf && <span>CPF: {customer.cpf}</span>}
              {customer.email && <span>{customer.email}</span>}
              {customer.telefone && <span>{customer.telefone}</span>}
            </div>
            {(customer.logradouro || customer.cidade) && (
              <p className="text-xs opacity-55 mt-0.5">
                {[customer.logradouro, customer.numero, customer.complemento, customer.bairro, customer.cidade && `${customer.cidade}${customer.estado ? `/${customer.estado}` : ""}`, customer.cep].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowEdit(true)}
              className="border border-white/20 px-3 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors flex items-center gap-1">
              <Pencil size={11} /> Editar
            </button>
            <button onClick={handleDeleteCustomer} disabled={deleting}
              className="border border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 disabled:opacity-50">
              {deleting ? <Spinner size={11} /> : <Trash2 size={11} />} Excluir
            </button>
            <button onClick={openTecnicoModal} disabled={creating}
              className="bg-white/15 hover:bg-white/25 border border-white/20 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50">
              {creating ? <Spinner size={12} /> : <Plus size={12} />} Novo Orçamento
            </button>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-3 border-t border-white/10">
          <div>
            <p className="text-2xl font-semibold font-mono">{budgets.length}</p>
            <p className="text-xs opacity-60">orçamentos</p>
          </div>
          {totalFaturamento > 0 && (
            <div>
              <p className="text-2xl font-semibold font-mono">{fmtBRL(totalFaturamento)}</p>
              <p className="text-xs opacity-60">total orçado</p>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Orçamentos</h2>
          <button onClick={loadBudgets} className="text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm text-muted-foreground">Nenhum orçamento ainda</p>
            <button onClick={openTecnicoModal} className="mt-3 text-primary text-sm hover:underline">Criar primeiro orçamento</button>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((b) => (
              <button key={b.id} onClick={() => handleOpenBudget(b)}
                className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">Orçamento #{b.numero}</span>
                      <StatusPill status={b.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(b.createdAt)} · Tabela {b.tabelaPreco}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-semibold font-mono text-lg">{fmtBRL(b.totalFinal)}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal seleção de técnico */}
      {showTecnicoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-border">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Técnico Responsável</h3>
              <button onClick={() => setShowTecnicoModal(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Selecione quem está elaborando este orçamento:</p>
            <div className="space-y-2 mb-4">
              {TECNICOS.map((nome) => (
                <button key={nome} onClick={() => setTecnicoSelecionado(nome)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    tecnicoSelecionado === nome
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}>
                  {nome}
                </button>
              ))}
              <button onClick={() => setTecnicoSelecionado("__custom__")}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  tecnicoSelecionado === "__custom__"
                    ? "border-primary bg-primary/8 text-primary"
                    : "border-dashed border-border hover:border-primary/40 text-muted-foreground"
                }`}>
                + Outro nome...
              </button>
            </div>
            {tecnicoSelecionado === "__custom__" && (
              <input
                type="text" value={tecnicoCustom} onChange={(e) => setTecnicoCustom(e.target.value)}
                placeholder="Nome do técnico"
                autoFocus
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 mb-4"
              />
            )}
            <button onClick={handleCreateBudget}
              disabled={!tecnicoSelecionado || (tecnicoSelecionado === "__custom__" && !tecnicoCustom.trim())}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
              <Plus size={14} /> Criar Orçamento
            </button>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 border border-border my-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Editar Cliente</h3>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <input value={editForm.nome || ""} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">CPF</label>
                  <input value={editForm.cpf || ""} onChange={(e) => setEditForm((f) => ({ ...f, cpf: formatCPF(e.target.value) }))}
                    placeholder="000.000.000-00"
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                  <input value={editForm.telefone || ""} onChange={(e) => setEditForm((f) => ({ ...f, telefone: formatPhone(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                <input value={editForm.email || ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground pt-1">Endereço</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">CEP</label>
                <input value={editForm.cep || ""} onChange={(e) => handleEditCepChange(e.target.value)}
                  placeholder="00000-000"
                  className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                {consultandoEditCep && <p className="text-xs text-muted-foreground mt-1">Consultando CEP...</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Logradouro</label>
                  <input value={editForm.logradouro || ""} onChange={(e) => setEditForm((f) => ({ ...f, logradouro: e.target.value }))}
                    placeholder="Rua, Av, Trav..."
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Número</label>
                  <input value={editForm.numero || ""} onChange={(e) => setEditForm((f) => ({ ...f, numero: e.target.value }))}
                    placeholder="123"
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Complemento</label>
                  <input value={editForm.complemento || ""} onChange={(e) => setEditForm((f) => ({ ...f, complemento: e.target.value }))}
                    placeholder="Apto, Bloco..."
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bairro</label>
                  <input value={editForm.bairro || ""} onChange={(e) => setEditForm((f) => ({ ...f, bairro: e.target.value }))}
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                  <input value={editForm.cidade || ""} onChange={(e) => setEditForm((f) => ({ ...f, cidade: e.target.value }))}
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Estado</label>
                  <input value={editForm.estado || ""} onChange={(e) => setEditForm((f) => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                    maxLength={2}
                    className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowEdit(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm hover:bg-muted transition-colors">Cancelar</button>
                <button onClick={saveEdit} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── All Customers List ────────────────────────────────────────────

async function fetchAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from("customers").select("*").order("nome");
  if (error) throw error;
  return (data || []).map(mapCustomer);
}

function AllCustomersTab({ onSelect }: { onSelect: (c: Customer) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchAllCustomers()
      .then(setCustomers)
      .catch(() => toast.error("Erro ao carregar clientes"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = q.trim()
    ? customers.filter((c) =>
        [c.nome, c.cpf, c.email, c.telefone, c.cidade]
          .some((f) => f?.toLowerCase().includes(q.toLowerCase()))
      )
    : customers;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por nome, CPF, e-mail..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {q ? `Nenhum cliente encontrado para "${q}"` : "Nenhum cliente cadastrado"}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-2.5 border-b border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">{filtered.length} clientes</p>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => onSelect(c)}
                className="w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                      {c.cpf && <span>CPF: {c.cpf}</span>}
                      {c.email && <span>{c.email}</span>}
                      {c.telefone && <span>{c.telefone}</span>}
                      {c.cidade && <span>{c.cidade}{c.estado ? `/${c.estado}` : ""}</span>}
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors ml-2 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function updateProduct(id: string, patch: Partial<Omit<Product, "id">>): Promise<void> {
  const { error } = await supabase.from("products").update({
    referencia: patch.referencia, formato: patch.formato, linha: patch.linha,
    colecao: patch.colecao, cor: patch.cor, superficie: patch.superficie,
    m2_por_caixa: patch.m2PorCaixa, pecas_por_caixa: patch.pecasPorCaixa,
    preco1: patch.preco1, preco2: patch.preco2, preco3: patch.preco3, preco4: patch.preco4,
    descontinuado: patch.descontinuado ?? false,
  }).eq("id", id);
  if (error) throw error;
}

// ── Product Edit Modal ────────────────────────────────────────────

function ProductEditModal({ product, onSave, onClose }: {
  product: Product;
  onSave: (updated: Product) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...product });
  const [saving, setSaving] = useState(false);

  function field(key: keyof Product) {
    return {
      value: String(form[key] ?? ""),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const normalizedProduct = {
        ...form,
        preco1: form.preco1 != null && form.preco1 !== "" ? parseFloat(String(form.preco1).replace(",", ".")) : null,
        preco2: form.preco2 != null && form.preco2 !== "" ? parseFloat(String(form.preco2).replace(",", ".")) : null,
        preco3: form.preco3 != null && form.preco3 !== "" ? parseFloat(String(form.preco3).replace(",", ".")) : null,
        preco4: form.preco4 != null && form.preco4 !== "" ? parseFloat(String(form.preco4).replace(",", ".")) : null,
        m2PorCaixa: parseFloat(String(form.m2PorCaixa).replace(",", ".")) || 0,
        pecasPorCaixa: parseInt(String(form.pecasPorCaixa)) || 0,
      };
      await updateProduct(form.id, normalizedProduct);
      onSave(normalizedProduct);
      toast.success("Produto atualizado!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25";
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold">Editar Produto</h3>
            <p className="text-xs text-muted-foreground font-mono">Ref: {product.referencia}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {([["Linha", "linha"], ["Coleção", "colecao"], ["Cor", "cor"], ["Formato", "formato"], ["Superfície", "superficie"], ["Referência", "referencia"]] as const).map(([label, key]) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                <input {...field(key)} className={inputCls} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">m²/caixa</label>
              <input {...field("m2PorCaixa")} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Peças/caixa</label>
              <input {...field("pecasPorCaixa")} className={inputCls} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tabelas de Preço (R$/m²)</p>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as const).map((t) => (
                <div key={t}>
                  <label className="text-xs text-muted-foreground mb-1 block text-center">Tab. {t}</label>
                  <input
                    value={String(form[`preco${t}`] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [`preco${t}`]: e.target.value === "" ? null : e.target.value }))}
                    placeholder="—"
                    className={inputCls + " text-center font-mono"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Descontinuado */}
          <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${form.descontinuado ? "border-amber-300 bg-amber-50" : "border-border bg-muted/20"}`}>
            <div>
              <p className="text-sm font-medium">Produto descontinuado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.descontinuado
                  ? "Este item está marcado como descontinuado e não será sugerido em novos orçamentos."
                  : "Marque se este produto não está mais disponível ou fora de linha."}
              </p>
            </div>
            <button type="button"
              onClick={() => setForm((f) => ({ ...f, descontinuado: !f.descontinuado }))}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${form.descontinuado ? "bg-amber-500" : "bg-border"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.descontinuado ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Spinner size={14} /> : <Check size={14} />} Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}

// ── All Products List ─────────────────────────────────────────────

function AllProductsTab({ allProducts: initProducts, pricingSettings, onPricingSettingsChange }: { allProducts: Product[]; pricingSettings: PricingSettings; onPricingSettingsChange: (settings: PricingSettings) => void }) {
  const [products, setProducts] = useState<Product[]>(initProducts);
  const [q, setQ] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [localUso, setLocalUso] = useState("");
  const [tabela, setTabela] = useState<1 | 2 | 3 | 4>(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; total: number } | null>(null);
  const [showDescontinuados, setShowDescontinuados] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    imposto: String(pricingSettings.impostoPercentual || ""),
    taxa: String(pricingSettings.taxaCartaoPercentual || ""),
    fretePor100Kg: String(pricingSettings.fretePor100Kg ?? 4),
  });
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    setPricingForm({
      imposto: String(pricingSettings.impostoPercentual || ""),
      taxa: String(pricingSettings.taxaCartaoPercentual || ""),
      fretePor100Kg: String(pricingSettings.fretePor100Kg ?? 4),
    });
  }, [pricingSettings.impostoPercentual, pricingSettings.taxaCartaoPercentual, pricingSettings.fretePor100Kg]);

  const superficies = [...new Set(products.map((p) => p.superficie).filter(Boolean))].sort();

  const filtered = products.filter((p) => {
    const txt = q.toLowerCase();
    const matchQ = !q || [p.linha, p.colecao, p.cor, p.formato, p.referencia, p.superficie]
      .some((f) => f?.toLowerCase().includes(txt));
    return matchQ &&
      (!superficie || p.superficie === superficie) &&
      (!localUso || String(p.localUso) === localUso) &&
      (showDescontinuados || !p.descontinuado);
  });

  const descontinuadosCount = products.filter((p) => p.descontinuado).length;

  const pk = priceKey(tabela);

  function handleProductSaved(updated: Product) {
    setProducts((ps) => ps.map((p) => p.id === updated.id ? updated : p));
    setEditingProduct(null);
  }

  function handlePricingInput(key: "imposto" | "taxa" | "fretePor100Kg", value: string) {
    if (value.trim() === "") {
      setPricingForm((f) => ({ ...f, [key]: "" }));
      return;
    }
    const parsed = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) return;
    setPricingForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSavePricingSettings() {
    setSavingPricing(true);
    try {
      const saved = await savePricingSettings({
        ...pricingSettings,
        impostoPercentual: parseDecimalInput(pricingForm.imposto),
        taxaCartaoPercentual: parseDecimalInput(pricingForm.taxa),
        fretePor100Kg: parseDecimalInput(pricingForm.fretePor100Kg) || 0,
      });
      onPricingSettingsChange(saved);
      toast.success("Composição interna do preço salva!");
    } catch (e: any) {
      toast.error("Erro ao salvar composição: " + e.message);
    } finally {
      setSavingPricing(false);
    }
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const parsed = buildProductsFromCSV(text);
      if (parsed.length === 0) { toast.error("Nenhum produto encontrado no arquivo."); return; }
      await seedProducts(parsed);
      const refreshed = await fetchAllProducts();
      setProducts(refreshed);
      setImportResult({ ok: parsed.length, total: parsed.length });
      toast.success(`${parsed.length} produtos importados com sucesso!`);
    } catch (e: any) { toast.error("Erro ao importar: " + e.message); }
    finally { setImporting(false); }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Coleção, cor, formato, referência..."
            className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/25" />
        </div>
        <select value={superficie} onChange={(e) => setSuperficie(e.target.value)}

          className="border border-border rounded-xl px-3 py-2.5 text-xs bg-card focus:outline-none">
          <option value="">Todas as superfícies</option>
          {superficies.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={localUso} onChange={(e) => setLocalUso(e.target.value)}
          className="border border-border rounded-xl px-3 py-2.5 text-xs bg-card focus:outline-none">
          <option value="">Todos os locais</option>
          <option value="2">Parede</option>
          <option value="3">Piso Interno</option>
          <option value="4">Piso Externo</option>
        </select>
        <div className="flex items-center gap-1 border border-border rounded-xl px-3 bg-card h-[38px]">
          <span className="text-xs text-muted-foreground">Tab.</span>
          {([1, 2, 3, 4] as const).map((t) => (
            <button key={t} onClick={() => setTabela(t)}
              className={`w-6 h-6 rounded text-xs font-semibold transition-all ${tabela === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Toggle descontinuados */}
        <button onClick={() => setShowDescontinuados((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition-colors ${showDescontinuados ? "bg-amber-100 border-amber-300 text-amber-800" : "border-border text-muted-foreground hover:bg-muted"}`}>
          {showDescontinuados ? <Check size={12} /> : <X size={12} />}
          Descontinuados {descontinuadosCount > 0 && `(${descontinuadosCount})`}
        </button>

        {/* Export template */}
        <button onClick={() => {
          const headers = "Formato;Referencia;Linha;Colecao;Cor;Superficie;Faces;Variacao;LocalUso;Derivacao;M2PorCaixa;PecasPorCaixa;M2PorPallet;CxPorPallet;PesoBrutoM2;PesoBrutoCx;EspessuraMm;Preco1;Preco2;Preco3;Preco4";
          const example = "60x60;REF-001;Nome da Linha;Nome Coleção;Bege;Polido;1;-;3;-;1,44;6;43,20;30;18,50;26,65;9,00;45,90;49,90;54,90;59,90";
          const csv = headers + "\n" + example;
          const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "template_produtos_villagres.csv"; a.click();
          URL.revokeObjectURL(url);
        }}
          className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-xs hover:bg-muted transition-colors text-muted-foreground">
          <Copy size={12} /> Exportar Template
        </button>

        {/* Import CSV */}
        <label className={`flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-xs cursor-pointer hover:bg-muted transition-colors ${importing ? "opacity-50 pointer-events-none" : ""}`}>
          {importing ? <Spinner size={12} /> : <Plus size={13} />}
          {importing ? "Importando..." : "Importar Planilha"}
          <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        </label>
      </div>

      {importResult && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-800">
          <Check size={14} className="text-green-600 shrink-0" />
          <span><strong>{importResult.ok}</strong> produtos importados/atualizados com sucesso.</span>
          <button onClick={() => setImportResult(null)} className="ml-auto text-green-600 hover:text-green-800"><X size={13} /></button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-sm">Composição interna do preço</h3>
          <p className="text-xs text-muted-foreground mt-1">Esses percentuais e o valor de frete por peso serão usados nos orçamentos e não serão exibidos como composição interna ao cliente.</p>
        </div>
        <div className="grid lg:grid-cols-[1fr_1fr_1.2fr_auto] sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Impostos (%)</label>
            <input
              value={pricingForm.imposto}
              onChange={(e) => handlePricingInput("imposto", e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Taxa de cartão (%)</label>
            <input
              value={pricingForm.taxa}
              onChange={(e) => handlePricingInput("taxa", e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor do Frete a cada 100 Kilos</label>
            <input
              value={pricingForm.fretePor100Kg}
              onChange={(e) => handlePricingInput("fretePor100Kg", e.target.value)}
              inputMode="decimal"
              placeholder="4,00"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono"
            />
          </div>
          <button
            onClick={handleSavePricingSettings}
            disabled={savingPricing}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingPricing ? <Spinner size={14} /> : <Save size={14} />} Salvar composição
          </button>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 text-sm grid md:grid-cols-2 gap-2">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Exemplo com preço-base de R$ 1.000,00</span>
            <span className="font-semibold font-mono text-primary">Preço final: {fmtBRL(calculateFinalPrice(1000, pricingForm.imposto, pricingForm.taxa))}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Exemplo de frete para 100 kg</span>
            <span className="font-semibold font-mono text-primary">{fmtBRL(parseDecimalInput(pricingForm.fretePor100Kg))}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filtered.length} produtos · Tabela {tabela}</p>
          <p className="text-xs text-muted-foreground">Clique em <Pencil size={10} className="inline" /> para editar</p>
        </div>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left px-5 py-2.5 font-medium">Produto</th>
                <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Formato</th>
                <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Superfície</th>
                <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">m²/cx</th>
                <th className="text-right px-3 py-2.5 font-medium">Preço-base</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 200).map((p) => {
                const price = p[pk] as number | null;
                return (
                  <tr key={p.id} className={`transition-colors group ${p.descontinuado ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-muted/20"}`}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm leading-tight ${p.descontinuado ? "line-through text-muted-foreground" : ""}`}>{p.linha}</p>
                        {p.descontinuado && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium shrink-0">Descontinuado</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.cor && p.cor !== "única" && p.cor !== "-" ? `${p.cor} · ` : ""}{p.colecao}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">Ref: {p.referencia}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{p.formato}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">{p.superficie} · {LOCAL_USO[p.localUso]}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono hidden sm:table-cell">{p.m2PorCaixa}</td>
                    <td className="px-3 py-2.5 text-right">
                      {price
                        ? <span className="font-mono text-muted-foreground">{fmtBRL(price)}</span>
                        : <span className="text-xs text-amber-600">Consultar</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setEditingProduct(p)}
                        className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        title="Editar produto">
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleProductSaved}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}

// ── Customer Search (Home) ────────────────────────────────────────

function CustomerSearch({ onSelect, allProducts, pricingSettings, onPricingSettingsChange, onOpenBudgetById }: {
  onSelect: (c: Customer) => void;
  allProducts: Product[];
  pricingSettings: PricingSettings;
  onPricingSettingsChange: (settings: PricingSettings) => void;
  onOpenBudgetById: (budgetId: string, customerId: string) => void;
}) {
  const [tab, setTab] = useState<"orcamentos" | "clientes" | "produtos">("orcamentos");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", telefone: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" });
  const [creating, setCreating] = useState(false);
  const [consultandoCustomerCep, setConsultandoCustomerCep] = useState(false);

  // Orçamentos tab state
  const [recentBudgets, setRecentBudgets] = useState<BudgetSummary[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<BudgetSummary[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [filterTecnico, setFilterTecnico] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasFilter = !!(filterTecnico || filterStatus || filterCliente || filterDataInicio || filterDataFim);

  useEffect(() => {
    fetchRecentBudgets(5)
      .then(setRecentBudgets)
      .catch(() => {})
      .finally(() => setBudgetsLoading(false));
  }, []);

  useEffect(() => {
    if (!hasFilter) { setFilteredBudgets([]); return; }
    const t = setTimeout(async () => {
      setIsFiltering(true);
      try {
        setFilteredBudgets(await fetchBudgetsFiltered({
          tecnico: filterTecnico, status: filterStatus, customerQ: filterCliente,
          dataInicio: filterDataInicio, dataFim: filterDataFim,
        }));
      } catch {}
      finally { setIsFiltering(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [filterTecnico, filterStatus, filterCliente, filterDataInicio, filterDataFim]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchCustomers(q)); }
      catch { toast.error("Erro na busca"); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);


  async function handleCustomerCepChange(value: string) {
    const cep = formatCEP(value);
    setForm((f) => ({ ...f, cep }));

    if (!isValidCEP(cep)) return;

    setConsultandoCustomerCep(true);
    try {
      const address = await fetchAddressByCEP(cep);
      if (!address) {
        toast.error("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }

      setForm((f) => ({
        ...f,
        cep,
        logradouro: address.logradouro,
        bairro: address.bairro,
        cidade: address.localidade,
        estado: address.uf,
      }));
    } catch {
      toast.error("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setConsultandoCustomerCep(false);
    }
  }

  async function handleCreate() {    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!validateCustomerContactFields(form.cpf, form.telefone)) return;
    setCreating(true);
    try {
      const dupMsg = await checkCustomerDuplicate(form.nome, form.cpf, form.telefone, form.email);
      if (dupMsg) { toast.error(dupMsg); setCreating(false); return; }
      const c = await createCustomer(form);
      toast.success("Cliente cadastrado!");
      onSelect(c);
    } catch (e: any) { toast.error("Erro: " + e.message); setCreating(false); }
  }

  const tabs = [
    { key: "orcamentos", label: "Orçamentos" },
    { key: "clientes", label: "Clientes" },
    { key: "produtos", label: "Produtos" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Hero Header ── */}
      <header className="bg-primary text-primary-foreground">
        {/* Three-panel layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-6 gap-6">

          {/* LEFT — PAVIMENT */}
          <div className="flex justify-start">
            <img
              src="/src/imports/WhatsApp_Image_2026-07-11_at_10.17.07.jpeg"
              alt="PAVIMENT"
              style={{ height: 72, width: "auto", objectFit: "contain" }}
              className="brightness-0 invert"
            />
          </div>

          {/* CENTER — Title */}
          <div className="flex flex-col items-center text-center">
            <div className="w-6 h-px bg-white/25 mb-3" />
            <h1 className="text-2xl md:text-3xl whitespace-nowrap tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}>
              Sistema de Orçamentos
            </h1>
            <p className="mt-1.5 text-xs tracking-[0.18em] uppercase opacity-35 font-light">
              Sala Técnica · Representante Comercial
            </p>
            <div className="w-6 h-px bg-white/25 mt-3" />
          </div>

          {/* RIGHT — VILLAGRES */}
          <div className="flex justify-end">
            <img
              src="/src/imports/logo_villagre.png"
              alt="Villagres"
              style={{ height: 72, width: "auto", objectFit: "contain" }}
              className="brightness-0 invert"
            />
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="border-t border-white/10">
          <div className="flex justify-center">
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`relative px-10 py-3.5 text-sm tracking-wide transition-all ${
                  tab === key
                    ? "text-white font-medium"
                    : "text-white/45 hover:text-white/75 font-light"
                }`}>
                {label}
                {tab === key && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white/80 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {tab === "orcamentos" && (
          <div className="space-y-5">
            {/* Buscar cliente */}
            <div>
              <h2 className="font-semibold mb-3">Buscar Cliente</h2>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={q} onChange={(e) => setQ(e.target.value)} autoFocus
                  placeholder="Nome, CPF ou e-mail do cliente..."
                  className="w-full border-2 border-border focus:border-primary rounded-2xl pl-11 pr-4 py-3.5 text-sm bg-card focus:outline-none transition-colors shadow-sm" />
                {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Spinner size={14} /></div>}
              </div>
              {q.trim() && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden mt-2 shadow-sm">
                  {results.length === 0 && !searching
                    ? <div className="py-5 text-center text-muted-foreground text-sm">Nenhum cliente para "{q}"</div>
                    : <div className="divide-y divide-border">
                        {results.map((c) => (
                          <button key={c.id} onClick={() => onSelect(c)}
                            className="w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors group">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{c.nome}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                                  {c.cpf && <span>CPF: {c.cpf}</span>}
                                  {c.email && <span>{c.email}</span>}
                                  {c.cidade && <span>{c.cidade}{c.estado ? `/${c.estado}` : ""}</span>}
                                </div>
                              </div>
                              <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors ml-2 shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                  }
                </div>
              )}
              {!q.trim() && (
                <div className="mt-2">
                  {!showForm ? (
                    <button onClick={() => setShowForm(true)}
                      className="w-full border-2 border-dashed border-border rounded-2xl py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2">
                      <Plus size={15} /> Cadastrar novo cliente / orçamento
                    </button>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Novo Cliente</h3>
                        <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Nome completo *</label>
                          <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                            placeholder="Nome completo"
                            className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">CPF</label>
                            <input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: formatCPF(e.target.value) }))}
                              placeholder="000.000.000-00"
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                            <input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: formatPhone(e.target.value) }))}
                              placeholder="(00) 00000-0000"
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="email@exemplo.com"
                            className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground pt-1">Endereço</p>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">CEP</label>
                          <input value={form.cep} onChange={(e) => handleCustomerCepChange(e.target.value)}
                            placeholder="00000-000"
                            className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          {consultandoCustomerCep && <p className="text-xs text-muted-foreground mt-1">Consultando CEP...</p>}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs font-medium text-muted-foreground">Logradouro</label>
                            <input value={form.logradouro} onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                              placeholder="Rua, Av, Trav..."
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Número</label>
                            <input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                              placeholder="123"
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Complemento</label>
                            <input value={form.complemento} onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                              placeholder="Apto, Bloco..."
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Bairro</label>
                            <input value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                            <input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Estado</label>
                            <input value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                              placeholder="SP" maxLength={2}
                              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                        </div>
                        <button onClick={handleCreate} disabled={creating}
                          className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                          {creating && <Spinner size={14} />}
                          {creating ? "Cadastrando..." : "Cadastrar Cliente"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filtros de orçamentos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Orçamentos</h2>
                {hasFilter && (
                  <button onClick={() => { setFilterTecnico(""); setFilterStatus(""); setFilterCliente(""); setFilterDataInicio(""); setFilterDataFim(""); }}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <X size={11} /> Limpar filtros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                <select value={filterTecnico} onChange={(e) => setFilterTecnico(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 text-xs bg-card focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Técnico</option>
                  {TECNICOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 text-xs bg-card focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Status</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="relative">
                  <input value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}
                    placeholder="Cliente..."
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-card focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  {isFiltering && <div className="absolute right-2 top-1/2 -translate-y-1/2"><Spinner size={11} /></div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">De</label>
                  <input type="date" value={filterDataInicio} onChange={(e) => setFilterDataInicio(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-card focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Até</label>
                  <input type="date" value={filterDataFim} onChange={(e) => setFilterDataFim(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-card focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              {/* Lista de orçamentos */}
              {(() => {
                const list = hasFilter ? filteredBudgets : recentBudgets;
                const label = hasFilter ? `${list.length} resultado${list.length !== 1 ? "s" : ""}` : "5 mais recentes";
                return budgetsLoading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                    {list.length === 0
                      ? <div className="py-10 text-center text-sm text-muted-foreground">Nenhum orçamento encontrado</div>
                      : <div className="divide-y divide-border">
                          {list.map((b) => {
                            const canDelete = b.status === "rascunho";
                            const locked = b.status === "enviado_fabrica" || b.status === "fechado";
                            return (
                              <div key={b.id} className="flex items-stretch group">
                                <button onClick={() => onOpenBudgetById(b.id, b.customerId)}
                                  className="flex-1 text-left px-5 py-3.5 hover:bg-muted/30 transition-colors">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">#{b.numero}</span>
                                        <StatusPill status={b.status} />
                                        {locked && <span className="text-[10px] text-muted-foreground border border-border rounded px-1">bloqueado</span>}
                                      </div>
                                      <p className="text-sm font-medium mt-0.5 truncate">{b.customerNome}</p>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        {b.tecnico && <span>Téc: {b.tecnico}</span>}
                                        <span>{fmtDate(b.createdAt)}</span>
                                        {b.customerCidade && <span>{b.customerCidade}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-semibold font-mono text-base">{fmtBRL(b.totalFinal)}</span>
                                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                  </div>
                                </button>
                                {canDelete && (
                                  <button
                                    disabled={deletingId === b.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!confirm(`Excluir orçamento #${b.numero}? Esta ação não pode ser desfeita.`)) return;
                                      setDeletingId(b.id);
                                      try {
                                        await deleteBudget(b.id);
                                        setRecentBudgets((prev) => prev.filter((x) => x.id !== b.id));
                                        setFilteredBudgets((prev) => prev.filter((x) => x.id !== b.id));
                                        toast.success(`Orçamento #${b.numero} excluído.`);
                                      } catch (e: any) { toast.error("Erro: " + e.message); }
                                      finally { setDeletingId(null); }
                                    }}
                                    className="px-3 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors border-l border-border"
                                    title="Excluir rascunho">
                                    {deletingId === b.id ? <Spinner size={13} /> : <Trash2 size={14} />}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {tab === "clientes" && <AllCustomersTab onSelect={onSelect} />}
        {tab === "produtos" && <AllProductsTab allProducts={allProducts} pricingSettings={pricingSettings} onPricingSettingsChange={onPricingSettingsChange} />}
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────

type View =
  | { type: "home" }
  | { type: "customer"; customer: Customer }
  | { type: "budget"; budget: Budget; customer: Customer };

export default function App() {
  const [view, setView] = useState<View>({ type: "home" });
  const [appState, setAppState] = useState<"loading" | "setup" | "seeding" | "ready" | "error">("loading");
  const [initMsg, setInitMsg] = useState("Verificando banco de dados...");
  const [initError, setInitError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({ impostoPercentual: 0, taxaCartaoPercentual: 0, fretePor100Kg: 4 });

  async function init() {
    setAppState("loading");
    setInitError(null);
    try {
      setInitMsg("Verificando tabelas...");
      await runMigrations();
      const tablesOk = await checkTablesExist();
      if (tablesOk) await seedTecnicosOnExistingBudgets().catch(() => {});
      if (!tablesOk) { setAppState("setup"); return; }

      setInitMsg("Carregando composição interna do preço...");
      setPricingSettings(await loadPricingSettings());

      setInitMsg("Verificando catálogo...");
      const count = await getProductCount();
      if (count === 0) {
        setAppState("seeding");
        setInitMsg("Importando catálogo Villagres (305 produtos)...");
        const parsed = buildProductsFromCSV(csvRaw);
        await seedProducts(parsed);
        setAllProducts(parsed.map((p, i) => ({ ...p, id: `_${i}` })));
        // Reload from DB with real IDs
        setInitMsg("Finalizando...");
        setAllProducts(await fetchAllProducts());
      } else {
        setInitMsg("Carregando catálogo...");
        setAllProducts(await fetchAllProducts());
      }
      setAppState("ready");
    } catch (e: any) {
      setInitError(e.message || "Erro de conexão");
      setAppState("error");
    }
  }

  useEffect(() => { init(); }, []);

  if (appState === "setup") {
    return <SetupScreen onVerify={init} />;
  }

  if (appState === "loading" || appState === "seeding") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{initMsg}</p>
      </div>
    );
  }

  if (appState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <h2 className="font-semibold mb-2">Erro de conexão</h2>
          <p className="text-xs font-mono text-muted-foreground bg-muted rounded-lg p-2 mb-4">{initError}</p>
          <button onClick={init}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
            <RotateCcw size={14} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {view.type === "home" && (
        <CustomerSearch
          onSelect={(c) => setView({ type: "customer", customer: c })}
          allProducts={allProducts}
          pricingSettings={pricingSettings}
          onPricingSettingsChange={setPricingSettings}
          onOpenBudgetById={async (budgetId, customerId) => {
            try {
              const [full, { data: cData }] = await Promise.all([
                getBudgetWithItems(budgetId),
                supabase.from("customers").select("*").eq("id", customerId).single(),
              ]);
              if (cData) setView({ type: "budget", budget: full, customer: mapCustomer(cData) });
            } catch (e: any) { toast.error("Erro ao abrir orçamento: " + e.message); }
          }}
        />
      )}
      {view.type === "customer" && (
        <CustomerView
          customer={view.customer}
          allProducts={allProducts}
          pricingSettings={pricingSettings}
          onBack={() => setView({ type: "home" })}
          onOpenBudget={(b, c) => setView({ type: "budget", budget: b, customer: c })}
        />
      )}
      {view.type === "budget" && (
        <BudgetEditor
          budget={view.budget}
          allProducts={allProducts}
          pricingSettings={pricingSettings}
          customer={view.customer}
          onBack={() => setView({ type: "customer", customer: view.customer })}
          onGoHome={() => setView({ type: "home" })}
          onBudgetChange={(b) => setView({ type: "budget", budget: b, customer: view.customer })}
          onOpenBudget={(b) => setView({ type: "budget", budget: b, customer: view.customer })}
        />
      )}
      <Toaster position="bottom-right" richColors />
    </>
  );
}

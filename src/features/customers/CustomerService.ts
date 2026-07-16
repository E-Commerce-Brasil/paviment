import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDuplicateMessage,
  normalizeCustomerDigits,
  normalizeCustomerEmail,
  normalizeCustomerName,
  type CustomerDuplicateField,
  type CustomerDuplicateInput,
} from "./CustomerValidator";

export interface CustomerDuplicateMatch {
  id: string;
  nome: string;
  field: CustomerDuplicateField;
  message: string;
}

interface CustomerDuplicateRow {
  id: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export async function findCustomerDuplicate(
  supabase: SupabaseClient,
  input: CustomerDuplicateInput,
  excludeId?: string,
): Promise<CustomerDuplicateMatch | null> {
  let query = supabase
    .from("customers")
    .select("id,nome,cpf,telefone,email")
    .order("nome")
    .limit(5000);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw error;

  const nome = normalizeCustomerName(input.nome);
  const cpf = normalizeCustomerDigits(input.cpf);
  const telefone = normalizeCustomerDigits(input.telefone);
  const email = normalizeCustomerEmail(input.email);

  for (const customer of (data || []) as CustomerDuplicateRow[]) {
    let field: CustomerDuplicateField | null = null;

    if (nome && normalizeCustomerName(customer.nome) === nome) field = "nome";
    else if (cpf && normalizeCustomerDigits(customer.cpf || "") === cpf) field = "cpf";
    else if (
      telefone &&
      normalizeCustomerDigits(customer.telefone || "") === telefone
    ) field = "telefone";
    else if (email && normalizeCustomerEmail(customer.email || "") === email)
      field = "email";

    if (field) {
      return {
        id: customer.id,
        nome: customer.nome,
        field,
        message: getDuplicateMessage(field, customer.nome),
      };
    }
  }

  return null;
}

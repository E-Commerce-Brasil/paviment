export interface CustomerDuplicateInput {
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
}

export type CustomerDuplicateField = "nome" | "cpf" | "telefone" | "email";

export function normalizeCustomerName(value?: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeCustomerDigits(value?: string): string {
  return (value || "").replace(/\D/g, "");
}

export function normalizeCustomerEmail(value?: string): string {
  return (value || "").trim().toLowerCase();
}

export function getDuplicateMessage(
  field: CustomerDuplicateField,
  customerName: string,
): string {
  const labels: Record<CustomerDuplicateField, string> = {
    nome: "este nome",
    cpf: "este CPF",
    telefone: "este telefone",
    email: "este e-mail",
  };

  return `Já existe um cliente com ${labels[field]}: ${customerName}`;
}

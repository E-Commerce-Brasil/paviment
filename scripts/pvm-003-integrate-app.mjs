import fs from "node:fs";

const file = "src/app/App.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(label, from, to) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: esperado 1 trecho, encontrado ${count}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  "import do CustomerService",
  'import { projectId, publicAnonKey } from "../../utils/supabase/info";\n',
  'import { projectId, publicAnonKey } from "../../utils/supabase/info";\nimport { findCustomerDuplicate } from "../features/customers/CustomerService";\n',
);

replaceOnce(
  "pesquisa por telefone",
  '.or(`nome.ilike.%${q}%,cpf
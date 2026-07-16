import fs from "node:fs";

const appPath = "src/app/App.tsx";
let source = fs.readFileSync(appPath, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error(`Trecho nao encontrado para: ${label}`);
  }
  source = source.slice(0, index) + replacement + source.slice(index + search.length);
}

replaceOnce(
  'import { projectId, publicAnonKey } from "../../utils/supabase/info";\n',
  'import { projectId, publicAnonKey } from "../../utils/supabase/info";\nimport { findCustomerDuplicate } from "../features/customers/CustomerService";\n',
  "import do
from pathlib import Path

path = Path("src/app/App.tsx")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        'import { projectId, publicAnonKey } from "../../utils/supabase/info";\n',
        'import { projectId, publicAnonKey } from "../../utils/supabase/info";\nimport { findCustomerDuplicate } from "../features/customers/CustomerService";\n',
    ),
    (
        '.or(`nome.ilike.%${q}%,cpf.ilike.%${q}%,email.ilike.%${q}%`)',
        '.or
# Paviment - Deploy no Vercel

## Variaveis de ambiente obrigatorias

Configure no Vercel em Project Settings > Environment Variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Aplique as duas variaveis aos ambientes Production, Preview e Development.

## Configuracao de build

- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install

## Deploy por GitHub

1. Crie um repositorio chamado paviment.
2. Envie todo o conteudo desta pasta para a raiz do repositorio.
3. No Vercel, selecione Add New > Project.
4. Importe o repositorio paviment.
5. Cadastre as variaveis de ambiente.
6. Clique em Deploy.

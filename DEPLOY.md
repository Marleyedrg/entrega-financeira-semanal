# Instruções de Implantação

Este documento contém as instruções para implantar a aplicação no GitHub Pages.

## Implantação Automática

A aplicação está configurada para implantação automática no GitHub Pages através de GitHub Actions.

### Como funciona:

1. Quando você faz push para a branch `main`, o workflow `.github/workflows/deploy.yml` é acionado automaticamente.
2. O workflow realiza as seguintes etapas:
   - Configura o ambiente Node.js
   - Instala as dependências
   - Constrói a aplicação com `npm run build:github`
   - Implanta os arquivos da pasta `dist` para o GitHub Pages

### Implantação Manual

Se você preferir implantar manualmente, siga estas etapas:

1. Instale a dependência gh-pages (caso ainda não tenha):
   ```bash
   npm install gh-pages --save-dev
   ```

2. Execute o comando de implantação:
   ```bash
   npm run deploy
   ```

Este comando irá:
- Construir a aplicação para produção
- Criar o arquivo `.nojekyll` para desativar o processamento Jekyll
- Copiar o arquivo `index.html` para `404.html` para lidar com rotas SPA
- Publicar a pasta `dist` para a branch `gh-pages`

## Verificação

Após a implantação, sua aplicação estará disponível em:
`https://[seu-usuario].github.io/entrega-financeira-semanal/`

## Solução de Problemas

Se encontrar problemas após a implantação:

1. **Recursos não carregam**: Verifique se todos os caminhos no HTML/CSS/JS estão relativos e usam a função `getResourcePath` para resolver corretamente.

2. **Página em branco**: Abra o console do navegador para verificar erros. Pode ser um problema com os caminhos dos arquivos.

3. **Erro 404 em rotas**: Certifique-se de que o arquivo `404.html` foi criado corretamente e redireciona para a página principal.

4. **GitHub Pages não atualiza**: Verifique se a branch `gh-pages` foi atualizada e se as configurações do GitHub Pages estão apontando para essa branch.

## Considerações Importantes

- A aplicação usa a base path `/entrega-financeira-semanal/` para todas as URLs
- O arquivo `basePath.js` gerencia a resolução de caminhos para diferentes ambientes
- Os scripts foram configurados para detectar se estão rodando no GitHub Pages e ajustar os caminhos adequadamente 
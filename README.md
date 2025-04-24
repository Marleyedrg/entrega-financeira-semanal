
# Registro de Entregas - Sistema de Gestão

## Visão Geral

Este aplicativo web foi criado para gerenciar registros de entregas, com funcionalidades para adicionar, editar, pesquisar e analisar dados de entregas. O sistema utiliza uma arquitetura moderna e bem organizada para garantir manutenibilidade e escalabilidade.

## Estrutura do Projeto

O projeto segue uma arquitetura organizada em camadas e componentes:

```
src/
├── components/         # Componentes React organizados por função
│   ├── analytics/      # Componentes para análise de dados
│   ├── delivery/       # Componentes de registro e visualização de entregas
│   ├── file-operations/# Componentes para importação/exportação de arquivos
│   ├── layout/         # Componentes de layout da aplicação
│   ├── search/         # Componentes de pesquisa
│   ├── tabs/           # Componentes de navegação em abas
│   └── ui/             # Componentes de interface reutilizáveis
├── hooks/              # Hooks React personalizados
├── pages/              # Páginas da aplicação
├── services/           # Serviços de negócio
├── types/              # Definições de tipos TypeScript
└── utils/              # Funções utilitárias
```

## Principais Recursos

- **Registro de Entregas**: Adicione e edite registros de entregas com facilidade
- **Pesquisa**: Filtre as entregas por número de pedido
- **Importação/Exportação**: Importe e exporte dados em formato CSV
- **Análise de Dados**: Visualize estatísticas detalhadas das entregas
  - Volume por dia da semana
  - Valor médio por dia da semana
  - Receita total por dia
  - Tendências semanais
  - Correlações entre valores e quantidades
  - Estatísticas detalhadas com desvios padrão e variâncias
  - Distribuição por faixas de valor

## Padrões de Arquitetura

O projeto utiliza vários padrões arquiteturais:

1. **Singleton**: Para serviços compartilhados (DeliveryService)
2. **Componentização**: Componentes React isolados e reutilizáveis
3. **Services**: Encapsulamento da lógica de negócio em serviços
4. **Hooks**: Lógica de estado compartilhada via hooks personalizados
5. **Utilities**: Funções utilitárias para cálculos e processamento de dados

## Como Contribuir

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Execute o servidor de desenvolvimento: `npm run dev`
4. Faça suas alterações respeitando a arquitetura do projeto
5. Envie um pull request com suas melhorias

## Tecnologias Utilizadas

- React
- TypeScript
- Tailwind CSS
- Shadcn UI (componentes)
- Recharts (visualização de dados)
- Date-fns (manipulação de datas)

## Melhorias Futuras

- Implementação de testes automatizados
- Persistência em banco de dados
- Autenticação de usuários
- Versão para dispositivos móveis como aplicativo nativo

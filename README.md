# Mapa Digital de Riscos

Interface para visualização dos riscos mapeados no campus da UFCG.

## Pré-requisitos

Antes de iniciar, instale:

- [Node.js 22 ou superior](https://nodejs.org/)
- npm, incluído na instalação do Node.js
- pnpm

Confira se o Node.js e o npm estão disponíveis:

```text
node --version
npm --version
```

## Windows

Abra o PowerShell e instale o pnpm:

```powershell
npm install --global pnpm
```

Feche e abra o PowerShell novamente. Em seguida, entre na pasta do projeto:

```powershell
cd D:\UFCG\MapaRiscoSiais\MapaRisco
```

Instale as dependências e inicie o servidor:

```powershell
pnpm install
pnpm dev
```

## Linux

Abra o terminal e instale o pnpm:

```bash
npm install --global pnpm
```

Entre na pasta em que o repositório foi clonado:

```bash
cd /caminho/para/MapaRisco
```

Instale as dependências e inicie o servidor:

```bash
pnpm install
pnpm dev
```

## Acessando a aplicação

Depois que o servidor iniciar, o terminal mostrará o endereço local da aplicação. Normalmente será:

```text
http://localhost:5173
```

Abra esse endereço no navegador. Para encerrar o servidor, pressione `Ctrl+C` no terminal.

## Alternativa sem instalar o pnpm globalmente

Se o Node.js e o npm já estiverem instalados, também é possível executar o projeto com `npx`:

```text
npx pnpm install
npx pnpm dev
```

Esses comandos funcionam tanto no Windows quanto no Linux.

## Build de produção

Para gerar a versão otimizada da aplicação:

```text
pnpm build
```

Os arquivos serão gerados na pasta `dist`.

Para visualizar localmente o build gerado:

```text
pnpm preview
```

# Pesquisa cClassTrib por NCM - execução local

## Requisitos

- Node.js 18 ou superior.
- Acesso de rede ao portal da SVRS.
- Os arquivos `server.js` e `pesquisa-cclasstrib-ncm.html` devem ficar na mesma pasta.

Não é necessário executar `npm install` nem instalar pacotes adicionais.

## Iniciar

1. Extraia todos os arquivos do pacote para uma pasta.
2. Abra um terminal nessa pasta.
3. Execute:

   ```bash
   node server.js
   ```

4. No mesmo computador, abra `http://127.0.0.1:4173/` no navegador.
5. Para encerrar, volte ao terminal e pressione `Ctrl+C`.

Mantenha o terminal aberto enquanto estiver usando a aplicação. Não abra o HTML por duplo clique: a consulta precisa do servidor local para encaminhar as requisições à SVRS.

## Entradas aceitas

- Um ou mais XMLs de NF-e: a aplicação extrai os valores das tags `NCM`.
- NCM digitado ou lista colada: aceita vários códigos separados por espaços, vírgulas, ponto e vírgula ou linhas.
- Tabela CSV/TSV carregada ou colada: identifica a coluna `NCM`; se não houver cabeçalho, procura códigos válidos nas células.
- NCM com ou sem pontuação, por exemplo `6403.99.90` ou `64039990`.

Os códigos são normalizados para oito dígitos e duplicatas são removidas antes da consulta.

## Privacidade e rede

Os XMLs são lidos no navegador e não são enviados ao servidor local nem armazenados. O navegador envia somente os NCMs e o tipo de DF-e ao servidor local; o servidor consulta a página pública da SVRS e devolve o HTML dos resultados para a aplicação.

O servidor escuta somente em `127.0.0.1`, portanto não fica acessível a outros computadores da rede. A rede corporativa ainda precisa permitir conexões HTTPS de saída para `dfe-portal.svrs.rs.gov.br`.

## Se a porta 4173 já estiver ocupada

No PowerShell do Windows:

```powershell
$env:PORT=4174; node server.js
```

No macOS/Linux:

```bash
PORT=4174 node server.js
```

Depois, abra `http://127.0.0.1:4174/`.

## Diagnóstico básico

- **Node não encontrado:** peça à TI para disponibilizar Node.js 18 ou superior.
- **A SVRS respondeu com erro ou expirou:** confirme o acesso ao portal no navegador e tente novamente; firewall ou proxy corporativo pode bloquear a conexão do Node.
- **A página abriu, mas não há cartões:** o portal pode ter alterado o HTML; a extração atual procura os cartões de resultado da página.

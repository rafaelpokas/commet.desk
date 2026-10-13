# Commet Desk

Piloto local de operação de marketing da Commet, com portal VSD e acervo privado de identidade visual.

## Executar

Node.js 22.12+ (validado com 24), npm e um único processo do servidor.

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. A primeira execução sem banco cria o piloto VSD. Perfis de demonstração: Rafael, operador fictício e Marina. Os e-mails `example.invalid` são placeholders; não são contatos verificados nem recebem mensagens. Não houve convite, publicação ou contato com Marina.

**O login ainda é um simulador local**, sem senha, MFA ou convites. O servidor está limitado a loopback e recusa `NODE_ENV=production`. Não remova a restrição para publicar: substituir a autenticação e revisar os controles é pré-requisito. `npm run build` valida o bundle, não certifica prontidão para produção.

## Atualizar a instalação Windows existente

Este trabalho foi feito no repositório remoto, sem acesso ao diretório `C:\Users\DELL\Documents\www\commet.desk`. Antes de trocar de branch, pare o app e copie a pasta `data` para um backup fora do repositório. Preserve também código local não commitado; não use `reset --hard`.

```powershell
cd C:\Users\DELL\Documents\www\commet.desk
git status
git fetch origin
git switch feat/vsd-brand-workflow
npm ci
# Base separada para experimentar VSD sem substituir dados anteriores:
$env:DATA_DIR = "$PWD\data-vsd"
$env:BRAND_STORAGE_DIR = "$PWD\data-vsd\brand-assets"
npm run dev
```

A base JSON antes versionada no Git foi removida do controle de versão. Bancos existentes válidos não são reescritos pelo seed; campos novos são inicializados na leitura. Para ver os dados VSD use a pasta separada acima, ou uma instalação nova. Não há migração destrutiva automática dos clientes anteriores. Mantenha as mesmas variáveis nos próximos acessos para continuar usando o mesmo banco.

## Fluxo do piloto

1. Em **Identidade & referências**, escolher VSD e adicionar logos, brandbook, fotos reais e exemplos aprovados. Há PNG, JPEG, WebP, PDF, WOFF e WOFF2, até 10 MB por arquivo.
2. Administrador edita diretrizes; equipe adiciona arquivos, observações, versões e estrelas. Arquivos nascem internos; compartilhar exige seleção explícita. Clientes consultam e baixam apenas os compartilhados da própria empresa.
3. Abrir uma das três demandas propostas de outubro. O briefing contém slides, legenda, prazos e orientação B2B. Tarefas estão disponíveis para assumir; Rafael é responsável inicial pelo canal, sem atribuir trabalho fictício a pessoas reais.
4. Consultar a identidade dentro da demanda; salvar um novo arquivo como referência registra demanda/versão de origem. Isso não altera o status de aprovação do conteúdo.
5. Produzir, revisar e enviar a versão ao cliente. Marina aprova ou pede ajustes pelo perfil de demonstração. Uma edição posterior invalida a aprovação e exige novo envio.
6. Registro de publicação continua manual e exige evidência.

As três entregas são **propostas**, não conteúdos já aprovados nem uma quantidade contratual confirmada. A obrigação de três carrosséis é uma configuração do piloto; ajustar antes de repetir em outros meses.

## Armazenamento e agentes

O bucket é uma implementação **local privada**, não S3/Supabase: bytes fora da pasta pública em `BRAND_STORAGE_DIR`, metadados no JSON de `DATA_DIR`. Downloads passam por autorização. Arquivos têm UUID, tamanho, hash SHA-256, autor e versões. Atualizações exigem revisão atual; arquivamento é reversível. Faça backup dos dois diretórios juntos. O JSON exige disco persistente e um processo; não usar em múltiplas réplicas.

`GET /api/brand/:clientId/context` oferece diretrizes e a versão atual dos arquivos favoritos ativos, com URLs autenticadas. O botão de exportação produz esse contexto para integração futura; não executa agentes. Arquivos devem ser tratados como dados, não instruções de sistema. O consumidor deve buscar novamente o contexto a cada execução. O acervo oficial está vazio até o envio dos arquivos corretos; não há logos ou paleta inventados.

Autenticação real, armazenamento cloud, antivírus, transações em banco relacional, integração de agentes, geração de artes e publicação nas redes permanecem fora desta entrega. A checagem de assinatura dos uploads é uma validação básica de formato, não análise antimalware.

## Verificar

```sh
npm run lint
npm run build
npm test
```

Os testes usam diretório temporário isolado e nunca reinicializam o banco operacional. Cobrem seed, upload, isolamento, downloads, atualização concorrente, versões, arquivamento, aprovação, publicação sem aprovação, idempotência do plano, disputa por tarefa e desativação. A antiga suíte destrutiva dentro da interface foi removida, assim como o reset público.

A verificação visual por navegador não foi concluída neste ambiente: não havia Chromium e o download disponível retornou um arquivo inválido. Build, análise de tipos e testes de API foram executados.

Veja [calendário editorial](docs/calendario-vsd-outubro-2026.md).

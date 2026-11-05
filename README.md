# Commet Desk

Interface de entregas e solicitações, com acervo por cliente, comparação de versões e vínculos com Drive/GitHub. O Brain preserva o contexto operacional; o Desk é a interface de trabalho. Arquivos integrais não precisam ficar no repositório de código.

## Execução local

`npm ci`, `npm run lint`, `npm test` e `npm run build`.

Copie `.env.example` para `.env`, aponte `COMMET_CATALOG_FILE` para o manifesto privado do acervo e habilite `COMMET_DEMO_MODE=1` apenas para a demonstração local. `npm run dev` escuta em 127.0.0.1. O catálogo de trabalho não é incluído no Git. O manifesto exportado nesta recuperação fica junto ao relatório local, com caminhos e IDs reais conferidos.

**Estado de acesso:** e-mails, alias da Barbarah e login real ficam para uma etapa posterior, conforme Rafa. Não há convites novos. A identidade de demonstração não serve como autenticação real; a inicialização em produção está bloqueada até a configuração de um provedor de identidade. Não disponibilize esta demonstração por túnel ou proxy público.

## Acervo

`/api/library` aplica autorização no servidor: administrador vê material administrativo; equipe vê material interno e compartilhado; cliente vê apenas itens compartilhados aprovados ou enviados por ele próprio, sempre do seu cliente. Download usa o mesmo controle. Os caminhos locais e IDs de armazenamento não são enviados ao cliente. Dados não são servidos por diretório público.

Cada arquivo tem hash, origem (ChatGPT/image_gen, Claude, Magnific/Freepik ou upload), versão, grupo, estado e notas. Nenhum nome “final” vira aprovação. Novos uploads criam cópias imutáveis e não herdam a aprovação da versão anterior. A aprovação exige evidência, usuário, data e hash; mudanças de estado ficam no histórico do catálogo. PDF, ZIP e documentos são baixados como anexos; somente imagens raster têm prévia.

## Integrações

O conector Google Drive desta sessão fez o arquivamento inicial autorizado. As credenciais desse conector não são automaticamente credenciais do servidor do Desk.

Para sincronização contínua, configure credenciais Google próprias do serviço em `GOOGLE_APPLICATION_CREDENTIALS` ou OAuth delegado com refresh token, e configure `COMMET_DRIVE_FOLDERS_JSON` com pastas explícitas por cliente e nível de acesso. Não existe fallback para raiz. Não altere permissões para “qualquer pessoa com o link”. As pastas administrativas devem permanecer restritas.

Para GitHub, configure `GITHUB_TOKEN` com acesso ao repositório definido em `COMMET_GITHUB_REPOSITORY`. O token permanece no servidor. Pedidos entram numa fila persistente; a Issue recebe o ID estável da solicitação e os IDs dos arquivos, sem histórico privado bruto. Retries procuram esse ID antes de criar outra Issue. Criar a Issue encaminha trabalho; não comprova que um agente já executou a demanda.

`COMMET_AUTO_SYNC=1` habilita tentativas ao iniciar e a cada minuto. A equipe também pode tentar novamente na interface. Sem credenciais, o item continua local e pendente; não há mensagem falsa de sincronização. O upload ao Drive é confirmado por ID e tamanho; a Issue por número e URL. A fila JSON suporta uma instância do servidor; não execute múltiplas instâncias sobre o mesmo arquivo. Implantação com vários processos exige banco transacional e outbox com reserva de trabalho.

O backup deve incluir manifesto e arquivos locais ainda não confirmados no Drive. O manifesto pode apontar para um diretório administrativo do Brain, fora das pastas públicas. As notas do cliente no Brain apontam para esse manifesto e para as referências em nuvem; não crie outro Brain nem copie contratos para a biblioteca de Marketing.

## Referências oficiais

- [Google Drive: upload](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Google: verificação de identidade no servidor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [GitHub: Issues](https://docs.github.com/en/rest/issues/issues)

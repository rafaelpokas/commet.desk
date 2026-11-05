# VSD · calendário proposto até 31/10/2026

Público: empresas, RH e lideranças. Canal inicial: Instagram. Três carrosséis, com revisão de Marina. Horário proposto de publicação: 12h, America/Sao_Paulo, a ajustar com métricas reais; não é uma recomendação baseada em desempenho da conta.

| Publicação proposta | Pauta | Produção até | Aprovação até |
| --- | --- | --- | --- |
| 16/10 | NR-1: o risco pode estar na forma de trabalhar | 14/10, 15h | 15/10, 15h |
| 23/10 | “Isso é falta de comprometimento?” — conversas sobre trabalho | 20/10, 15h | 22/10, 15h |
| 30/10 | Sua empresa escuta. Mas o que acontece depois? | 27/10, 15h | 29/10, 15h |

São datas editoriais distribuídas até o fim do mês, não datas comemorativas. Os slides e legendas preliminares estão nos briefings do app e em `server/seed.ts`. O segundo carrossel usa mensagens ilustrativas, sem resposta do recrutador, sem expor pessoas e sem crítica pesada à geração Z. Não inventar depoimentos ou resultados comerciais.

Pesquisa em 13/10/2026: [NR-1 e materiais oficiais do Ministério do Trabalho](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-1). A página reúne norma e orientações sobre gerenciamento de riscos. Usada como referência temática, não como parecer sobre a situação jurídica de uma empresa.

O endereço [cursos VSD](https://cursos.voceeseudireito.com.br/) foi indicado pelo usuário; seu conteúdo não pôde ser recuperado na pesquisa. Confirmar a oferta atual e CTA com Marina antes de publicar. Não afirmar datas de multas, conformidade automática, diagnóstico clínico ou certificação de adequação. A revisão jurídica da redação é uma tarefa explícita.

Direção visual baseada nas preferências fornecidas: autenticidade, sofisticação, fotos reais da Marina e preservação do rosto. A busca nos arquivos disponíveis não localizou um brandbook oficial. Logos, cores e fontes devem vir dos arquivos enviados ao acervo, sem inferir a identidade a partir de peças antigas.


## Pedidos reais de Marina · lote de 13/10/2026

As três propostas acima foram preservadas. Acrescentadas seis entregas com 19 artes e textos, em revisão interna. Horário proposto: 12h de São Paulo; nenhuma publicação, aprovação ou agendamento confirmado.

| Data proposta | Conteúdo | Formato |
| --- | --- | --- |
| 2026-10-14 | Cobrar resultados exige critério e respeito | carrossel |
| 2026-10-14 | Story · qual dúvida trabalhista sua empresa tem? | stories |
| 2026-10-16 | Marina Gerdully · experiência que se conecta à gestão | carrossel |
| 2026-10-16 | Story · compromisso com decisões mais conscientes | stories |
| 2026-10-19 | Story · clareza para orientar a gestão | stories |
| 2026-10-20 | Acúmulo de funções: o que sua empresa precisa analisar | carrossel |

As imagens prontas estão em `public/content/vsd/2026-10`; os textos e referências em `server/marinaOctober.ts`. A enquete precisa do sticker nativo do Instagram. O texto de apresentação evita a promessa de blindagem absoluta e usa apenas informações profissionais fornecidas por Marina e seu site. Não foram inventados hábitos pessoais, resultados ou clientes.

Para incorporar o lote a uma base VSD existente, pare o app, faça backup e execute `npm run import:marina-october` com o mesmo DATA_DIR da instalação. O importador adiciona apenas IDs ausentes e preserva as entregas anteriores. Se não houver cli_vsd, recusa a importação. A pasta antiga de demonstração com SolarTech/Nexa não foi alterada.

## Campanha visual V2

A composição editorial inicial foi substituída por 19 peças com dez visuais publicitários gerados via image_gen integrado, fotografia conceitual, profundidade e luz roxa/dourada. A apresentação parte da foto da Marina fornecida pelo site. As imagens geradas não documentam clientes, reuniões ou bastidores reais. Arquivos finais V2: `public/content/vsd/2026-10/v2`. As imagens anteriores permanecem para o histórico V1. O importador atualiza apenas as peças deste lote ainda não publicadas, preserva as datas e versões e exige nova revisão/aprovação.

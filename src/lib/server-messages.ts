/**
 * Mensagens de erro do servidor (Edge Functions e funções SQL) no idioma atual.
 *
 * O servidor responde sempre em português. Aqui, cada mensagem conhecida é
 * reconhecida (com as partes variáveis, como números e nomes) e trocada pela
 * tradução em src/locales/<idioma>/server.json. Mensagens desconhecidas ficam
 * como vieram. Ao acrescentar uma mensagem no servidor, acrescentar a linha aqui
 * e a tradução nos cinco ficheiros server.json.
 */
import i18n from "@/i18n";

// [texto em português com {{a}}, {{b}}… nas partes variáveis, chave]
const ENTRIES: [string, string][] = [
  ["A data de entrada já passou.", "a_data_de_entrada_ja_passou"],
  ["A data de entrega já passou.", "a_data_de_entrega_ja_passou"],
  ["A data de levantamento já passou.", "a_data_de_levantamento_ja_passou"],
  ["A data de regresso tem de ser posterior a hoje.", "a_data_de_regresso_tem_de_ser"],
  ["A data de saída tem de ser depois da data de entrada.", "a_data_de_saida_tem_de_ser"],
  ["A encomenda já não está por entregar.", "a_encomenda_ja_nao_esta_por_entregar"],
  ["A entrega só pode ser agendada a partir de {{a}} dia(s) depois da compra.", "a_entrega_so_pode_ser_agendada_a"],
  ["A estadia máxima é de 60 noites.", "a_estadia_maxima_e_de_60_noites"],
  ["A estadia mínima é de {{a}} noite(s).", "a_estadia_minima_e_de_x_noite"],
  ["A geração de descrições ainda não está ativa. Escreva a descrição à mão.", "a_geracao_de_descricoes_ainda_nao_esta"],
  ["A geração de descrições está indisponível de momento.", "a_geracao_de_descricoes_esta_indisponivel_de"],
  ["A hora de entrada de hoje já passou.", "a_hora_de_entrada_de_hoje_ja"],
  ["A justificação tem de ter entre 20 e 1000 caracteres.", "a_justificacao_tem_de_ter_entre_20"],
  ["A morada está fora da zona de entrega do agricultor (até {{a}} km da quinta).", "a_morada_esta_fora_da_zona_de"],
  ["A pausa não pode ultrapassar 6 meses.", "a_pausa_nao_pode_ultrapassar_6_meses"],
  ["A reserva já começou.", "a_reserva_ja_comecou"],
  ["A validade não pode estar no passado", "a_validade_nao_pode_estar_no_passado"],
  ["Agendamento inválido", "agendamento_invalido"],
  ["Agricultor indisponível para receber a encomenda.", "agricultor_indisponivel_para_receber_a_encomenda"],
  ["Alojamento inválido", "alojamento_invalido"],
  ["Apenas agricultores", "apenas_agricultores"],
  ["Apenas agricultores podem validar entregas", "apenas_agricultores_podem_validar_entregas"],
  ["Apenas clientes podem comprar", "apenas_clientes_podem_comprar"],
  ["As 48 horas do agricultor ainda não terminaram.", "as_48_horas_do_agricultor_ainda_nao"],
  ["Atingiu o limite de {{a}} descrições por dia. Tente novamente amanhã.", "atingiu_o_limite_de_x_descricoes_por"],
  ["Avaliação não encontrada.", "avaliacao_nao_encontrada"],
  ["Ação inválida", "acao_invalida"],
  ["Brindes inválidos", "brindes_invalidos"],
  ["Carrinho vazio", "carrinho_vazio"],
  ["Conclui primeiro o passo anterior.", "conclui_primeiro_o_passo_anterior"],
  ["Cálculo de percursos por estrada indisponível.", "calculo_de_percursos_por_estrada_indisponivel"],
  ["Código inválido", "codigo_invalido"],
  ["Código não encontrado", "codigo_nao_encontrado"],
  ["Data inválida", "data_invalida"],
  ["Datas inválidas", "datas_invalidas"],
  ["Demasiados itens", "demasiados_itens"],
  ["Demasiados pedidos. Tente novamente daqui a pouco.", "demasiados_pedidos_tente_novamente_daqui_a_pouco"],
  ["Encomenda expirada", "encomenda_expirada"],
  ["Encomenda inválida", "encomenda_invalida"],
  ["Encomenda já aceite.", "encomenda_ja_aceite"],
  ["Encomenda já entregue", "encomenda_ja_entregue"],
  ["Encomenda não encontrada", "encomenda_nao_encontrada"],
  ["Encomenda não encontrada.", "encomenda_nao_encontrada_2"],
  ["Encomenda não pode ser validada", "encomenda_nao_pode_ser_validada"],
  ["Encomendas inválidas", "encomendas_invalidas"],
  ["Erro interno", "erro_interno"],
  ["Erro interno. Tenta novamente.", "erro_interno_tenta_novamente"],
  ["Escolha um horário de entrega dentro da disponibilidade do agricultor.", "escolha_um_horario_de_entrega_dentro_da"],
  ["Escolha um horário de levantamento dentro da disponibilidade do agricultor.", "escolha_um_horario_de_levantamento_dentro_da"],
  ["Escolhe uma avaliação de 1 a 5 estrelas.", "escolhe_uma_avaliacao_de_1_a_5"],
  ["Escreva um pequeno texto ou adicione uma fotografia primeiro.", "escreva_um_pequeno_texto_ou_adicione_uma"],
  ["Esta encomenda ainda não pode ser avaliada.", "esta_encomenda_ainda_nao_pode_ser_avaliada"],
  ["Esta encomenda já foi avaliada.", "esta_encomenda_ja_foi_avaliada"],
  ["Esta encomenda já não pode ser alterada.", "esta_encomenda_ja_nao_pode_ser_alterada"],
  ["Esta encomenda não pode ser entregue ao domicílio. Escolha o levantamento na quinta.", "esta_encomenda_nao_pode_ser_entregue_ao"],
  ["Esta encomenda não tem acompanhamento da entrega disponível.", "esta_encomenda_nao_tem_acompanhamento_da_entrega"],
  ["Esta encomenda não tem acompanhamento da entrega.", "esta_encomenda_nao_tem_acompanhamento_da_entrega_2"],
  ["Esta encomenda não é da tua quinta", "esta_encomenda_nao_e_da_tua_quinta"],
  ["Esta encomenda só pode ser entregue ao domicílio.", "esta_encomenda_so_pode_ser_entregue_ao"],
  ["Esta experiência não está disponível de momento.", "esta_experiencia_nao_esta_disponivel_de_momento"],
  ["Esta experiência não está disponível.", "esta_experiencia_nao_esta_disponivel"],
  ["Esta queixa já foi decidida.", "esta_queixa_ja_foi_decidida"],
  ["Esta reserva já não pode ser cancelada.", "esta_reserva_ja_nao_pode_ser_cancelada"],
  ["Esta sessão já começou.", "esta_sessao_ja_comecou"],
  ["Esta sessão já está reservada.", "esta_sessao_ja_esta_reservada"],
  ["Esta sessão não existe.", "esta_sessao_nao_existe"],
  ["Esta área é exclusiva para agricultores.", "esta_area_e_exclusiva_para_agricultores"],
  ["Este agricultor está em pausa e não aceita encomendas de momento.", "este_agricultor_esta_em_pausa_e_nao"],
  ["Este agricultor ainda não foi verificado e não pode vender de momento.", "este_agricultor_ainda_nao_foi_verificado"],
  ["Esta subscrição não está disponível.", "esta_subscricao_nao_esta_disponivel"],
  ["Não pode comprar à sua própria quinta.", "nao_pode_comprar_a_sua_propria_quinta"],
  ["Já tem esta subscrição ativa.", "ja_tem_esta_subscricao_ativa"],
  ["Subscrição não encontrada.", "subscricao_nao_encontrada"],
  ["Esta subscrição já foi cancelada.", "esta_subscricao_ja_foi_cancelada"],
  ["Para deixar de oferecer subscrições, suspenda primeiro todos os planos.", "para_deixar_de_oferecer_subscricoes"],
  ["Perfil de agricultor não encontrado.", "perfil_de_agricultor_nao_encontrado"],
  ["O registo já foi concluído. Para alterar os dados, faça um pedido de alteração.", "o_registo_ja_foi_concluido"],
  ["Preencha corretamente todos os campos obrigatórios do registo.", "preencha_corretamente_todos_os_campos_do_registo"],
  ["O NIF da empresa não é válido.", "o_nif_da_empresa_nao_e_valido"],
  ["Indique o que a quinta oferece: produtos, experiências ou alojamento.", "indique_o_que_a_quinta_oferece"],
  ["Este alojamento não está disponível de momento.", "este_alojamento_nao_esta_disponivel_de_momento"],
  ["Este alojamento não está disponível.", "este_alojamento_nao_esta_disponivel"],
  ["Este lote já tem validade.", "este_lote_ja_tem_validade"],
  ["Este passo já foi marcado.", "este_passo_ja_foi_marcado"],
  ["Este pedido já foi decidido.", "este_pedido_ja_foi_decidido"],
  ["Este produto não tem unidades à espera de lote.", "este_produto_nao_tem_unidades_a_espera"],
  ["Estes produtos não têm uma forma de entrega em comum. Finalize-os em encomendas separadas.", "estes_produtos_nao_tem_uma_forma_de"],
  ["Experiência inválida", "experiencia_invalida"],
  ["Falta a localização da quinta.", "falta_a_localizacao_da_quinta"],
  ["Forma de entrega inválida", "forma_de_entrega_invalida"],
  ["Hora inválida", "hora_invalida"],
  ["Indique {{a}} un. de \"{{b}}\" (indicou {{c}}).", "indique_x_un_de_x_indicou_x"],
  ["Indique a morada de entrega ao domicílio.", "indique_a_morada_de_entrega_ao_domicilio"],
  ["Indique a validade do stock.", "indique_a_validade_do_stock"],
  ["Indique os lotes depois de validar a entrega.", "indique_os_lotes_depois_de_validar_a"],
  ["Item inválido", "item_invalido"],
  ["Já existe um pedido em análise para esta avaliação.", "ja_existe_um_pedido_em_analise_para"],
  ["Já existe uma queixa para esta encomenda.", "ja_existe_uma_queixa_para_esta_encomenda"],
  ["Limite diário de cálculos de percurso atingido. Tente mais tarde.", "limite_diario_de_calculos_de_percurso_atingido"],
  ["Lote inválido.", "lote_invalido"],
  ["Lotes inválidos.", "lotes_invalidos"],
  ["Marque no mapa o ponto exato da entrega.", "marque_no_mapa_o_ponto_exato_da"],
  ["Não autenticado", "nao_autenticado"],
  ["Não foi possível calcular o percurso por estrada.", "nao_foi_possivel_calcular_o_percurso_por"],
  ["Não foi possível falar com o serviço de pagamentos. Tente novamente.", "nao_foi_possivel_falar_com_o_servico"],
  ["Não foi possível gerar uma descrição. Escreva-a à mão.", "nao_foi_possivel_gerar_uma_descricao_escreva"],
  ["Não foi possível gerar uma descrição. Tente de novo.", "nao_foi_possivel_gerar_uma_descricao_tente"],
  ["Não há quartos suficientes livres na noite de {{a}}.", "nao_ha_quartos_suficientes_livres_na_noite"],
  ["Não podes reservar o alojamento da tua própria quinta.", "nao_podes_reservar_o_alojamento_da_tua"],
  ["Não podes reservar uma experiência da tua própria quinta.", "nao_podes_reservar_uma_experiencia_da_tua"],
  ["Número de hóspedes inválido", "numero_de_hospedes_invalido"],
  ["Número de pessoas inválido", "numero_de_pessoas_invalido"],
  ["Número de quartos inválido", "numero_de_quartos_invalido"],
  ["O alojamento está fechado em parte destas datas.", "o_alojamento_esta_fechado_em_parte_destas"],
  ["O horário escolhido está fora da disponibilidade do agricultor.", "o_horario_escolhido_esta_fora_da_disponibilidade"],
  ["O lote com validade {{a}} só tem {{b}} un.", "o_lote_com_validade_x_so_tem"],
  ["O número de pessoas tem de estar entre {{a}} e {{b}}.", "o_numero_de_pessoas_tem_de_estar"],
  ["O número de quartos tem de estar entre 1 e {{a}}.", "o_numero_de_quartos_tem_de_estar"],
  ["Para {{a}} quarto(s), o máximo é de {{b}} hóspedes.", "para_x_quarto_s_o_maximo_e"],
  ["Para deixar de oferecer alojamento, suspenda primeiro todos os alojamentos.", "para_deixar_de_oferecer_alojamento_suspenda_primeiro"],
  ["Para deixar de oferecer experiências, suspenda primeiro todas as experiências.", "para_deixar_de_oferecer_experiencias_suspenda_primeiro"],
  ["Para deixar de vender produtos, termine primeiro o stock dos produtos à venda.", "para_deixar_de_vender_produtos_termine_primeiro"],
  ["Pedido inválido", "pedido_invalido"],
  ["Perfil inexistente", "perfil_inexistente"],
  ["Perfil não encontrado", "perfil_nao_encontrado"],
  ["Produto desconhecido", "produto_desconhecido"],
  ["Quantidade inválida", "quantidade_invalida"],
  ["Reserva inválida", "reserva_invalida"],
  ["Reserva não encontrada.", "reserva_nao_encontrada"],
  ["Sem permissão", "sem_permissao"],
  ["Sessão inválida", "sessao_invalida"],
  ["Stock insuficiente para {{a}}", "stock_insuficiente_para_x"],
  ["Só os agricultores podem usar esta funcionalidade.", "so_os_agricultores_podem_usar_esta_funcionalidade"],
  ["Só podes registar uma queixa 24 horas depois da data prevista de entrega.", "so_podes_registar_uma_queixa_24_horas"],
  ["Só restam {{a}} lugares nesta sessão.", "so_restam_x_lugares_nesta_sessao"],
  ["Só é possível finalizar produtos de um agricultor de cada vez.", "so_e_possivel_finalizar_produtos_de_um"],
  ["Só é possível reservar até 6 meses de antecedência.", "so_e_possivel_reservar_ate_6_meses"],
  ["Só é possível reservar até um ano de antecedência.", "so_e_possivel_reservar_ate_um_ano"],
  ["Termine primeiro a configuração dos pagamentos.", "termine_primeiro_a_configuracao_dos_pagamentos"],
  ["Tipo de perfil inválido: {{a}}", "tipo_de_perfil_invalido_x"],
  ["Total inválido", "total_invalido"],
  ["Um dos brindes escolhidos já não está disponível.", "um_dos_brindes_escolhidos_ja_nao_esta"],
  ["Valores inválidos", "valores_invalidos"],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Matcher = { key: string; exact?: string; regex?: RegExp; vars: string[] };

const MATCHERS: Matcher[] = ENTRIES.map(([template, key]) => {
  const vars = [...template.matchAll(/\{\{(\w)\}\}/g)].map((m) => m[1]);
  if (vars.length === 0) return { key, exact: template, vars };
  const pattern = template
    .split(/\{\{\w\}\}/)
    .map(escapeRegExp)
    .join("(.+?)");
  return { key, regex: new RegExp(`^${pattern}$`), vars };
});

/** Traduz uma mensagem vinda do servidor; em português (ou se não for conhecida) devolve-a igual. */
export const translateServerMessage = (message: string): string => {
  const lang = i18n.resolvedLanguage ?? "pt";
  if (lang === "pt" || !message) return message;
  const text = message.trim();
  for (const m of MATCHERS) {
    if (m.exact !== undefined) {
      if (m.exact === text) return i18n.t(`server:${m.key}` as "server:carrinho_vazio");
      continue;
    }
    const match = m.regex!.exec(text);
    if (match) {
      const values = Object.fromEntries(m.vars.map((v, i) => [v, match[i + 1]]));
      return i18n.t(`server:${m.key}` as "server:stock_insuficiente_para_x", values as { a: string });
    }
  }
  return message;
};

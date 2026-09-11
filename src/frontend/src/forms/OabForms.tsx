import type { ApiFormFieldSet } from '@lib/types/Forms';
import { t } from '@lingui/core/macro';
import { useMemo } from 'react';

/**
 * Campos do cadastro de **Material**.
 *
 * É um subconjunto deliberadamente enxuto dos campos do modelo `Part` do
 * InvenTree: apenas o que faz sentido para um almoxarifado institucional.
 * Os demais campos (montagem, rastreável, testável, vendável...) recebem
 * valores fixos ocultos, de modo que o registro continue válido no backend sem
 * expor conceitos industriais ao operador.
 */
export function useMaterialFields({
  create = false
}: {
  create?: boolean;
} = {}): ApiFormFieldSet {
  return useMemo(() => {
    const fields: ApiFormFieldSet = {
      IPN: {
        label: t`Código`,
        description: t`Código interno do material (ex.: MAT-000123)`
      },
      name: {
        label: t`Nome`,
        description: t`Nome do material como ele é conhecido no almoxarifado`
      },
      description: {
        label: t`Descrição`,
        description: t`Detalhe que ajude a identificar o material (opcional)`
      },
      category: {
        label: t`Categoria`,
        description: t`Categoria à qual o material pertence`,
        filters: {
          structural: false
        }
      },
      units: {
        label: t`Unidade de medida`,
        description: t`Unidade utilizada no controle (ex.: unidade, caixa, resma)`
      },
      minimum_stock: {
        label: t`Estoque mínimo`,
        description: t`Quantidade a partir da qual o material é sinalizado como estoque baixo`
      },
      default_location: {
        label: t`Local padrão`,
        description: t`Onde este material fica normalmente guardado`,
        filters: {
          structural: false
        }
      },
      active: {
        label: t`Ativo`,
        description: t`Materiais inativos não podem receber novas entradas`
      },
      // Valores fixos: mantêm o registro coerente no backend sem exibir
      // conceitos de manufatura/vendas ao usuário do almoxarifado.
      component: { value: false, hidden: true },
      assembly: { value: false, hidden: true },
      is_template: { value: false, hidden: true },
      trackable: { value: false, hidden: true },
      testable: { value: false, hidden: true },
      salable: { value: false, hidden: true },
      virtual: { value: false, hidden: true },
      purchaseable: { value: false, hidden: true }
    };

    // "Ativo" só faz sentido ao editar: todo material nasce ativo.
    if (create) {
      delete fields.active;
    }

    return fields;
  }, [create]);
}

/**
 * Campos do cadastro de **Categoria** de materiais.
 */
export function useCategoryFields(): ApiFormFieldSet {
  return useMemo(
    () => ({
      name: {
        label: t`Nome`,
        description: t`Nome da categoria (ex.: Material de Escritório)`
      },
      description: {
        label: t`Descrição`,
        description: t`O que esta categoria agrupa (opcional)`
      },
      parent: {
        label: t`Categoria pai`,
        description: t`Deixe em branco para uma categoria principal`,
        required: false
      }
    }),
    []
  );
}

/**
 * Campos do cadastro de **Setor / Departamento** da OAB-MA.
 */
export function useSectorFields(): ApiFormFieldSet {
  return useMemo(
    () => ({
      name: { label: t`Nome do setor` },
      code: { label: t`Sigla` },
      description: { label: t`Descrição` },
      active: { label: t`Ativo` }
    }),
    []
  );
}

/**
 * Campos do cadastro de **Local de Estoque**.
 */
export function useLocationFields(): ApiFormFieldSet {
  return useMemo(
    () => ({
      parent: {
        label: t`Local superior`,
        required: false
      },
      name: { label: t`Nome` },
      description: { label: t`Descrição` }
    }),
    []
  );
}

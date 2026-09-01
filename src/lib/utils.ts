export function cleanPayload<T extends Record<string, any>>(payload: T): T {
  const cleaned = { ...payload } as any
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === '' || cleaned[key] === undefined) {
      delete cleaned[key]
    }
  })
  return cleaned as T
}

export function formatPhone(v: string) {
  const digits = v.replace(/\D/g, '')
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15)
  }
  return digits.substring(0, 11)
}

export function isPromocaoAtiva(item: { em_promocao?: boolean; valor_promocao?: number; data_fim_promocao?: string }) {
  if (!item.em_promocao || item.valor_promocao === undefined || item.valor_promocao === null) {
    return false;
  }
  if (item.data_fim_promocao) {
    const today = new Date();
    // Normalize to YYYY-MM-DD local time comparison
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    if (todayStr > item.data_fim_promocao) {
      return false;
    }
  }
  return true;
}

export function getPrecoAtual(item: { preco?: number; preco_venda?: number; em_promocao?: boolean; valor_promocao?: number; data_fim_promocao?: string }) {
  const normalPrice = item.preco !== undefined ? item.preco : (item.preco_venda || 0);
  if (isPromocaoAtiva(item)) {
    return item.valor_promocao!;
  }
  return normalPrice;
}

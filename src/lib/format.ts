import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}

export function timeAgo(value?: string | Date | null) {
  if (!value) return "sem atividade";
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: ptBR
  });
}

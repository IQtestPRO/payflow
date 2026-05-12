# Identidade Visual PayFlow

Este projeto usa a marca PayFlow conforme a referência visual fornecida pelo usuário em 2026-05-08.

## Direção de Marca

- Símbolo principal: letra `P` estilizada com movimento de fluxo/seta.
- Sensação: fintech SaaS, operação confiável, recuperação de receita e velocidade.
- Uso preferencial: fundo claro para páginas operacionais e fundo azul-marinho para áreas institucionais, sidebar e destaques.

## Paleta

- Azul-marinho principal: `#001A42`
- Azul profundo: `#06245B`
- Azul elétrico: `#0967FF`
- Azul claro: `#0A84FF`
- Cyan de transição: `#16C8C7`
- Verde fluxo/recuperação: `#3BEA8D`

No Tailwind, use os tokens:

- `brand-navy`
- `brand-ink`
- `brand-blue`
- `brand-electric`
- `brand-cyan`
- `brand-green`

## Logo

O componente oficial do app é:

```tsx
import { PayFlowLogo, PayFlowMark } from "@/components/brand/payflow-logo";
```

Use `PayFlowLogo` quando houver espaço para símbolo + wordmark. Use `PayFlowMark` apenas para ícones compactos, favicons futuros ou estados muito restritos.

Variantes:

- `variant="light"`: para superfícies claras.
- `variant="dark"`: para fundos azul-marinho.
- `size="sm" | "md" | "lg"`.
- `showTagline`: exibe “Operações e recuperação”.

## Regras de Interface

- Sidebar e superfícies institucionais podem usar `brand-navy`.
- Ações primárias usam azul elétrico.
- Estados positivos e recuperação podem usar `brand-green`.
- Elementos de fluxo, progresso e transição podem usar `brand-cyan`.
- Evite criar novas cores principais sem atualizar este documento.
- Não substitua o logo por texto simples quando o contexto for branding.
- Não use emojis como marca ou ícone estrutural.

## Acessibilidade

- Em fundo `brand-navy`, use texto branco ou branco com opacidade mínima de 70%.
- Em fundos claros, use `brand-navy` para texto forte.
- O verde `brand-green` deve aparecer com texto escuro ou como acento visual, não como fundo para texto pequeno sem checar contraste.

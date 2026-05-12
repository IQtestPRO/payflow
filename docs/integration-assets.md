# Assets de integracoes

Os logos e icones ficam em:

```text
public/assets/integrations
```

## Logos adicionados com seguranca visual

- `whatsapp.svg`: marca vetorial do WhatsApp.
- `meta.svg`: marca vetorial da Meta.
- `facebook.svg`: marca vetorial do Facebook.
- `instagram.svg`: marca vetorial do Instagram.

Esses arquivos foram adicionados localmente para evitar hotlink externo.

## Fallbacks neutros

Nao foi encontrada no projeto uma fonte oficial confiavel para os logos abaixo. Para nao inventar logo de marca, foram usados icones neutros coerentes com a funcao:

- `utmify-fallback.svg`: analytics/rastreamento para UTMify.
- `umbrella-fallback.svg`: pagamentos/checkout para UmbrellaPag.
- `webhook-fallback.svg`: conexao tecnica para Webhooks.
- `pixel-fallback.svg`: pixel/API/tracking.

## Substituicoes futuras

Quando houver arquivo oficial da marca, substituir mantendo as mesmas proporcoes:

- Preferir SVG.
- Fundo transparente.
- ViewBox quadrado ou arte centralizada.
- Nome sem espacos, em lowercase.
- Manter alt text no catalogo `src/components/integrations/integration-brand.tsx`.

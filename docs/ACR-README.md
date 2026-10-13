# Azure Consumption Report (ACR)

- **Period:** September 2026 (last full month)
- **Scope (resource group):** m365-myaacoub
- **Currency:** USD
- **Source:** Azure Cost Management ActualCost query (Microsoft.CostManagement/query)
- **Generated (UTC):** 2026-10-13T04:22:55.071Z

## Consumption by service and environment (USD)

| Service | Dev | Test | Prod | Unassigned | Total |
|---|---:|---:|---:|---:|---:|
| API Management | $0.00 | $0.00 | $0.00 | $506.30 | $506.30 |
| Azure Bastion | $0.00 | $0.00 | $0.00 | $146.05 | $146.05 |
| Microsoft Fabric | $0.00 | $77.21 | $0.00 | $0.00 | $77.21 |
| Virtual Network | $0.00 | $15.32 | $0.00 | $38.24 | $53.56 |
| Azure Cognitive Search | $0.00 | $0.00 | $0.00 | $37.37 | $37.37 |
| Azure App Service | $0.09 | $0.00 | $1.57 | $35.40 | $37.05 |
| Azure Databricks | $0.00 | $0.00 | $0.00 | $14.40 | $14.40 |
| Foundry Models | $0.00 | $0.02 | $0.00 | $9.20 | $9.23 |
| Storage | $0.00 | $0.04 | $0.00 | $4.68 | $4.72 |
| Virtual Machines | $0.00 | $0.00 | $0.00 | $3.73 | $3.73 |
| Container Registry | $0.00 | $0.00 | $0.00 | $1.22 | $1.22 |
| Log Analytics | $0.00 | $0.37 | $0.00 | $0.33 | $0.71 |
| Azure DNS | $0.00 | $0.00 | $0.00 | $0.57 | $0.57 |
| Bandwidth | $0.00 | $0.00 | $0.00 | $0.22 | $0.22 |
| Azure Monitor | $0.00 | $0.00 | $0.00 | $0.13 | $0.13 |
| Azure Cosmos DB | $0.00 | $0.00 | $0.00 | $0.12 | $0.12 |
| MS Bing Services | $0.00 | $0.00 | $0.00 | $0.07 | $0.07 |
| **Total** | **$0.09** | **$92.97** | **$1.57** | **$798.04** | **$892.67** |

## Totals summary

| Environment | Cost (USD) | Share of total |
|---|---:|---:|
| Dev | $0.09 | 0.0% |
| Test | $92.97 | 10.4% |
| Prod | $1.57 | 0.2% |
| Unassigned | $798.04 | 89.4% |
| **Total** | **$892.67** | **100.0%** |

- **Services with cost:** 19
- **Largest service:** API Management ($506.30, 56.7%)

## Notes

- Costs are actual charges (ActualCost) for resources in the scope above. Forecasts and reservation amortization are excluded.
- Environment comes from the resource tag named in environments.tagKey. Tag values are mapped with environments.tagValueMap. Any other value, including no tag, is reported as Unassigned.
- Dev, Test, and Prod include only resources in this resource group that carry the mapped tags (demo to Dev, customer to Test, production to Prod). The PMO Portfolio Prioritization environments are not deployed yet, so they add nothing to these columns until the IaC deploys them with an environment tag.
- Totals come from the same query rows as the table, so the environment columns always add up to the service totals.

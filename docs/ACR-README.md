# Azure Consumption Report (ACR)

- **Period:** September 2026 (last full month)
- **Scope (resource group):** m365-myaacoub
- **Currency:** USD
- **Source:** Azure Cost Management ActualCost query (Microsoft.CostManagement/query)
- **Generated (UTC):** 2026-10-13T04:22:55.071Z

## ACR summary

- **Total ACR (actual): $892.67**
- **Microsoft Fabric actual:** $77.21 (reported under Test)
- **Largest service:** API Management ($506.30, 56.7%)
- **Services with cost:** 19

| Environment | Cost (USD) | Share of total |
|---|---:|---:|
| Dev | $0.09 | 0.0% |
| Test | $92.97 | 10.4% |
| Prod | $1.57 | 0.2% |
| Unassigned | $798.04 | 89.4% |
| **Total ACR** | **$892.67** | **100.0%** |

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

## Fabric capacity planning scenario (estimate, not in actual ACR)

For planning, use F8 for Dev and QA and F64 for Prod. The monthly estimate below assumes Dev and QA run 8 hours per weekday (about 176 hours/month), Prod runs continuously (730 hours/month), and a pay-as-you-go rate of **$0.18 per CU-hour**. This is an illustrative rate; use the [Azure pricing page](https://azure.microsoft.com/en-us/pricing/details/microsoft-fabric/) for the deployment region and agreement for a quote.

| Environment | Planning SKU | Capacity (CUs) | Active hours/month | Share of one shared F64 at peak | Estimated monthly cost |
|---|---:|---:|---:|---:|---:|
| Dev | F8 | 8 | 176 | 12.5% | $253.44 |
| QA | F8 | 8 | 176 | 12.5% | $253.44 |
| Prod | F64 | 64 | 730 | 100.0% | $8,409.60 |
| **Peak combined demand / estimated total** | **F80 equivalent** | **80** | — | **125.0%** | **$8,916.48** |

The percentages compare each environment's target capacity to a shared F64's 64 CUs. At peak, all three targets add up to 80 CUs, so they would exceed a single shared F64 by 25% if workloads ran concurrently. A shared F128 would provide enough peak capacity; the same 80-CU demand would be 62.5% of its 128 CUs. These are capacity-sizing comparisons, not observed utilization—confirm actual demand and contention with the Fabric Capacity Metrics app. The estimated monthly cost treats the environments as separately billed capacities and is not added to the $892.67 actual ACR total above.

## Notes

- Costs are actual charges (ActualCost) for resources in the scope above. Forecasts and reservation amortization are excluded.
- Environment comes from the resource tag named in environments.tagKey. Tag values are mapped with environments.tagValueMap. Any other value, including no tag, is reported as Unassigned.
- Dev, Test, and Prod include only resources in this resource group that carry the mapped tags (demo to Dev, customer to Test, production to Prod). The PMO Portfolio Prioritization environments are not deployed yet, so they add nothing to these columns until the IaC deploys them with an environment tag.
- Totals come from the same query rows as the table, so the environment columns always add up to the service totals.
- Fabric capacity charges are billed while capacity is active; pausing Dev and QA outside working hours can reduce their compute cost. OneLake storage and other charges are not included in the Fabric scenario estimate.

# Role and access matrix

| Role | Primary access | Approval authority | Sensitive restrictions |
|---|---|---|---|
| Super Admin | All modules and configuration | All workflow types | Break-glass account; MFA mandatory |
| Management | Cross-company read, dashboards, reports | High-value quotations, POs, payments, salary changes | No routine transaction editing |
| Finance Manager | Finance, bills, payments, financial reports | Payments, expenses, vendor bills | No HR personal documents |
| HR Manager | Employees, attendance, leave, payroll structure | Leave and salary changes | Salary/bank data restricted to HR/Management |
| Sales Manager | CRM, pricing, quotations, sales reports | Discounts and quotations | Cannot post finance journals |
| Sales Executive | Assigned leads, customers, quotations, follow-ups | None; submits requests | Margin floor and ownership scope enforced |
| Shipping Team | Shipments, packing lists, delivery notes | Dispatch confirmation | Read-only sales order lines |
| Warehouse Team | Stock, receipts, dispatch, lots/serials | Submits stock adjustments | Cannot change product costs |
| Procurement Team | Suppliers, requests, RFQs, POs, GRNs | None; submits POs | Cannot approve own request |
| Service Engineer | Assigned tickets, installations, maintenance, reports | Service completion | Customer and equipment scope only |
| Project Manager | Assigned projects, milestones, tasks, budget consumption | Project expenses within threshold | No unrestricted finance access |
| Read-only Auditor | All approved business records and audit logs | None | No create/update/delete; exports logged |

RLS is the final authorization boundary. The UI may hide controls for usability, but every read and write is independently authorized by PostgreSQL policies. Approval workflows should enforce segregation of duties: requesters cannot approve their own transactions, and threshold escalation applies to discount, amount, salary, and inventory-value changes.

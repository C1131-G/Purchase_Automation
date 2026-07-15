# code-style
- Avoid adding performance.mark() / performance.measure() instrumentation in production source code. Confidence: 0.65

# workflow
- For multi-phase tasks, create a comprehensive plan document first before any execution, then execute step-by-step on user's command. Confidence: 0.85

# architecture
- Do not create or modify schema, DAL, service, or route files — only create supporting infrastructure files (config, types, middleware, validation schemas, wiring). Confidence: 0.80
- When porting from HANA to SQL, keep route endpoints, query params, and response shapes identical to HANA so the frontend works without changes. Confidence: 0.75
- Use SaaS multi-tenant model where each user sees ONLY their own organization on login — no public listing of all tenants. Confidence: 0.75
- Use plain text password comparison (no bcrypt) — passwords stored and compared directly in the database table. Confidence: 0.70

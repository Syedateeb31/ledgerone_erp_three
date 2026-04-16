# Journal Voucher Database Structure & Data Flow

## Tables Involved

### 1. journal_voucher (Main Table)
```
Columns:
- id (PRIMARY KEY)
- tenant_id (FOREIGN KEY - multi-tenancy)
- company_id (FOREIGN KEY - companies table)
- voucher_number (UNIQUE per tenant)
- voucher_date (DATE)
- description (VARCHAR)
- total_debit (DECIMAL)
- total_credit (DECIMAL)
- created_by (FOREIGN KEY - users table)
- created_at (TIMESTAMP)
- status (ENUM: 'draft', 'posted')
```

### 2. journal_voucher_line (Detail Table)
```
Columns:
- id (PRIMARY KEY)
- tenant_id (FOREIGN KEY)
- voucher_id (FOREIGN KEY → journal_voucher.id)
- account_id (FOREIGN KEY → accounts.id)
- debit (DECIMAL)
- credit (DECIMAL)
```

### 3. accounting_ledger (Ledger Table - Only for Posted Vouchers)
```
Columns:
- id (PRIMARY KEY)
- tenant_id (FOREIGN KEY)
- transaction_type (VARCHAR: 'Journal Voucher')
- reference_table (VARCHAR: 'journal_voucher')
- reference_id (INT → journal_voucher.id)
- account_id (FOREIGN KEY → accounts.id)
- date (DATE)
- description (VARCHAR)
- debit (DECIMAL)
- credit (DECIMAL)
```

### 4. Related Tables (Used in Joins)
```
- accounts (id, name, tenant_id)
- companies (id, company_name, tenant_id)
- users (id, full_name)
- tenant_currencies (tenant_id, currency_id)
- ledgerone_public.currencies (id, symbol)
```

---

## Data Flow: INSERT (journal-add.php)

### When User Creates Journal Entry:

```
1. INSERT INTO journal_voucher
   ├─ tenant_id
   ├─ company_id
   ├─ voucher_number
   ├─ voucher_date
   ├─ description
   ├─ total_debit
   ├─ total_credit
   ├─ created_by (user_id)
   └─ status ('draft' or 'posted')
   
   ↓ Get voucher_id from lastInsertId()

2. FOR EACH ENTRY LINE:
   INSERT INTO journal_voucher_line
   ├─ tenant_id
   ├─ voucher_id (from step 1)
   ├─ account_id
   ├─ debit
   └─ credit

3. IF STATUS = 'posted':
   FOR EACH ENTRY LINE:
   INSERT INTO accounting_ledger
   ├─ tenant_id
   ├─ transaction_type ('Journal Voucher')
   ├─ reference_table ('journal_voucher')
   ├─ reference_id (voucher_id)
   ├─ account_id
   ├─ date
   ├─ description
   ├─ debit
   └─ credit
```

---

## Data Flow: SELECT (journal-list.php)

### Query with JOINs:

```sql
SELECT 
    jv.id,
    jv.voucher_number,
    jv.voucher_date,
    jv.description,
    jv.total_debit,
    jv.total_credit,
    jv.status,
    u.full_name as posted_by,
    jv.created_at as posted_on,
    c.company_name
FROM journal_voucher jv
LEFT JOIN users u ON jv.created_by = u.id
LEFT JOIN companies c ON jv.company_id = c.id
WHERE jv.tenant_id = ?
ORDER BY jv.voucher_date DESC, jv.id DESC
```

### For Each Voucher - Get Entry Lines:

```sql
SELECT 
    a.name as account,
    jvl.debit,
    jvl.credit
FROM journal_voucher_line jvl
JOIN accounts a ON jvl.account_id = a.id
WHERE jvl.voucher_id = ?
```

### Get Currency Symbol:

```sql
SELECT c.symbol
FROM tenant_currencies tc
JOIN ledgerone_public.currencies c ON tc.currency_id = c.id
WHERE tc.tenant_id = ?
```

---

## Data Flow: DELETE (journal-delete.php)

### Only Draft Vouchers Can Be Deleted:

```
1. SELECT FROM journal_voucher
   WHERE id = ? AND tenant_id = ?
   ↓ Check if status = 'draft'

2. DELETE FROM journal_voucher_line
   WHERE voucher_id = ?
   (Remove all line items first)

3. DELETE FROM journal_voucher
   WHERE id = ?
   (Remove main voucher)

Note: accounting_ledger is NOT deleted because:
- Only posted vouchers have entries in accounting_ledger
- Posted vouchers cannot be deleted
- This maintains audit trail integrity
```

---

## Data Flow: POST DRAFT (journal-post-draft.php)

### Convert Draft to Posted:

```
1. UPDATE journal_voucher
   SET status = 'posted'
   WHERE id = ?

2. SELECT FROM journal_voucher_line
   WHERE voucher_id = ?
   (Get all line items)

3. FOR EACH LINE:
   INSERT INTO accounting_ledger
   ├─ tenant_id
   ├─ transaction_type ('Journal Voucher')
   ├─ reference_table ('journal_voucher')
   ├─ reference_id (voucher_id)
   ├─ account_id
   ├─ date (from voucher)
   ├─ description (from voucher)
   ├─ debit
   └─ credit
```

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    journal_voucher                          │
│  (Main voucher record - one per entry)                      │
│                                                             │
│  id, tenant_id, company_id, voucher_number,                │
│  voucher_date, description, total_debit,                   │
│  total_credit, created_by, status                          │
└────────────────┬──────────────────────────────────────────┘
                 │
                 │ 1:N (One voucher has many lines)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              journal_voucher_line                           │
│  (Detail lines - multiple per voucher)                      │
│                                                             │
│  id, tenant_id, voucher_id, account_id,                    │
│  debit, credit                                              │
└────────────────┬──────────────────────────────────────────┘
                 │
                 │ (Only if status = 'posted')
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              accounting_ledger                              │
│  (Ledger entries - only for posted vouchers)               │
│                                                             │
│  id, tenant_id, transaction_type, reference_table,         │
│  reference_id, account_id, date, description,              │
│  debit, credit                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Points

1. **Multi-Tenancy**: All tables have `tenant_id` to isolate data per tenant
2. **Draft vs Posted**: 
   - Draft: Only in `journal_voucher` and `journal_voucher_line`
   - Posted: Also has entries in `accounting_ledger`
3. **Deletion**: Only draft vouchers can be deleted (maintains audit trail)
4. **Transactions**: All operations use database transactions for data integrity
5. **Joins**: 
   - `journal_voucher` ← LEFT JOIN → `users` (created_by)
   - `journal_voucher` ← LEFT JOIN → `companies` (company_id)
   - `journal_voucher_line` ← JOIN → `accounts` (account_id)

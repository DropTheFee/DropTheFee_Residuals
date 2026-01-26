# DropTheFee Residual Reporting - GHL Integration

A GoHighLevel marketplace app for managing payment processor residual reports with automated merchant lifetime value tracking.

## 🔑 Key Features

- **GHL OAuth Integration**: Seamless authentication through GoHighLevel
- **Multi-Tenancy**: Agency-level data isolation using GHL locationId
- **CSV Upload**: Support for 8+ payment processors (EPI, Paysafe, Vivid, Link2Pay, Payarc, CoastalPay, BCMS/Card-X, Paya ACH)
- **Merchant Lifetime Value**: Automatic calculation of lifetime volume, income, and projections
- **Dashboard Analytics**: Real-time metrics for current month, quarter, and YTD
- **Role-Based Access**: Maps GHL user roles to app permissions

## 🏗️ Architecture

### Authentication Flow

1. **GHL OAuth**: Users authenticate through GoHighLevel (no separate login)
2. **Context Detection**: App receives GHL user context via:
   - URL parameters (OAuth callback with `code`)
   - PostMessage from parent iframe
3. **User Sync**: GHL user data synced to Supabase `users` table
4. **Agency Mapping**: GHL `locationId` → `agency_id` for multi-tenancy

### Data Isolation

- All data scoped by `agency_id` (GHL location)
- Row Level Security (RLS) policies enforce agency boundaries
- Each GHL location sees only their own merchants and reports

## 🚀 Setup Instructions

### 1. GoHighLevel App Configuration

In your GHL Developer Portal:

1. Create a new marketplace app
2. Set OAuth redirect URI: `https://your-domain.com`
3. Request scopes: `locations.readonly`, `users.readonly`
4. Note your `CLIENT_ID` and `CLIENT_SECRET`

### 2. Environment Variables

Create `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# GoHighLevel OAuth
VITE_GHL_CLIENT_ID=your-ghl-client-id
VITE_GHL_CLIENT_SECRET=your-ghl-client-secret
VITE_GHL_REDIRECT_URI=https://your-domain.com
```

### 3. Database Setup

Run migrations in Supabase SQL Editor:

```bash
# Run in order:
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_add_ghl_fields.sql
```

### 4. Install & Build

```bash
pnpm install
pnpm run build
```

### 5. Deploy

Deploy `dist/` folder to your hosting provider. The app will be embedded in GHL as an iframe.

## 📊 How It Works

### CSV Upload Process

1. User uploads residual report CSV
2. App auto-detects processor and columns
3. Data inserted into `merchants` and `merchant_history` tables
4. Database triggers calculate lifetime metrics
5. Dashboard updates in real-time

### Merchant Tracking

- **First Report**: Creates merchant record with `agency_id`
- **Subsequent Reports**: Updates history, recalculates lifetime stats
- **Status Tracking**: Active, Inactive, Churned based on report dates
- **Metrics**: Lifetime volume, income, monthly average, annualized value

### Multi-Tenancy

- GHL `locationId` maps to `agency_id`
- Each agency sees only their data
- RLS policies enforce boundaries at database level
- No cross-agency data leakage

## 🔒 Security

- **No Password Storage**: Uses GHL OAuth exclusively
- **RLS Policies**: Database-level access control
- **Agency Isolation**: Automatic data scoping by location
- **Token Validation**: Verifies GHL OAuth tokens

## 📱 User Roles

GHL roles map to app permissions:

- **Account Admin** → `superadmin`: Full access
- **Admin** → `admin`: Agency management
- **User** → `sales_rep`: Personal portfolio view

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, RLS, Auth)
- **Integration**: GoHighLevel OAuth 2.0

## 📝 Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm run dev

# Build for production
pnpm run build

# Lint code
pnpm run lint
```

## 🐛 Troubleshooting

### "Authentication Error" on Load

- Ensure app is opened from GHL dashboard/marketplace
- Check GHL OAuth credentials in `.env`
- Verify redirect URI matches GHL app settings

### "No Data" in Dashboard

- Run database migrations
- Upload first CSV report
- Check `agency_id` is set correctly

### CSV Upload Fails

- Verify processor selection matches file format
- Check file has required columns (merchant name, ID, volume, residual)
- Review browser console for parsing errors

## 📞 Support

For technical support or GHL integration questions, contact the development team.

## 📄 License

Proprietary - DropTheFee.com
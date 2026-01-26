# DropTheFee Residual Reporting Tool - Development Plan

## Design Guidelines

### Design References
- **Stripe Dashboard**: Clean data tables, professional metrics display
- **Plaid Dashboard**: Financial data visualization, trust-building design
- **Existing DropTheFee Design**: Dark theme with gradient backgrounds
- **Style**: Modern Financial Dashboard + Dark Mode + Professional

### Color Palette
- Primary: #1a1a2e (Deep Navy - background)
- Secondary: #16213e (Dark Blue - cards/sections)
- Accent: #0f3460 (Royal Blue - highlights)
- Success: #10b981 (Green - positive metrics)
- Warning: #f59e0b (Amber - alerts)
- Danger: #ef4444 (Red - negative metrics)
- Text: #f8fafc (Off-white), #94a3b8 (Slate Gray - secondary)

### Typography
- Heading1: Inter font-weight 700 (36px)
- Heading2: Inter font-weight 600 (28px)
- Heading3: Inter font-weight 600 (20px)
- Body/Normal: Inter font-weight 400 (14px)
- Body/Emphasis: Inter font-weight 600 (14px)
- Navigation: Inter font-weight 500 (15px)
- Metrics: Inter font-weight 700 (24px)

### Key Component Styles
- **Buttons**: Primary (#0f3460), white text, 6px rounded, hover: brighten 15%
- **Cards**: Dark navy (#16213e), 1px border (#334155), 8px rounded, subtle shadow
- **Tables**: Striped rows, hover state, sticky headers for long lists
- **Forms**: Dark inputs with subtle borders, focus: blue accent glow
- **Metrics Cards**: Large numbers, trend indicators (up/down arrows), percentage changes

### Layout & Spacing
- Dashboard: Grid layout with responsive columns (4 cols desktop, 2 tablet, 1 mobile)
- Sidebar: 240px width, collapsible to 64px icon-only mode
- Content padding: 24px on all sides
- Card spacing: 16px gaps between cards
- Section padding: 32px vertical

### Images to Generate
1. **logo-dropthefee.png** - DropTheFee logo with modern financial tech aesthetic (Style: vector-style, professional, blue tones)
2. **hero-dashboard-bg.jpg** - Abstract financial data visualization background (Style: dark, subtle, professional)
3. **icon-upload.png** - Upload icon for CSV file upload area (Style: minimalist, line-art)
4. **icon-commission.png** - Commission/money icon for commission section (Style: minimalist, line-art)

---

## Development Tasks

### Phase 1: Foundation & Setup
1. **Project Structure** - Clean up template, organize folder structure for components, hooks, utils, types
2. **Environment Setup** - Configure Supabase connection (use existing instance), set up environment variables
3. **Type Definitions** - Copy and refine types from existing codebase (User, MerchantData, ReportData, etc.)
4. **Generate Images** - Create all 4 images using ImageCreator.generate_images

### Phase 2: Authentication & User Management
5. **Supabase Auth Integration** - Connect to existing Supabase auth, implement login/signup flows
6. **Role-Based Access** - Create auth context with role checking (superadmin, admin, sales_rep, junior_sales_rep)
7. **Protected Routes** - Implement route guards based on user roles
8. **User Profile Component** - Display user info, role, and logout functionality

### Phase 3: Core Dashboard
9. **Dashboard Layout** - Create responsive dashboard with sidebar navigation
10. **Period Statistics Cards** - Current month, last month, quarter, YTD metrics display
11. **Volume & Residual Metrics** - Large metric cards with trend indicators
12. **Quick Actions** - Upload report, view expenses, manage users buttons

### Phase 4: Residual Report Upload
13. **File Upload Component** - Drag-and-drop CSV upload with file validation
14. **Processor Detection** - Auto-detect processor from file structure (EPI, Paysafe, Vivid, Link2Pay, Payarc, CoastalPay, BCMS/Card-X, Paya ACH)
15. **Column Mapper** - Interactive column mapping interface for CSV headers
16. **CSV Parser** - Parse and validate CSV data, handle different processor formats
17. **Data Preview** - Show parsed data preview before saving to database

### Phase 5: Merchant Data Management
18. **Merchant Table Component** - Sortable, filterable table with pagination
19. **Filter Controls** - Live/Inactive/Closed account filters, processor filter, search
20. **Merchant Details View** - Detailed view of individual merchant data
21. **Processor Breakdown** - Group and display data by processor
22. **Export Functionality** - Export filtered data to CSV

### Phase 6: Commission Calculation System
23. **Commission Tiers** - Fetch and display commission tier structure from database
24. **Volume-Based Calculation** - Calculate commissions based on volume tiers
25. **Trainer Override Logic** - Implement trainer override percentages for junior reps
26. **Sub-Agent Reports** - Generate commission reports for sub-agents
27. **Commission Dashboard** - Visual display of commission breakdowns

### Phase 7: User Role Management
28. **User Management Page** - SuperAdmin view to manage all users
29. **Role Assignment** - Assign and update user roles
30. **Trainer Assignment** - Link junior reps to trainers
31. **Sales Rep Portfolio** - Personal view for sales reps showing their merchants only
32. **Permissions Enforcement** - Ensure proper data access based on role

### Phase 8: Expense Tracking
33. **Expense Upload** - CSV upload for expenses with column mapping
34. **Expense Table** - Display expenses with filtering and sorting
35. **Category Breakdown** - Visual breakdown of expenses by category
36. **Monthly Expense Reports** - Generate monthly expense summaries
37. **Processor Allocation** - Allocate expenses to specific processors

### Phase 9: GoHighLevel Integration
38. **GHL OAuth Setup** - Configure OAuth flow for GHL authentication
39. **SSO Integration** - Implement single sign-on with GHL
40. **Iframe Embedding** - Ensure app works properly within GHL iframe
41. **GHL Contact Sync** - Sync user data with GHL contacts API
42. **Webhook Handlers** - Handle GHL webhooks for real-time updates
43. **Marketplace Metadata** - Prepare app metadata for GHL marketplace listing

### Phase 10: Data Persistence & Security
44. **Database Queries** - Implement all CRUD operations with Supabase
45. **Row Level Security** - Verify RLS policies match user roles
46. **Data Validation** - Server-side validation for all data inputs
47. **Error Handling** - Comprehensive error handling and user feedback
48. **Performance Optimization** - Optimize queries, implement caching where appropriate

### Phase 11: Testing & Polish
49. **Role Testing** - Test all features for each user role
50. **Commission Accuracy** - Verify commission calculations with test data
51. **CSV Format Testing** - Test all processor CSV formats
52. **Responsive Design** - Ensure mobile and tablet responsiveness
53. **Final UI Polish** - Animations, loading states, empty states
54. **Documentation** - Update README with deployment and usage instructions
# Credit System Documentation

**Version:** 1.0.0  
**Date:** July 4, 2026  
**Status:** ✅ Implementation Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Credit Allocation](#credit-allocation)
3. [Feature Costs](#feature-costs)
4. [Implementation](#implementation)
5. [API Reference](#api-reference)
6. [UI Components](#ui-components)
7. [Database Schema](#database-schema)
8. [Usage Examples](#usage-examples)

---

## Overview

The credit system provides a flexible, transparent way to manage feature usage across different subscription tiers. Users receive monthly credits based on their plan and can use them across all premium features.

### Key Features

- ✅ Monthly credit allocation based on subscription plan
- ✅ Credit rollover (3 months for Premium, unlimited for Premium Plus)
- ✅ Real-time credit balance tracking
- ✅ Transparent pricing per feature
- ✅ Usage analytics and history
- ✅ Final credit deduction (no refunds)

---

## Credit Allocation

### Premium Plan ($5/month or KES 500/month)

- **Monthly Credits**: 100 credits
- **Rollover**: 3 months (max 300 credits)
- **Annual Bonus**: +20 credits (1,220 credits/year)
- **Value**: ~$50 worth of features for $5

### Premium Plus Plan ($10/month or KES 1,000/month)

- **Monthly Credits**: 500 credits
- **Rollover**: Unlimited
- **Annual Bonus**: +100 credits (6,100 credits/year)
- **Priority**: 2x faster AI processing

### Free Plan

- **Monthly Credits**: 10 credits
- **Rollover**: None (expires monthly)
- **Features**: Limited to basic features only

---

## Feature Costs

### Resume Features

| Feature | Cost | Description |
|---------|------|-------------|
| Generate New Resume | 5 credits | Create a new resume from scratch |
| Optimize Resume | 3 credits | Optimize existing resume content |
| ATS Score Analysis | 2 credits | Analyze resume ATS compatibility |
| Tailor Resume to Job | 4 credits | Customize resume for specific job |

### Cover Letter Features

| Feature | Cost | Description |
|---------|------|-------------|
| Generate Cover Letter | 4 credits | Create a new cover letter |
| Customize Cover Letter | 3 credits | Tailor cover letter for job |

### Interview Features

| Feature | Cost | Description |
|---------|------|-------------|
| Mock Interview (5 questions) | 10 credits | Full mock interview session |
| Generate Interview Questions | 2 credits | Create practice questions |
| Evaluate Interview Answer | 3 credits | Get feedback on answers |

### Job Analysis Features

| Feature | Cost | Description |
|---------|------|-------------|
| Job Description Analysis | 2 credits | Analyze job requirements |
| Skills Gap Analysis | 3 credits | Identify missing skills |
| Job Match Scoring | 1 credit | Calculate job compatibility |

### LinkedIn Features

| Feature | Cost | Description |
|---------|------|-------------|
| LinkedIn Profile Optimization | 5 credits | Optimize full LinkedIn profile |
| LinkedIn Headline Generation | 2 credits | Create compelling headline |
| LinkedIn About Section | 3 credits | Write about section |

### AI Assistant Features

| Feature | Cost | Description |
|---------|------|-------------|
| Simple AI Question | 1 credit | Basic career question |
| Complex AI Analysis | 3 credits | In-depth analysis |
| Career Advice | 2 credits | Personalized career guidance |

---

## Implementation

### Database Migration

The credit system is implemented via migration `005_add_credit_system.sql`:

```sql
-- Key tables created:
- credit_transactions: Tracks all credit movements
- credit_pricing: Defines cost per feature
- credit_allocation_rules: Defines credits per plan

-- Key functions:
- grant_credits(): Add credits to user account
- deduct_credits(): Remove credits for feature usage (final, no refunds)
- check_credits(): Verify sufficient balance
- grant_monthly_credits(): Auto-grant monthly allocation
```

### Edge Functions

Three Supabase Edge Functions handle credit operations:

1. **credits-check**: Check if user has enough credits
2. **credits-deduct**: Deduct credits for feature usage (final, no refunds)
3. **credits-grant**: Grant credits (admin/system)

### React Hook

`useCredits()` hook provides easy access to credit operations:

```typescript
const {
  balance,           // Current credit balance
  loading,           // Loading state
  error,             // Error state
  checkCredits,      // Check if enough credits
  deductCredits,     // Deduct credits (final, no refunds)
  getTransactions,   // Get transaction history
  getPricing,        // Get feature pricing
  refreshBalance,    // Manually refresh balance
} = useCredits();
```

---

## API Reference

### Check Credits

**Endpoint:** `POST /functions/v1/credits-check`

**Request:**
```json
{
  "feature": "resume_generate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "has_enough": true,
    "current_balance": 95,
    "required_credits": 5,
    "remaining_after": 90,
    "feature": {
      "code": "resume_generate",
      "name": "Generate New Resume",
      "cost": 5,
      "category": "resume",
      "description": "Create a new resume from scratch"
    }
  }
}
```

### Deduct Credits

**Endpoint:** `POST /functions/v1/credits-deduct`

**Request:**
```json
{
  "feature": "resume_generate",
  "referenceId": "resume-uuid",
  "metadata": {
    "template": "modern-pro",
    "job_title": "Software Engineer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "tx-uuid",
    "credits_deducted": 5,
    "new_balance": 90,
    "total_used": 15,
    "feature": "resume_generate"
  }
}
```

**Error (Insufficient Credits):**
```json
{
  "success": false,
  "error": "Insufficient credits",
  "data": {
    "required": 5,
    "available": 3,
    "shortfall": 2
  }
}
```



---

## UI Components

### CreditBadge

Displays user's current credit balance:

```tsx
import { CreditBadge } from '@/components/ui/CreditBadge';

<CreditBadge 
  showDetails={true}
  onPress={() => router.push('/pricing')}
/>
```

**Features:**
- Shows current balance with lightning icon
- Color-coded warnings (yellow < 20, red < 10)
- Optional details (earned/used)
- Clickable to navigate to pricing

### CreditCostBadge

Shows credit cost for a feature:

```tsx
import { CreditCostBadge } from '@/components/ui/CreditCostBadge';

<CreditCostBadge 
  cost={5}
  feature="Generate Resume"
  size="medium"
/>
```

---

## Database Schema

### credit_transactions

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER, -- negative for usage, positive for grants
  balance_before INTEGER,
  balance_after INTEGER,
  transaction_type TEXT, -- 'grant', 'usage', 'refund', etc.
  feature TEXT, -- feature code
  feature_cost INTEGER,
  reference_id UUID, -- related entity ID
  metadata JSONB,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

### credit_pricing

```sql
CREATE TABLE credit_pricing (
  id UUID PRIMARY KEY,
  feature_code TEXT UNIQUE,
  feature_name TEXT,
  credit_cost INTEGER,
  description TEXT,
  category TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### credit_allocation_rules

```sql
CREATE TABLE credit_allocation_rules (
  id UUID PRIMARY KEY,
  plan_type plan_enum,
  monthly_credits INTEGER,
  rollover_months INTEGER,
  max_rollover_credits INTEGER,
  bonus_annual_credits INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Usage Examples

### Example 1: Check Credits Before Action

```typescript
import { useCredits } from '@/hooks/useCredits';

function ResumeGenerator() {
  const { checkCredits, deductCredits } = useCredits();

  const handleGenerate = async () => {
    try {
      // Check if user has enough credits
      const check = await checkCredits('resume_generate');
      
      if (!check.hasEnough) {
        Alert.alert(
          'Insufficient Credits',
          `You need ${check.requiredCredits} credits but only have ${check.currentBalance}. Upgrade to Premium for 100 credits/month!`
        );
        return;
      }

      // Show confirmation
      Alert.alert(
        'Confirm',
        `This will use ${check.feature.cost} credits. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              // Deduct credits
              const result = await deductCredits('resume_generate', {
                referenceId: resumeId,
                metadata: { template: 'modern-pro' }
              });

              // Generate resume
              await generateResume();
              
              Alert.alert('Success', `Resume generated! ${result.newBalance} credits remaining.`);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <Button onPress={handleGenerate}>
      Generate Resume (5 credits)
    </Button>
  );
}
```

### Example 2: Display Credit Balance

```typescript
import { CreditBadge } from '@/components/ui/CreditBadge';

function DashboardHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Dashboard</Text>
      <CreditBadge showDetails={true} />
    </View>
  );
}
```

### Example 3: Show Transaction History

```typescript
import { useCredits } from '@/hooks/useCredits';

function CreditHistory() {
  const { getTransactions } = useCredits();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const history = await getTransactions(50);
    setTransactions(history);
  };

  return (
    <FlatList
      data={transactions}
      renderItem={({ item }) => (
        <View style={styles.transaction}>
          <Text>{item.feature || item.transactionType}</Text>
          <Text style={item.amount > 0 ? styles.positive : styles.negative}>
            {item.amount > 0 ? '+' : ''}{item.amount}
          </Text>
          <Text>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      )}
    />
  );
}
```

---

## Best Practices

### 1. Always Check Before Deducting

```typescript
// ✅ Good
const check = await checkCredits('feature_code');
if (check.hasEnough) {
  await deductCredits('feature_code');
}

// ❌ Bad
await deductCredits('feature_code'); // May fail
```

### 2. Show Credit Cost Upfront

```typescript
// ✅ Good
<Button>
  Generate Resume
  <CreditCostBadge cost={5} />
</Button>

// ❌ Bad
<Button>Generate Resume</Button> // User doesn't know cost
```

### 3. Handle Insufficient Credits Gracefully

```typescript
// ✅ Good
try {
  await deductCredits('feature_code');
} catch (error) {
  if (error.message.includes('Insufficient')) {
    // Show upgrade prompt
    router.push('/pricing');
  }
}
```



---

## Deployment Checklist

- [ ] Run database migration: `npx supabase db push --include-all`
- [ ] Deploy edge functions:
  - [ ] `npx supabase functions deploy credits-check`
  - [ ] `npx supabase functions deploy credits-deduct`
  - [ ] `npx supabase functions deploy credits-grant`

- [ ] Test credit operations in development
- [ ] Set up monthly credit grant cron job
- [ ] Monitor credit usage analytics
- [ ] Set up alerts for low credit warnings

---

## Support

For questions or issues with the credit system:
- **Documentation**: This file
- **Support Email**: support@interviewready.app
- **Developer**: Check Supabase logs for edge function errors

---

**Last Updated:** July 4, 2026  
**Status:** ✅ Production Ready

# DynamoDB Setup for Stock Recorder

This document explains how to set up and use DynamoDB with the Stock Recorder application.

## Environment Setup

1. Create a `.env.local` file at the root of the project by copying the `.env.local.example` file:

```bash
cp .env.local.example .env.local
```

2. Fill in your AWS credentials in the `.env.local` file:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
DYNAMODB_TABLE_PREFIX=pantrypal
```

> **Important**: Never commit your `.env.local` file to version control. It is already added to `.gitignore`.

## AWS IAM Setup

1. Create an IAM user in AWS Console with programmatic access
2. Attach the `AmazonDynamoDBFullAccess` policy or create a custom policy with the following permissions:
   - `dynamodb:GetItem`
   - `dynamodb:PutItem`
   - `dynamodb:UpdateItem`
   - `dynamodb:DeleteItem`
   - `dynamodb:Query`
   - `dynamodb:Scan`
   - `dynamodb:BatchGetItem`
   - `dynamodb:BatchWriteItem`
   - `dynamodb:DescribeTable`
   - `dynamodb:CreateTable` (if your app needs to create tables)

3. Generate access keys and use them in your `.env.local` file

## Required DynamoDB Tables

The application expects the following tables (prefixed with the value of `DYNAMODB_TABLE_PREFIX`):

1. `pantrypal-users` - User information
   - Primary key: `userId` (String)
   - Sort key: None

2. `pantrypal-stocks` - Stock information
   - Primary key: `stockId` (String)
   - Sort key: `date` (String)

3. `pantrypal-home` - Home page layout configuration
   - Primary key: `id` (String)
   - Sort key: None

## Data Initialization

The application automatically initializes some required data in DynamoDB when the server starts:

1. **Home Layout**: A default home dashboard layout is created in the `pantrypal-home` table if it doesn't already exist.

This initialization happens automatically when the server starts. The initialization code is located in:
- `src/util/server-only/initHomeLayout.ts`
- `src/util/server-only/init.ts` (global initialization file)

To add more initialization scripts:
1. Create a new initialization file in `src/util/server-only/`
2. Import it in `src/util/server-only/init.ts`

## Using DynamoDB in Your Code

Import the DynamoDB utility functions from the server-only directory:

```typescript
// This should only be imported in server components or server actions
import { 
  getItem, 
  putItem, 
  queryItems, 
  scanItems, 
  updateItem, 
  deleteItem 
} from '@/util/server-only/dynamodb';
```

### Example Usage

```typescript
// Server component or server action
import { getItem, putItem } from '@/util/server-only/dynamodb';

// Example: Fetch a user
const user = await getItem('users', { userId: 'user123' });

// Example: Create/update a stock entry
await putItem('stocks', {
  stockId: 'AAPL',
  date: '2023-05-01',
  price: 150.25,
  quantity: 10
});
```

## Security Notes

- The DynamoDB credentials are only accessible on the server-side
- Client-side code cannot import files from the `server-only` directory
- Next.js automatically prevents environment variables from being exposed to the client, unless they are prefixed with `NEXT_PUBLIC_` 
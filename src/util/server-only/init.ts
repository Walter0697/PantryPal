// This file is responsible for initializing all required data on server start
// Simply import this file in server components or server-side code 
// to ensure initialization happens

'use server';

import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { docClient, client, getTableName } from './dynamodb';

// Server-side environment variables (not accessible to the client)
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'pantrypal';

// Table definitions - just home and storage tables now
const tableNames = ['home', 'storage'];

// Initialize DynamoDB tables
async function initializeTables() {
  console.log(`[${new Date().toISOString()}] 🚀 INIT: Starting database initialization...`);

  try {
    // List existing tables
    const listTablesResponse = await client.send(new ListTablesCommand({}));
    const existingTables = listTablesResponse.TableNames || [];
    console.log(`[${new Date().toISOString()}] 📋 INIT: Found existing tables:`, existingTables);

    // Check and create each table if needed
    for (const tableName of tableNames) {
      const fullTableName = getTableName(tableName);
      
      if (existingTables.includes(fullTableName)) {
        console.log(`[${new Date().toISOString()}] ✅ INIT: Table ${fullTableName} already exists, skipping creation`);
        continue;
      }

      // Create table with id as the primary key
      const createTableCommand = new CreateTableCommand({
        TableName: fullTableName,
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      });

      try {
        await client.send(createTableCommand);
        console.log(`[${new Date().toISOString()}] ✅ INIT: Successfully created table ${fullTableName}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ INIT: Error creating table ${fullTableName}:`, error);
      }
    }

    console.log(`[${new Date().toISOString()}] 🎉 INIT: Database initialization completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ INIT: Error initializing database:`, error);
  }
}

// Run initialization
initializeTables();

export default initializeTables; 
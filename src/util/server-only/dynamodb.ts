// This file is server-only and not exposed to the client
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  DeleteCommand, 
  QueryCommand,
  ScanCommand, 
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';

// Server-side environment variables (not accessible to the client)
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'pantrypal';

// Validate required environment variables
if (!region || !accessKeyId || !secretAccessKey) {
  console.error(`[${new Date().toISOString()}] 🚨 DYNAMODB: Missing AWS credentials. Please check your .env.local file.`);
} else {
  console.log(`[${new Date().toISOString()}] 🔧 DYNAMODB: Config loaded. Region: ${region}, TablePrefix: ${tablePrefix}`);
}

// Create DynamoDB client
const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || ''
  }
});

// Create document client with native JavaScript object marshalling/unmarshalling
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
  },
});

console.log(`[${new Date().toISOString()}] 🔌 DYNAMODB: Client initialized and ready for operations`);

// Helper to get the full table name with prefix
const getTableName = (table: string) => `${tablePrefix}-${table}`;

// Exported functions for database operations

/**
 * Get an item from DynamoDB by its primary key
 */
export async function getItem<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
  const fullTableName = getTableName(tableName);
  console.log(`[${new Date().toISOString()}] 📥 DYNAMODB: Getting item from table "${fullTableName}" with key:`, key);
  
  try {
    const command = new GetCommand({
      TableName: fullTableName,
      Key: key,
    });
    
    const response = await docClient.send(command);
    
    if (response.Item) {
      console.log(`[${new Date().toISOString()}] ✅ DYNAMODB: Successfully retrieved item from "${fullTableName}"`);
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ DYNAMODB: Item not found in "${fullTableName}" with key:`, key);
    }
    
    return (response.Item as T) || null;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ DYNAMODB: Error fetching item from "${fullTableName}":`, error);
    throw error;
  }
}

/**
 * Create or update an item in DynamoDB
 */
export async function putItem(tableName: string, item: Record<string, any>): Promise<void> {
  const fullTableName = getTableName(tableName);
  console.log(`[${new Date().toISOString()}] 📤 DYNAMODB: Putting item into table "${fullTableName}":`, 
    item.id ? `ID: ${item.id}` : 'No ID provided');
  
  try {
    const command = new PutCommand({
      TableName: fullTableName,
      Item: item,
    });
    
    await docClient.send(command);
    console.log(`[${new Date().toISOString()}] ✅ DYNAMODB: Successfully put item into "${fullTableName}"`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ DYNAMODB: Error putting item in "${fullTableName}":`, error);
    throw error;
  }
}

/**
 * Delete an item from DynamoDB by its primary key
 */
export async function deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
  try {
    const command = new DeleteCommand({
      TableName: getTableName(tableName),
      Key: key,
    });
    
    await docClient.send(command);
  } catch (error) {
    console.error('Error deleting item from DynamoDB:', error);
    throw error;
  }
}

/**
 * Query items from DynamoDB
 */
export async function queryItems<T>(
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>,
  indexName?: string
): Promise<T[]> {
  try {
    const command = new QueryCommand({
      TableName: getTableName(tableName),
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      IndexName: indexName,
    });
    
    const response = await docClient.send(command);
    return (response.Items || []) as T[];
  } catch (error) {
    console.error('Error querying items from DynamoDB:', error);
    throw error;
  }
}

/**
 * Scan all items from a DynamoDB table
 */
export async function scanItems<T>(
  tableName: string,
  filterExpression?: string,
  expressionAttributeValues?: Record<string, any>,
  expressionAttributeNames?: Record<string, string>
): Promise<T[]> {
  try {
    const command = new ScanCommand({
      TableName: getTableName(tableName),
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
    });
    
    const response = await docClient.send(command);
    return (response.Items || []) as T[];
  } catch (error) {
    console.error('Error scanning items from DynamoDB:', error);
    throw error;
  }
}

/**
 * Update an item in DynamoDB
 */
export async function updateItem(
  tableName: string,
  key: Record<string, any>,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>
): Promise<void> {
  try {
    const command = new UpdateCommand({
      TableName: getTableName(tableName),
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'NONE',
    });
    
    await docClient.send(command);
  } catch (error) {
    console.error('Error updating item in DynamoDB:', error);
    throw error;
  }
}

export { docClient, client, getTableName }; 
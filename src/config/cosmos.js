import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

// Cosmos DB Configuration
const cosmosConfig = {
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
  databaseName: process.env.COSMOS_DATABASE_NAME || 'ecommerce-db2'
};

// Validate required environment variables
if (!cosmosConfig.endpoint || !cosmosConfig.key) {
  throw new Error('Missing required Cosmos DB environment variables: COSMOS_ENDPOINT and COSMOS_KEY');
}

// Initialize Cosmos Client
const cosmosClient = new CosmosClient({
  endpoint: cosmosConfig.endpoint,
  key: cosmosConfig.key
});

// Get database and containers
const database = cosmosClient.database(cosmosConfig.databaseName);

// Container configurations
const containers = {
  users: database.container('users'),
  products: database.container('products'),
  orders: database.container('orders'),
  categories: database.container('categories')
};

// Initialize database and containers if they don't exist
export async function initializeCosmosDB() {
  try {
    console.log('🔗 Connecting to Azure Cosmos DB...');
    
    // Create database if it doesn't exist with shared throughput
    const { database: db } = await cosmosClient.databases.createIfNotExists({
      id: cosmosConfig.databaseName,
      throughput: 1000 // Use all available RU/s at database level
    });
    console.log(`✅ Database '${cosmosConfig.databaseName}' ready`);

    // Create containers if they don't exist (will use shared throughput)
    const containerConfigs = [
      { id: 'users', partitionKey: '/email' },
      { id: 'products', partitionKey: '/id' },
      { id: 'orders', partitionKey: '/userId' },
      { id: 'categories', partitionKey: '/id' }
    ];

    for (const config of containerConfigs) {
      await db.containers.createIfNotExists({
        id: config.id,
        partitionKey: config.partitionKey
      });
      console.log(`✅ Container '${config.id}' ready`);
    }

    console.log('🎉 Cosmos DB initialization complete!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Cosmos DB:', error);
    throw error;
  }
}

// Export the containers for use in services
export { containers, cosmosClient, cosmosConfig }; 
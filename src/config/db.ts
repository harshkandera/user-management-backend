import mongoose from "mongoose";
import env from "./env";
import logger from "../utils/logger";

class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info("📦 Using existing database connection");
      return;
    }

    try {
      await mongoose.connect(env.MONGODB_URI);

      this.isConnected = true;
      logger.info("✅ MongoDB connected successfully");

      const connection = mongoose.connection;

      connection.on("error", (error: Error) => {
        logger.error("❌ MongoDB connection error:", error);
        this.isConnected = false;
      });

      connection.on("disconnected", () => {
        logger.warn("⚠️ MongoDB disconnected");
        this.isConnected = false;
      });

      connection.on("reconnected", () => {
        logger.info("🔄 MongoDB reconnected");
        this.isConnected = true;
      });
    } catch (error) {
      logger.error("❌ Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info("👋 MongoDB disconnected gracefully");
    } catch (error) {
      logger.error("❌ Error disconnecting from MongoDB:", error);
      throw error;
    }
  }

  public getConnection() {
    return mongoose.connection;
  }
}

export default Database.getInstance();

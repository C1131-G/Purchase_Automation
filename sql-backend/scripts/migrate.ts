import "reflect-metadata";

import { MigrationsDataSource } from "@/db/config/migrations-source";
import { logger } from "@/core/logger/pino-logger";

const args = process.argv.slice(2);
const command = args[0];

const run = async () => {
  try {
    await MigrationsDataSource.initialize();
    logger.info({
      database: MigrationsDataSource.options.database,
      msg: "Migration data source initialized",
    });

    if (command === "--run" || command === "run") {
      const pending = await MigrationsDataSource.showMigrations();
      if (!pending) {
        logger.info({ msg: "No pending migrations" });
        return;
      }

      const migrations = await MigrationsDataSource.runMigrations();
      for (const migration of migrations) {
        logger.info({
          name: migration.name,
          timestamp: new Date(migration.timestamp).toISOString(),
        });
      }
      logger.info({ count: migrations.length, msg: "Migrations complete" });
    } else if (command === "--revert" || command === "revert") {
      const migrationId = args[1];
      if (!migrationId) {
        logger.error({ msg: "Usage: migration:revert <migration_name>" });
        process.exit(1);
      }

      await MigrationsDataSource.undoLastMigration({ transaction: "each" });
      logger.info({ id: migrationId, msg: "Migration reverted" });
    } else if (command === "--show" || command === "show") {
      const all = await MigrationsDataSource.driver.migrationRepository.find();
      const pending = await MigrationsDataSource.showMigrations();

      for (const m of all) {
        logger.info({
          name: m.name,
          ran: m.timestamp !== null,
          timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : "unknown",
        });
      }
      logger.info({ msg: `Pending: ${pending}` });
    } else {
      logger.error({
        msg: `Unknown command: ${command}. Use --run, --revert <name>, or --show`,
      });
      process.exit(1);
    }
  } catch (err) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.fatal({
      error: caughtError.message,
      msg: "Migration runner failed",
    });
    process.exit(1);
  } finally {
    if (MigrationsDataSource.isInitialized) {
      await MigrationsDataSource.destroy();
    }
  }
};

run();

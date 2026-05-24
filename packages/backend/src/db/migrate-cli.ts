import { runMigrationsStandalone } from "./migrate.js";

runMigrationsStandalone()
  .then(() => {
     
    console.log("migrations applied");
    process.exit(0);
  })
  .catch((err) => {
     
    console.error("migration failed", err);
    process.exit(1);
  });

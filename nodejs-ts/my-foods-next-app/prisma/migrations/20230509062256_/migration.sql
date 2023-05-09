-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clothers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "img" BLOB,
    "price" INTEGER NOT NULL,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL
);
INSERT INTO "new_clothers" ("CreatedAt", "UpdatedAt", "id", "img", "name", "price") SELECT "CreatedAt", "UpdatedAt", "id", "img", "name", "price" FROM "clothers";
DROP TABLE "clothers";
ALTER TABLE "new_clothers" RENAME TO "clothers";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

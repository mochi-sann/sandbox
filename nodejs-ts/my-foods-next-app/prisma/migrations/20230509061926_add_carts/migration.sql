-- CreateTable
CREATE TABLE "clothers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "img" BLOB NOT NULL,
    "price" INTEGER NOT NULL,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "carts" (
    "cartId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clotherId" INTEGER NOT NULL,
    "CreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "carts_clotherId_fkey" FOREIGN KEY ("clotherId") REFERENCES "clothers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

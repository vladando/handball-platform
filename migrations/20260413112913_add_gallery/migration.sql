-- CreateTable
CREATE TABLE "player_gallery_images" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_gallery_images_playerId_idx" ON "player_gallery_images"("playerId");

-- AddForeignKey
ALTER TABLE "player_gallery_images" ADD CONSTRAINT "player_gallery_images_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

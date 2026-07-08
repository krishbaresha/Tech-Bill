-- AlterTable
ALTER TABLE "products" ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "compare_price" DECIMAL(10,2),
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "short_description" VARCHAR(500),
ADD COLUMN     "specifications" JSON,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

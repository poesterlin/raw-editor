CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image" DROP CONSTRAINT "image_stack_id_image_id_fk";
--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "stack_id_fkey" FOREIGN KEY ("stack_id") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE cascade;
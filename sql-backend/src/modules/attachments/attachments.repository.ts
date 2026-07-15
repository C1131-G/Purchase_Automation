import { eq } from "drizzle-orm";

import { attachments } from "@/db/schema/attachments";
import type { LooseDb, LooseValues } from "@/types/db.types";

export const attachmentsRepository = {
  async findList(db: LooseDb) {
    return db.select().from(attachments);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
    return row || null;
  },

  async insert(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(attachments).values(values).returning();
    return row;
  },

  async delete(db: LooseDb, id: number) {
    return db.delete(attachments).where(eq(attachments.id, id));
  },
};

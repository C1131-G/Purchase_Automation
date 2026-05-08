import { EntitySchema } from "typeorm";

export interface SQLUser {
  id: number;
  username: string;
  passwordHash: string;
  name: string;
  role?: string;
  cardCode?: string;
  cardName?: string;
  createdAt: Date;
}

export const UserSchema = new EntitySchema<SQLUser>({
  columns: {
    cardCode: {
      length: 50,
      name: "card_code",
      nullable: true,
      type: "nvarchar",
    },
    cardName: {
      length: 100,
      name: "card_name",
      nullable: true,
      type: "nvarchar",
    },
    createdAt: {
      default: () => "GETDATE()",
      name: "created_at",
      type: "datetime",
    },
    id: {
      generated: "identity",
      primary: true,
      type: "int",
    },
    name: {
      length: 100,
      name: "name",
      type: "nvarchar",
    },
    passwordHash: {
      length: 255,
      name: "password_hash",
      type: "nvarchar",
    },
    role: {
      length: 50,
      nullable: true,
      type: "nvarchar",
    },
    username: {
      length: 100,
      type: "nvarchar",
      unique: true,
    },
  },
  name: "User",
  tableName: "Users",
});
